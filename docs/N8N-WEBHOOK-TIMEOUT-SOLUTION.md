# N8N Webhook Timeout Solution (503 Error on Heroku)

## Problem Description

**Symptom:** Function "Xây dựng chiến lược nội dung cho từ khóa" ở search-intent.tsx:
- ✅ Works on local (localhost:5000)
- ❌ Returns 503 Service Unavailable on Heroku production
- N8N webhook DOES complete and return response, but Heroku kills the connection

## Root Cause: Heroku Request Timeout

### Heroku Platform Limits:
- **Default HTTP Request Timeout: 30 seconds**
- If any request takes >30s, Heroku router returns **H12 error (503 Service Unavailable)**
- This happens EVEN IF the backend is still processing and will return a response

### N8N Workflow Timing:
- "seo-tool-360-search-intent-2025-09-26" webhook calls LLM to generate content strategy
- Typical execution time: **30-60 seconds**
- This exceeds Heroku's 30s limit → 503 error

## Architecture Flow

```
Client (Browser)
  ↓ POST /api/proxy/n8n/search-intent
Heroku Router (30s timeout) ⏰
  ↓
Backend Proxy (90s timeout) ⏰
  ↓ fetch() with AbortController
N8N Webhook (30-60s processing) 🐌
  ↓ LLM generates content
Response ✅
  ↑
Backend receives response ✅
  ↑
Heroku Router: TOO LATE! ❌ (>30s) → 503 H12
  ↑
Client receives 503 ❌
```

## Solution Options

### Option 1: ✅ **Async Webhook Pattern (Recommended)**

**How it works:**
1. Client calls backend → Backend immediately returns 202 Accepted with `job_id`
2. Backend calls N8N webhook asynchronously (no waiting)
3. N8N webhook POSTs result to a callback endpoint `/api/webhook-callback/:job_id`
4. Client polls `/api/job-status/:job_id` every 2-3s to check if complete
5. When complete, client fetches result

**Pros:**
- ✅ No timeout issues
- ✅ Works with any webhook duration
- ✅ Better UX (can show progress)
- ✅ Scalable

**Cons:**
- ⚠️ Requires N8N workflow modification (add HTTP callback node)
- ⚠️ Need to implement job queue/status tracking
- ⚠️ More complex implementation

**Implementation:**

```typescript
// Backend: Start job
app.post("/api/proxy/n8n/search-intent", authMiddleware, async (req, res) => {
  const jobId = uuidv4();
  const { keyword, branch_id } = req.body;

  // Store job status in Redis/Database
  await redis.set(`job:${jobId}`, JSON.stringify({
    status: 'pending',
    keyword,
    created_at: Date.now()
  }), 'EX', 600); // 10 min expiry

  // Call N8N webhook with callback URL (async, don't await)
  fetch("https://n8n.nhathuocvietnhat.vn/webhook/seo-tool-360-search-intent-2025-09-26", {
    method: "POST",
    headers: { "x-api-key": N8N_API_KEY },
    body: JSON.stringify({
      keyword,
      branch_id,
      callback_url: `https://seotool360.herokuapp.com/api/webhook-callback/${jobId}`
    })
  }).catch(err => console.error("N8N webhook error:", err));

  // Immediately return job ID to client
  return res.status(202).json({ job_id: jobId, status: 'pending' });
});

// Backend: Callback endpoint (N8N posts result here)
app.post("/api/webhook-callback/:job_id", async (req, res) => {
  const { job_id } = req.params;
  const result = req.body;

  await redis.set(`job:${job_id}`, JSON.stringify({
    status: 'completed',
    result,
    completed_at: Date.now()
  }), 'EX', 600);

  res.json({ success: true });
});

// Backend: Status polling endpoint
app.get("/api/job-status/:job_id", authMiddleware, async (req, res) => {
  const { job_id } = req.params;
  const jobData = await redis.get(`job:${job_id}`);

  if (!jobData) {
    return res.status(404).json({ message: "Job not found" });
  }

  res.json(JSON.parse(jobData));
});
```

```typescript
// Client: Poll for results
const response = await fetch('/api/proxy/n8n/search-intent', {
  method: 'POST',
  body: JSON.stringify({ keyword, branch_id })
});

const { job_id } = await response.json();

// Poll every 3 seconds
const pollInterval = setInterval(async () => {
  const statusRes = await fetch(`/api/job-status/${job_id}`);
  const status = await statusRes.json();

  if (status.status === 'completed') {
    clearInterval(pollInterval);
    setContentStrategy(status.result.output);
  } else if (status.status === 'failed') {
    clearInterval(pollInterval);
    toast({ title: "Error", description: status.error });
  }
}, 3000);
```

### Option 2: ⚠️ **Server-Sent Events (SSE) / WebSocket**

Stream progress updates to client in real-time.

**Pros:**
- ✅ Real-time progress updates
- ✅ Better UX

**Cons:**
- ❌ Complex implementation
- ❌ Requires N8N to support streaming (unlikely)

### Option 3: ❌ **Increase Heroku Timeout (Not Possible)**

Heroku 30s timeout is **hardcoded and cannot be changed** on standard dynos.

### Option 4: ⚠️ **Split Webhook into Faster Chunks**

Modify N8N workflow to return partial results faster.

**Pros:**
- ✅ Simple if N8N can be modified

**Cons:**
- ❌ May not be possible depending on LLM processing
- ❌ Reduces content quality

### Option 5: ✅ **Quick Win: Return Immediately + Background Processing (Simplified Async)**

Similar to Option 1 but simpler - no callback, just polling.

**Implementation (Minimal Changes):**

```typescript
// Backend: Store job in memory (or Redis for production)
const jobStore = new Map<string, any>();

app.post("/api/proxy/n8n/search-intent", authMiddleware, async (req, res) => {
  const jobId = uuidv4();
  const { keyword, branch_id } = req.body;

  // Store initial job status
  jobStore.set(jobId, { status: 'processing', keyword, startedAt: Date.now() });

  // Process in background (don't await)
  processN8NWebhook(jobId, keyword, branch_id).catch(error => {
    jobStore.set(jobId, { status: 'failed', error: error.message });
  });

  // Return immediately
  return res.status(202).json({ job_id: jobId, status: 'processing' });
});

async function processN8NWebhook(jobId: string, keyword: string, branch_id: number) {
  try {
    const response = await fetch(
      "https://n8n.nhathuocvietnhat.vn/webhook/seo-tool-360-search-intent-2025-09-26",
      {
        method: "POST",
        headers: { "x-api-key": N8N_API_KEY },
        body: JSON.stringify({ keyword, branch_id }),
      }
    );

    const data = await response.json();
    jobStore.set(jobId, {
      status: 'completed',
      result: data,
      completedAt: Date.now()
    });
  } catch (error) {
    jobStore.set(jobId, {
      status: 'failed',
      error: error.message
    });
  }
}

app.get("/api/job-status/:job_id", authMiddleware, async (req, res) => {
  const job = jobStore.get(req.params.job_id);
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }
  res.json(job);
});
```

```typescript
// Client: Minimal changes
const startResponse = await fetch('/api/proxy/n8n/search-intent', {
  method: 'POST',
  body: JSON.stringify({ keyword, branch_id })
});

const { job_id } = await startResponse.json();

// Show loading state
setIsGeneratingStrategy(true);

// Poll every 3 seconds
const pollInterval = setInterval(async () => {
  const statusRes = await fetch(`/api/job-status/${job_id}`);
  const job = await statusRes.json();

  if (job.status === 'completed') {
    clearInterval(pollInterval);
    setContentStrategy(job.result.output);
    setIsGeneratingStrategy(false);
  } else if (job.status === 'failed') {
    clearInterval(pollInterval);
    toast({ title: "Error", description: job.error });
    setIsGeneratingStrategy(false);
  }
}, 3000);

// Cleanup on unmount
return () => clearInterval(pollInterval);
```

## Recommended Solution: Option 5 (Simplified Async)

**Why:**
- ✅ Minimal code changes
- ✅ No N8N workflow modification needed
- ✅ No external dependencies (Redis) - use in-memory Map
- ✅ Solves 503 timeout issue completely
- ✅ Works on Heroku without any config changes

**Trade-offs:**
- ⚠️ In-memory storage lost on dyno restart (use Redis in production for persistence)
- ⚠️ Slightly more complex client polling logic

## Implementation Steps

1. ✅ Add timeout + logging to N8N proxy (already done)
2. ✅ Create job queue system (in-memory Map or Redis)
3. ✅ Implement `/api/job-status/:job_id` endpoint
4. ✅ Update client to use polling pattern
5. ✅ Test on Heroku production

## Alternative: Keep Simple Proxy (Not Recommended)

If you want to keep current simple proxy without async:

**Only works if N8N can respond <30s:**
- Optimize N8N workflow to be faster
- Use faster LLM model (GPT-4o-mini instead of GPT-4)
- Reduce prompt complexity
- Cache common keywords

## References

- [Heroku Request Timeout](https://devcenter.heroku.com/articles/request-timeout)
- [Heroku H12 Error](https://devcenter.heroku.com/articles/error-codes#h12-request-timeout)
- [Long-Running Tasks on Heroku](https://devcenter.heroku.com/articles/background-jobs-queueing)
