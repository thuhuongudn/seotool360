# AI-Evaluable Tone of Voice Framework – Pharma/YMYL v1.0

Bộ khung đánh giá Tone of Voice cho lĩnh vực Dược phẩm và YMYL (Your Money Your Life), được thiết kế theo 4 trụ E-E-A-T, 3 lớp ngữ điệu, 5 lỗi cấm, và 10 tiêu chí định lượng.

## 🧩 1. CẤU TRÚC CHUNG BỘ TIÊU CHÍ

| Mục | Nhóm | Mục tiêu | Kiểu đánh giá | Thang điểm |
|-----|------|----------|---------------|------------|
| TOV-A | Giọng điệu & ngôn ngữ | Kiểm tra sắc thái, mức độ chuyên môn, cảm xúc | Ngôn ngữ học (semantic/polarity/rule) | 0-3 |
| TOV-B | Tính chính xác & khách quan | Kiểm tra lời hứa, tính trung lập | Rule-based (keyword & pattern) | 0-3 |
| TOV-C | Tính minh bạch & E-E-A-T | Kiểm tra nguồn, người duyệt, disclaimers | Logic Boolean (presence/absence) | 0-3 |
| TOV-D | Plain language & rõ ràng | Kiểm tra khả năng hiểu, độ phức tạp cú pháp | Heuristic (sentence type) | 0-3 |
| TOV-E | Đạo đức & "Fair balance" | Kiểm tra cân bằng lợi ích/rủi ro | Context rule | 0-3 |

**Điểm tối đa:** 15
**Ngưỡng đạt:** ≥ 12 điểm mới được "xuất bản công khai"
**Ngưỡng cảnh báo:** < 10 → trả lại biên tập

## ⚖️ 2. QUY TẮC CHUNG (áp dụng cho AI kiểm tra)

### 2.1 Logic đọc hiểu

- Không đếm từ, không đo độ dài
- Dựa trên ngữ nghĩa, cảm xúc và logic mô tả
- Xét toàn văn bản, không xét câu riêng lẻ

### 2.2 Định nghĩa giọng điệu chuẩn

"Chuyên môn – Trung tính – Đồng cảm – Có chứng cứ – Minh bạch"

### 2.3 Ba lớp kiểm tra ngữ điệu

| Lớp | Đặc trưng | AI cần phát hiện |
|-----|-----------|------------------|
| L1 – Chuyên môn | Từ vựng y học chính xác, có giải thích, tránh slang | Có ≥ 1 thuật ngữ y học + định nghĩa hoặc chú thích trong văn bản |
| L2 – Trung tính | Không tuyệt đối hóa, không cảm xúc cực đoan | Không xuất hiện pattern khẳng định 100% hoặc cảm xúc mạnh |
| L3 – Đồng cảm | Có yếu tố hướng dẫn, khuyến cáo, hoặc "hỏi bác sĩ" | Có từ khóa gợi khuyên, ví dụ: "nếu", "nên hỏi", "tham khảo bác sĩ" |

## 🧠 3. 10 TIÊU CHÍ CHI TIẾT (AI có thể kiểm tra được)

| Mã | Tên tiêu chí | Mô tả logic kiểm tra | Tín hiệu đạt (AI nên tìm) | Điểm |
|----|--------------|---------------------|---------------------------|------|
| T1 | Giọng điệu trung tính | Không xuất hiện từ tuyệt đối hóa MÀ KHÔNG CÓ NGỮ CẢNH. VI PHẠM: "chữa khỏi hoàn toàn", "an toàn tuyệt đối", "an toàn cho mọi người". ĐƯỢC PHÉP: "an toàn cho [đối tượng cụ thể]" khi sản phẩm không có chống chỉ định/cảnh báo và nằm trong chỉ định | 0 = nhiều vi phạm nghiêm trọng; 1 = 1–2 vi phạm; 2 = cảnh báo nhẹ có ngữ cảnh; 3 = không vi phạm hoặc có đủ ngữ cảnh | 0-3 |
| T2 | Ngôn ngữ chuyên môn rõ ràng | Có ≥ 1 thuật ngữ y học được giải thích ngay sau (trong cùng đoạn) | ví dụ: "magnesium bisglycinate (dạng muối dễ hấp thu)" | 0-3 |
| T3 | Tránh phóng đại cảm xúc | Không có cụm cảm xúc mạnh ("tuyệt vời", "thần kỳ", "đáng kinh ngạc") | 0 = ≥ 3 cụm; 1 = 2; 2 = 1; 3 = 0 | 0-3 |
| T4 | Cân bằng lợi ích/rủi ro (Fair balance) | Khi có claim lợi ích → xuất hiện đồng thời cụm cảnh báo ("cần hỏi bác sĩ", "có thể gây", "không dùng cho…") | AI phát hiện cặp [positive claim] ↔ [caution phrase] | 0-3 |
| T5 | Trích dẫn chứng cứ | Có cụm "theo nghiên cứu…", "một thử nghiệm…", "nguồn: …" hoặc DOI/link | ≥ 1 = 2 đ; ≥ 2 = 3 đ | 0-3 |
| T6 | Tác giả/duyệt chuyên môn | Có xuất hiện tên + chức danh hoặc cụm "duyệt bởi dược sĩ/bác sĩ" | Có = 3; không = 0 | 0-3 |
| T7 | Minh bạch thương mại | Có cụm "bài viết có thể chứa liên kết tiếp thị", "không thay thế tư vấn y khoa" | Có = 3; không = 0 | 0-3 |
| T8 | Cấu trúc dễ hiểu | Câu chủ động, có tiêu đề mô tả, không lặp nhiều từ phức | ≥ 70 % câu chủ động → 3; nhiều câu bị động hoặc lủng củng → < 2 | 0-3 |
| T9 | Ngôn ngữ đồng cảm | Có cụm "nếu bạn", "hãy", "tham khảo bác sĩ", "nên trao đổi với chuyên gia" | Có ≥ 1 → 3; không có → 0 | 0-3 |
| T10 | Độ mới của nguồn trích dẫn | Có năm xuất bản trong trích dẫn tài liệu/nghiên cứu (VD: "Smith, 2020", "(2020)", "theo nghiên cứu năm 2023"). **LƯU Ý**: Ngày cập nhật bài viết nằm trong schema/metadata, KHÔNG đánh giá ở đây | Có năm trong tài liệu/nghiên cứu → 3; không có → 0 | 0-3 |

## 🚫 4. BỐN LỖI CẤM (bất kỳ phát hiện nào → tự động "Fail")

| Mã | Lỗi nghiêm trọng | Mô tả |
|----|------------------|-------|
| E1 | Claim điều trị/chữa khỏi bệnh không chứng cứ | "Chữa khỏi hoàn toàn", "điều trị", "ngăn ngừa ung thư"… mà không có nguồn khoa học |
| E2 | So sánh sản phẩm cạnh tranh không nguồn | "Tốt hơn X", "hiệu quả gấp đôi Y" mà không dẫn chứng |
| E3 | Không có khuyến cáo an toàn khi cần thiết | Với thuốc/TPCN có tác dụng mạnh mà thiếu hoàn toàn cụm "tham khảo bác sĩ", "không dùng cho…" |
| E4 | Claim an toàn tuyệt đối không ngữ cảnh | "An toàn tuyệt đối", "an toàn cho mọi người", "không có tác dụng phụ". CHÚ Ý: "An toàn cho [đối tượng cụ thể]" + có chỉ định rõ ràng là HỢP LỆ |

**Khi E1-E4 xuất hiện → bài bị khóa, không xuất bản.**

**📌 LƯU Ý:** Tiêu chí "Minh bạch thương mại" (T7) vẫn được đánh giá và cho điểm, nhưng KHÔNG tự động FAIL vì nội dung này dành cho mục đích thương mại/e-commerce. Tiêu chí E4 cũ (Không minh bạch affiliate/quảng cáo) đã bị loại bỏ khỏi danh sách lỗi nghiêm trọng.

## 🧮 5. QUY TRÌNH CHẤM ĐIỂM (AI nội bộ)

```
INPUT: văn bản sản phẩm/dược phẩm

PROCESS:
  1. Chuẩn hoá tiếng Việt (lowercase, bỏ ký tự đặc biệt)
  2. Xác định pattern từng tiêu chí (regex + semantic pattern)
  3. Gán điểm 0–3 cho T1..T10
  4. Nếu phát hiện lỗi E1–E5 → output: "FAIL"
  5. Tổng điểm = Σ(T1..T10)
  6. Đánh giá:
     - 0–9: FAIL
     - 10–11: NEED REVIEW
     - ≥12: PASS (đủ chuẩn xuất bản)

OUTPUT: {total_score, verdict, detail_per_criterion}
```

## 📘 6. MẪU OUTPUT CHO HỆ THỐNG (AI JSON PARSE)

```json
{
  "tone_check": {
    "total_score": 13,
    "verdict": "PASS",
    "criteria": {
      "T1_neutral_tone": 3,
      "T2_medical_clarity": 2,
      "T3_no_exaggeration": 3,
      "T4_fair_balance": 3,
      "T5_evidence_citation": 2,
      "T6_expert_author": 3,
      "T7_disclaimer_transparency": 3,
      "T8_plain_structure": 2,
      "T9_empathy_language": 3,
      "T10_update_freshness": 2
    },
    "errors": []
  }
}
```

## 🔍 7. GỢI Ý ÁNH XẠ (cho AI prompt)

Nếu AI được nhúng vào pipeline kiểm duyệt, mỗi tiêu chí có thể biểu diễn bằng 1 prompt subcheck:

- "Kiểm tra xem nội dung có dùng ngôn ngữ tuyệt đối hóa không?"
- "Phát hiện cụm khuyến cáo y khoa ('tham khảo bác sĩ'...)?"
- "Có xuất hiện nguồn chứng cứ (ví dụ: theo nghiên cứu, DOI, PubMed) không?"

Mỗi subcheck trả về `{score, found_phrases}`, sau đó tổng hợp.

## 🧱 8. HƯỚNG DẪN SỬ DỤNG LÀM "RÀO CHẮN XUẤT BẢN"

1. Trước khi xuất bản, AI chạy bộ tiêu chí trên toàn văn bản.
2. Nếu có lỗi E1–E5 → BLOCK.
3. Nếu tổng điểm < 12 → REVIEW REQUIRED (hiển thị cảnh báo).
4. Nếu ≥ 12 → PASS → hệ thống cho phép xuất bảng (frontend).
5. Ghi log `{title, total_score, verdict, fail_flags}` để theo dõi compliance.

## ✅ 9. CHECKLIST NGẮN CHO BIÊN TẬP (người dùng dễ nhớ)

| Câu hỏi | Nếu "Có" → OK |
|---------|---------------|
| 1. Có dùng ngôn ngữ trung tính, không tuyệt đối hóa? | ✅ |
| 2. Có giải thích thuật ngữ y học khó hiểu? | ✅ |
| 3. Có nhắc đến "tham khảo bác sĩ"? | ✅ |
| 4. Có cảnh báo hoặc rủi ro đi kèm lợi ích? | ✅ |
| 5. Có nguồn hoặc dẫn chứng khoa học? | ✅ |
| 6. Có hiển thị tác giả/duyệt chuyên môn? | ✅ |
| 7. Có disclosure/affiliate rõ ràng? | ✅ |
| 8. Có cấu trúc rõ, dễ hiểu? | ✅ |
| 9. Có giọng điệu đồng cảm, hỗ trợ? | ✅ |
| 10. Có ngày cập nhật hoặc thời gian nguồn? | ✅ |

## 📝 10. VÍ DỤ CỤ THỂ VỀ CLAIM "AN TOÀN"

### ✅ HỢP LỆ (Không vi phạm T1 & E5):

1. **"An toàn cho trẻ em từ 6 tháng tuổi"**
   - Có đối tượng cụ thể: trẻ em từ 6 tháng
   - Giả định: sản phẩm có chỉ định cho trẻ em, không có chống chỉ định

2. **"An toàn cho phụ nữ cho con bú"**
   - Có đối tượng cụ thể: phụ nữ cho con bú
   - Giả định: không có chống chỉ định/cảnh báo cho phụ nữ cho con bú

3. **"An toàn cho trẻ sơ sinh khi dùng đúng liều lượng"**
   - Có đối tượng cụ thể + điều kiện sử dụng
   - Giả định: sản phẩm có chỉ định cho trẻ sơ sinh

4. **"Được coi là an toàn cho người lớn khỏe mạnh theo FDA"**
   - Có nguồn ủy quyền (FDA)
   - Có ngữ cảnh (người lớn khỏe mạnh)
   - Có tính điều kiện ("được coi là")

### ❌ VI PHẠM (Vi phạm T1 & E5):

1. **"Hoàn toàn an toàn"** / **"An toàn tuyệt đối"**
   - Không có đối tượng cụ thể
   - Tuyệt đối hóa

2. **"An toàn cho mọi người"** / **"An toàn cho tất cả mọi người"**
   - Quá rộng, không có ngữ cảnh

3. **"Không có tác dụng phụ"** / **"Không có nguy cơ"**
   - Tuyệt đối hóa nguy cơ

4. **"100% an toàn"**
   - Tuyệt đối hóa bằng con số

### 🔄 CẦN NGỮ CẢNH THÊM:

1. **"An toàn khi sử dụng đúng cách"**
   - ⚠️ Cần thêm: đối tượng cụ thể
   - ✅ Tốt hơn: "An toàn cho người lớn khi sử dụng đúng cách"

2. **"Sản phẩm an toàn"**
   - ⚠️ Cần thêm: cho ai?
   - ✅ Tốt hơn: "Sản phẩm an toàn cho trẻ em trên 2 tuổi"

## 🧩 Tóm tắt

- Bộ tiêu chí này hoàn toàn tự kiểm được bằng AI, không cần tool ngoài, không đếm từ.
- Dựa trên 3 logic: ngôn ngữ học – ngữ cảnh – sự hiện diện của tín hiệu E-E-A-T.
- Đảm bảo nội dung dược phẩm/YMYL tuân thủ tiêu chuẩn chuyên nghiệp, an toàn và minh bạch.
- **Logic "an toàn"**: Chấp nhận claim có đối tượng cụ thể + ngữ cảnh rõ ràng, chỉ cảnh báo khi tuyệt đối hóa hoặc thiếu ngữ cảnh.
