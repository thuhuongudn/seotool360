# AI-Evaluable Tone of Voice Framework – Pharma/YMYL v2.0

Bộ khung đánh giá Tone of Voice cho lĩnh vực Dược phẩm và YMYL (Your Money Your Life), được thiết kế theo 4 trụ E-E-A-T, 10 tiêu chí định lượng, và 4 lỗi nghiêm trọng.

---

## 🧩 1. CẤU TRÚC CHUNG BỘ TIÊU CHÍ

| Tổng quan | Giá trị |
|-----------|---------|
| **Số tiêu chí đánh giá** | 10 tiêu chí (T1 - T10) |
| **Thang điểm mỗi tiêu chí** | 0-3 điểm |
| **Tổng điểm tối đa** | **30 điểm** (10 × 3) |
| **Ngưỡng PASS** | ≥ 24/30 điểm (80%) |
| **Ngưỡng NEED REVIEW** | 20-23/30 điểm (67-77%) |
| **Ngưỡng FAIL** | < 20/30 điểm (<67%) |
| **Lỗi nghiêm trọng** | 4 lỗi (E1-E4) - bất kỳ lỗi nào → tự động FAIL |

---

## ⚖️ 2. QUY TẮC CHUNG (áp dụng cho AI kiểm tra)

### 2.1 Logic đọc hiểu

- Không đếm từ, không đo độ dài
- Dựa trên ngữ nghĩa, cảm xúc và logic mô tả
- Xét toàn văn bản, không xét câu riêng lẻ
- Phát hiện pattern và context

### 2.2 Định nghĩa giọng điệu chuẩn

**"Chuyên môn – Trung tính – Đồng cảm – Có chứng cứ – Minh bạch"**

### 2.3 Nguyên tắc E-E-A-T

| Trụ cột | Ý nghĩa | Tiêu chí liên quan |
|---------|---------|-------------------|
| **Experience** | Kinh nghiệm thực tế | T6, T9 |
| **Expertise** | Chuyên môn | T2, T5, T6 |
| **Authoritativeness** | Uy tín | T5, T6 |
| **Trustworthiness** | Đáng tin cậy | T1, T4, T7, T10 |

---

## 🧠 3. 10 TIÊU CHÍ CHI TIẾT (mỗi tiêu chí 0-3 điểm)

### T1: Giọng điệu trung tính (0-3 điểm)

**Mục tiêu:** Không tuyệt đối hóa, không cảm xúc cực đoan

**Logic kiểm tra:**
- ✅ **Điểm 3:** Hoàn toàn trung tính, không vi phạm
- ✅ **Điểm 2:** Có 1-2 cảnh báo nhẹ nhưng có ngữ cảnh bù đắp
- ⚠️ **Điểm 1:** Có 1-2 vi phạm rõ ràng
- ❌ **Điểm 0:** Nhiều vi phạm nghiêm trọng

**VI PHẠM:**
- "Chữa khỏi hoàn toàn", "hiệu quả 100%"
- "An toàn tuyệt đối", "an toàn cho mọi người"
- "Không có tác dụng phụ"

**ĐƯỢC PHÉP:**
- "An toàn cho [đối tượng cụ thể]" + có ngữ cảnh
- VD: "An toàn cho trẻ em từ 6 tháng tuổi" (nếu không chống chỉ định)

---

### T2: Ngôn ngữ chuyên môn rõ ràng (0-3 điểm)

**Mục tiêu:** Có thuật ngữ y học được giải thích

**Thang điểm:**
- **3 điểm:** ≥ 2 thuật ngữ có giải thích rõ ràng
- **2 điểm:** 1 thuật ngữ có giải thích
- **1 điểm:** Có thuật ngữ nhưng không giải thích
- **0 điểm:** Không có thuật ngữ hoặc sai chuyên môn

**Ví dụ đạt 3 điểm:**
> "Magnesium bisglycinate (dạng muối dễ hấp thu) giúp cải thiện giấc ngủ"

---

### T3: Tránh phóng đại cảm xúc (0-3 điểm)

**Mục tiêu:** Không sử dụng ngôn ngữ cảm xúc mạnh

**Từ khóa vi phạm:**
- "Tuyệt vời", "thần kỳ", "đáng kinh ngạc"
- "Phi thường", "hoàn hảo", "siêu việt"

**Thang điểm:**
- **3 điểm:** Không có cụm cảm xúc mạnh
- **2 điểm:** 1 cụm
- **1 điểm:** 2 cụm
- **0 điểm:** ≥ 3 cụm

---

### T4: Cân bằng lợi ích/rủi ro (Fair Balance) (0-3 điểm)

**Mục tiêu:** Khi có claim lợi ích → phải có cảnh báo rủi ro

**Pattern cần phát hiện:**
- [Positive claim] ↔ [Caution phrase]
- "Giúp giảm đau" → "Cần hỏi bác sĩ"
- "Tăng cường miễn dịch" → "Không dùng cho trẻ dưới 2 tuổi"

**Thang điểm:**
- **3 điểm:** Mọi claim đều có cảnh báo kèm theo
- **2 điểm:** Đa số claim có cảnh báo
- **1 điểm:** Ít claim có cảnh báo
- **0 điểm:** Không có cảnh báo nào

---

### T5: Trích dẫn chứng cứ (0-3 điểm)

**Mục tiêu:** Có nguồn khoa học đáng tin cậy

**Pattern tìm kiếm:**
- "Theo nghiên cứu...", "Một thử nghiệm..."
- DOI, PubMed link, URL nguồn
- Tên tác giả + năm (Smith et al., 2020)

**Thang điểm:**
- **3 điểm:** ≥ 2 nguồn trích dẫn rõ ràng
- **2 điểm:** 1 nguồn trích dẫn
- **1 điểm:** Có nhắc nguồn nhưng mơ hồ
- **0 điểm:** Không có nguồn

---

### T6: Tác giả/Duyệt chuyên môn (0-3 điểm)

**Mục tiêu:** Có thông tin người viết/duyệt

**Pattern tìm kiếm:**
- "Bác sĩ [Tên]", "Dược sĩ [Tên]"
- "Duyệt bởi...", "Tư vấn bởi..."
- Tên + chức danh chuyên môn

**Thang điểm:**
- **3 điểm:** Có tên + chức danh đầy đủ
- **2 điểm:** Có chức danh nhưng thiếu tên
- **1 điểm:** Chỉ nhắc chung chung
- **0 điểm:** Không có thông tin

---

### T7: Minh bạch thương mại (0-3 điểm)

**Mục tiêu:** Có disclaimer về affiliate/tư vấn

**Pattern tìm kiếm:**
- "Bài viết có thể chứa liên kết tiếp thị"
- "Không thay thế tư vấn y khoa"
- "Affiliate disclaimer"

**⚠️ LƯU Ý:**
- Tiêu chí này **KHÔNG** làm tự động FAIL (vì nội dung thương mại/e-commerce)
- Vẫn đánh giá và cho điểm bình thường

**Thang điểm:**
- **3 điểm:** Có disclaimer rõ ràng
- **2 điểm:** Có nhưng chưa rõ
- **1 điểm:** Nhắc mơ hồ
- **0 điểm:** Không có

---

### T8: Cấu trúc dễ hiểu (Plain Language) (0-3 điểm)

**Mục tiêu:** Câu văn rõ ràng, dễ đọc

**Đánh giá:**
- % câu chủ động vs. bị động
- Độ dài câu trung bình
- Có tiêu đề phụ rõ ràng

**Thang điểm:**
- **3 điểm:** ≥ 70% câu chủ động, cấu trúc rõ ràng
- **2 điểm:** 50-69% câu chủ động
- **1 điểm:** 30-49% câu chủ động
- **0 điểm:** < 30% câu chủ động hoặc rối rắm

---

### T9: Ngôn ngữ đồng cảm (0-3 điểm)

**Mục tiêu:** Có yếu tố hướng dẫn, hỗ trợ

**Pattern tìm kiếm:**
- "Nếu bạn...", "Hãy..."
- "Tham khảo bác sĩ", "Nên trao đổi với chuyên gia"
- Tone hướng dẫn, quan tâm

**Thang điểm:**
- **3 điểm:** ≥ 3 cụm đồng cảm
- **2 điểm:** 2 cụm
- **1 điểm:** 1 cụm
- **0 điểm:** Không có

---

### T10: Độ mới của nguồn trích dẫn (0-3 điểm)

**Mục tiêu:** Nguồn nghiên cứu có năm xuất bản

**⚠️ LƯU Ý QUAN TRỌNG:**
- **Chỉ đánh giá năm trong trích dẫn/tài liệu tham khảo**
- **KHÔNG** đánh giá ngày cập nhật bài viết (nằm trong schema/metadata)

**Ví dụ HỢP LỆ:**
- "Theo nghiên cứu năm 2023..."
- "(Smith et al., 2020)"
- "[1] Nguyen, T. (2022). Journal of Medicine"

**Thang điểm:**
- **3 điểm:** Có năm xuất bản rõ ràng
- **2 điểm:** Có năm nhưng không rõ nguồn
- **1 điểm:** Nhắc mơ hồ về thời gian
- **0 điểm:** Không có thông tin thời gian

---

## 🚫 4. BỐN LỖI NGHIÊM TRỌNG (Critical Errors)

**Bất kỳ lỗi nào xuất hiện → Tự động FAIL (bất kể điểm số)**

### E1: Claim điều trị/chữa khỏi không chứng cứ

**Ví dụ vi phạm:**
- "Chữa khỏi hoàn toàn ung thư"
- "Điều trị dứt điểm bệnh tiểu đường"
- "Ngăn ngừa COVID-19" (không có nguồn)

### E2: So sánh cạnh tranh không nguồn

**Ví dụ vi phạm:**
- "Tốt hơn Vitamin X"
- "Hiệu quả gấp đôi sản phẩm Y"
- "Vượt trội so với thương hiệu Z"

### E3: Thiếu khuyến cáo an toàn khi cần

**Áp dụng khi:**
- Thu��c/TPCN có tác dụng mạnh
- Có thể gây tác dụng phụ
- Cần giám sát y khoa

**Vi phạm:** Không có cụm "tham khảo bác sĩ", "không dùng cho...", "cẩn thận khi..."

### E4: Claim an toàn tuyệt đối không ngữ cảnh

**Ví dụ vi phạm:**
- "An toàn tuyệt đối"
- "An toàn cho mọi người"
- "Hoàn toàn không có tác dụng phụ"

**✅ KHÔNG vi phạm:**
- "An toàn cho trẻ em từ 6 tháng tuổi" (có đối tượng cụ thể)
- "An toàn cho phụ nữ mang thai theo FDA" (có nguồn)

---

## 🧮 5. QUY TRÌNH CHẤM ĐIỂM

```
INPUT: Văn bản nội dung dược phẩm/y tế

PROCESS:
  1. Chuẩn hóa text (lowercase, loại ký tự đặc biệt)
  2. Phát hiện pattern cho từng tiêu chí T1-T10
  3. Gán điểm 0-3 cho mỗi tiêu chí
  4. Kiểm tra lỗi nghiêm trọng E1-E4
  5. Tính tổng điểm = Σ(T1 + T2 + ... + T10)
  6. Xác định verdict:
     - Nếu có E1-E4 → FAIL (bất kể điểm)
     - < 20 điểm → FAIL
     - 20-23 điểm → NEED REVIEW
     - ≥ 24 điểm → PASS

OUTPUT:
  - total_score (0-30)
  - verdict (FAIL | NEED REVIEW | PASS)
  - Chi tiết từng tiêu chí với issues cụ thể
  - Danh sách lỗi nghiêm trọng (nếu có)
```

---

## 📘 6. MẪU OUTPUT JSON

```json
{
  "total_score": 27,
  "verdict": "PASS",
  "criteria": {
    "T1_neutral_tone": {
      "score": 3,
      "issues": []
    },
    "T2_medical_clarity": {
      "score": 3,
      "issues": []
    },
    "T3_no_exaggeration": {
      "score": 3,
      "issues": []
    },
    "T4_fair_balance": {
      "score": 3,
      "issues": []
    },
    "T5_evidence_citation": {
      "score": 2,
      "issues": [
        {
          "text": "Giúp tăng cường miễn dịch",
          "reason": "Thiếu nguồn trích dẫn khoa học",
          "suggestion": "Thêm nguồn: 'Theo nghiên cứu của [tác giả], năm [năm]...'"
        }
      ]
    },
    "T6_expert_author": {
      "score": 3,
      "issues": []
    },
    "T7_disclaimer_transparency": {
      "score": 3,
      "issues": []
    },
    "T8_plain_structure": {
      "score": 3,
      "issues": []
    },
    "T9_empathy_language": {
      "score": 3,
      "issues": []
    },
    "T10_source_freshness": {
      "score": 2,
      "issues": [
        {
          "text": "Nghiên cứu gần đây cho thấy...",
          "reason": "Không có năm xuất bản cụ thể",
          "suggestion": "Bổ sung: 'Nghiên cứu năm 2023 cho thấy...'"
        }
      ]
    }
  },
  "errors": [],
  "explanation": "Nội dung đạt chuẩn YMYL với 27/30 điểm. Giọng điệu chuyên nghiệp, có chứng cứ, minh bạch. Cần bổ sung năm xuất bản cho các trích dẫn.",
  "recommendations": [
    "Bổ sung năm xuất bản cho các nghiên cứu được trích dẫn",
    "Thêm nguồn khoa học cho các claim về tác dụng"
  ]
}
```

---

## 📝 7. VÍ DỤ CỤ THỂ VỀ CLAIM "AN TOÀN"

### ✅ HỢP LỆ (Không vi phạm T1 & E4):

1. **"An toàn cho trẻ em từ 6 tháng tuổi"**
   - Có đối tượng cụ thể
   - Có độ tuổi rõ ràng
   - Giả định: sản phẩm có chỉ định cho trẻ em

2. **"An toàn cho phụ nữ cho con bú"**
   - Có đối tượng cụ thể
   - Giả định: không chống chỉ định/cảnh báo

3. **"An toàn cho trẻ sơ sinh khi dùng đúng liều lượng"**
   - Có đối tượng + điều kiện
   - Có hướng dẫn sử dụng

4. **"Được FDA công nhận an toàn cho người lớn khỏe mạnh"**
   - Có nguồn ủy quyền (FDA)
   - Có ngữ cảnh (người lớn khỏe mạnh)
   - Có tính điều kiện ("được công nhận")

### ❌ VI PHẠM (Vi phạm T1 & E4):

1. **"Hoàn toàn an toàn"** / **"An toàn tuyệt đối"**
   - Tuyệt đối hóa
   - Không có ngữ cảnh

2. **"An toàn cho mọi người"** / **"An toàn cho tất cả"**
   - Quá rộng
   - Không có đối tượng cụ thể

3. **"Không có tác dụng phụ"** / **"Không có nguy cơ"**
   - Tuyệt đối hóa rủi ro
   - Không khoa học

4. **"100% an toàn"**
   - Con số tuyệt đối
   - Không có điều kiện

### 🔄 CẦN NGỮ CẢNH BỔ SUNG:

1. **"An toàn khi sử dụng đúng cách"**
   - ⚠️ Cần: đối tượng cụ thể
   - ✅ Tốt hơn: "An toàn cho người lớn khi sử dụng đúng cách"

2. **"Sản phẩm an toàn"**
   - ⚠️ Cần: cho ai?
   - ✅ Tốt hơn: "Sản phẩm an toàn cho trẻ trên 2 tuổi"

---

## ✅ 8. CHECKLIST NHANH CHO BIÊN TẬP VIÊN

Trước khi xuất bản, kiểm tra:

| # | Câu hỏi | Điểm |
|---|---------|------|
| 1 | Có dùng ngôn ngữ trung tính, không tuyệt đối? | T1 (0-3) |
| 2 | Có giải thích thuật ngữ y học? | T2 (0-3) |
| 3 | Tránh ngôn ngữ phóng đại? | T3 (0-3) |
| 4 | Cân bằng lợi ích và rủi ro? | T4 (0-3) |
| 5 | Có trích dẫn chứng cứ khoa học? | T5 (0-3) |
| 6 | Có tác giả/duyệt chuyên môn? | T6 (0-3) |
| 7 | Có disclaimer về thương mại/tư vấn? | T7 (0-3) |
| 8 | Cấu trúc rõ ràng, dễ hiểu? | T8 (0-3) |
| 9 | Có giọng điệu đồng cảm? | T9 (0-3) |
| 10 | Nguồn có năm xuất bản? | T10 (0-3) |
| **TỔNG** | **Tổng điểm** | **/30** |

**Ngưỡng:**
- ✅ **≥ 24/30 (80%):** PASS - Xuất bản
- ⚠️ **20-23/30 (67-77%):** NEED REVIEW - Cần sửa
- ❌ **< 20/30 (<67%):** FAIL - Viết lại

**Lỗi nghiêm trọng (bất kỳ lỗi nào → FAIL):**
- [ ] E1: Claim điều trị không chứng cứ?
- [ ] E2: So sánh cạnh tranh không nguồn?
- [ ] E3: Thiếu khuyến cáo an toàn?
- [ ] E4: Claim an toàn tuyệt đối?

---

## 🎯 9. HƯỚNG DẪN SỬ DỤNG

### 9.1 Cho AI/Hệ thống tự động

1. Parse văn bản input
2. Chạy 10 module kiểm tra song song (T1-T10)
3. Kiểm tra 4 lỗi nghiêm trọng (E1-E4)
4. Tính tổng điểm và verdict
5. Trả về JSON với chi tiết lỗi

### 9.2 Cho Biên tập viên

1. Viết nội dung
2. Tự kiểm tra theo checklist
3. Chạy AI checker
4. Sửa theo suggestions
5. Đạt ≥ 24/30 → xuất bản

### 9.3 Cho QC/Editor

1. Review output từ AI
2. Kiểm tra false positive/negative
3. Đánh giá ngữ cảnh cụ thể
4. Approve hoặc yêu cầu sửa

---

## 📊 10. THỐNG KÊ VÀ PHÂN TÍCH

### Phân bố điểm lý tưởng:

| Tiêu chí | Điểm mục tiêu | Mức ưu tiên |
|----------|---------------|-------------|
| T1 - Giọng điệu trung tính | 3 | Bắt buộc ⭐⭐⭐ |
| T2 - Ngôn ngữ chuyên môn | 2-3 | Cao ⭐⭐ |
| T3 - Tránh phóng đại | 3 | Bắt buộc ⭐⭐⭐ |
| T4 - Cân bằng lợi ích/rủi ro | 3 | Bắt buộc ⭐⭐⭐ |
| T5 - Trích dẫn chứng cứ | 2-3 | Cao ⭐⭐ |
| T6 - Tác giả/duyệt | 2-3 | Cao ⭐⭐ |
| T7 - Minh bạch thương mại | 2-3 | Trung bình ⭐ |
| T8 - Cấu trúc dễ hiểu | 2-3 | Cao ⭐⭐ |
| T9 - Ngôn ngữ đồng cảm | 2-3 | Trung bình ⭐ |
| T10 - Độ mới nguồn | 2-3 | Cao ⭐⭐ |
| **Tổng mục tiêu** | **≥ 24/30** | |

### Các tiêu chí bắt buộc đạt 3 điểm:
- ⭐⭐⭐ T1: Giọng điệu trung tính
- ⭐⭐⭐ T3: Tránh phóng đại
- ⭐⭐⭐ T4: Cân bằng lợi ích/rủi ro

---

## 🔧 11. GHI CHÚ KỸ THUẬT

### 11.1 Pattern Recognition

Mỗi tiêu chí sử dụng kết hợp:
- **Regex:** Tìm keyword cụ thể
- **NLP:** Phân tích ngữ nghĩa
- **Context analysis:** Xét ngữ cảnh xung quanh

### 11.2 Scoring Logic

```python
# Pseudo-code
def calculate_score(criteria_results):
    total = 0
    for criterion in criteria_results:
        score = min(3, max(0, criterion.score))  # Normalize 0-3
        total += score
    return total  # Max 30

def get_verdict(total_score, has_critical_error):
    if has_critical_error:
        return "FAIL"
    if total_score >= 24:
        return "PASS"
    if total_score >= 20:
        return "NEED REVIEW"
    return "FAIL"
```

### 11.3 Tỷ lệ phần trăm

- **PASS:** ≥ 80% (24/30)
- **NEED REVIEW:** 67-77% (20-23/30)
- **FAIL:** < 67% (<20/30)

---

## 📚 12. TÀI LIỆU THAM KHẢO

- Google E-E-A-T Guidelines
- FDA Medical Content Standards
- YMYL Content Best Practices
- Vietnam Pharmaceutical Advertising Law

---

## 🔄 13. LỊCH SỬ PHIÊN BẢN

### v2.0 (2025-10-08)
- ✅ **CẬP NHẬT QUAN TRỌNG:** Tổng điểm từ 15 → **30 điểm** (10 tiêu chí × 3 điểm)
- ✅ Điều chỉnh ngưỡng PASS: ≥ 24/30 (80%)
- ✅ Điều chỉnh ngưỡng NEED REVIEW: 20-23/30 (67-77%)
- ✅ Điều chỉnh ngưỡng FAIL: < 20/30 (<67%)
- ✅ Làm rõ logic "an toàn cho đối tượng cụ thể"
- ✅ Xóa E4 cũ (affiliate), thêm E4 mới (claim an toàn tuyệt đối)
- ✅ Làm rõ T10 chỉ đánh giá năm trích dẫn, không đánh giá ngày cập nhật bài
- ✅ Thêm mức ưu tiên cho từng tiêu chí

### v2.0 (2025-10-07)
- Phiên bản đầu tiên
- 10 tiêu chí cơ bản
- Tổng điểm sai: 15 điểm (đã sửa thành 30)

---

## 📞 14. HỖ TRỢ

Nếu có thắc mắc về tiêu chí đánh giá:
1. Tham khảo file: [/client/src/lib/tone-of-voice-prompts.ts](../client/src/lib/tone-of-voice-prompts.ts)
2. Xem ví dụ cụ thể trong phần 7
3. Kiểm tra logic scoring trong phần 11
4. Liên hệ team AI/Content

---

**Bộ tiêu chí này được thiết kế để AI có thể tự động đánh giá một cách khách quan, đồng thời đủ rõ ràng để biên tập viên tự kiểm tra. Tổng điểm tối đa: 30 điểm (10 tiêu chí × 3 điểm/tiêu chí).**
