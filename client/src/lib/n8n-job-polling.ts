/**
 * N8N Job Polling Utility
 * Shared polling logic for async N8N webhook jobs
 */

import supabase from "@/lib/supabase";

export interface N8NJobResponse {
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  duration?: number;
}

export interface PollOptions {
  onProgress?: (duration: number) => void;
  onComplete: (result: any, duration: number) => void;
  onError: (error: string) => void;
  pollInterval?: number; // milliseconds, default 3000
  maxDuration?: number; // milliseconds, default 5 minutes
}

/**
 * Poll N8N job status until completed or failed
 * @param jobId - Job ID returned from N8N webhook start
 * @param options - Polling callbacks and configuration
 * @returns Cleanup function to stop polling
 */
export function pollN8NJobStatus(jobId: string, options: PollOptions): () => void {
  const {
    onProgress,
    onComplete,
    onError,
    pollInterval = 3000,
    maxDuration = 5 * 60 * 1000 // 5 minutes
  } = options;

  let intervalId: NodeJS.Timeout | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  let isStopped = false;

  const cleanup = () => {
    isStopped = true;
    if (intervalId) clearInterval(intervalId);
    if (timeoutId) clearTimeout(timeoutId);
  };

  const poll = async () => {
    if (isStopped) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        cleanup();
        onError("Authentication required");
        return;
      }

      const response = await fetch(`/api/job-status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.status}`);
      }

      const jobStatus: N8NJobResponse = await response.json();

      // Call progress callback if provided
      if (onProgress && jobStatus.duration) {
        onProgress(jobStatus.duration);
      }

      if (jobStatus.status === 'completed') {
        cleanup();
        onComplete(jobStatus.result, jobStatus.duration || 0);
      } else if (jobStatus.status === 'failed') {
        cleanup();
        onError(jobStatus.error || 'Job failed');
      }
      // If 'processing', keep polling

    } catch (error: any) {
      console.error("Polling error:", error);
      cleanup();
      onError(error.message || "Failed to check job status");
    }
  };

  // Start polling
  intervalId = setInterval(poll, pollInterval);

  // Set max duration timeout
  timeoutId = setTimeout(() => {
    cleanup();
    onError("Job timed out after " + Math.round(maxDuration / 1000) + " seconds");
  }, maxDuration);

  // Return cleanup function
  return cleanup;
}
