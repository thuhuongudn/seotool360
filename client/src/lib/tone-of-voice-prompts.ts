/**
 * Tone of Voice Analysis Prompt Templates
 *
 * This file contains system prompts for different industries and use cases.
 * Each prompt is designed to evaluate content based on specific criteria.
 */

export interface TonePromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

/**
 * Pharma/YMYL Tone of Voice Evaluation Prompt
 * Based on E-E-A-T principles and medical content standards
 */
const PHARMA_YMYL_PROMPT: TonePromptTemplate = {
  id: "pharma-ymyl",
  name: "Dược phẩm - YMYL",
  description: "Đánh giá nội dung y tế và dược phẩm theo tiêu chuẩn E-E-A-T",
  systemPrompt: `Bạn là một chuyên gia đánh giá nội dung y tế và dược phẩm theo tiêu chuẩn E-E-A-T và YMYL.

Hãy phân tích văn bản sau theo bộ tiêu chí "AI-Evaluable Tone of Voice Framework – Pharma/YMYL v1.0":

## 10 TIÊU CHÍ ĐÁNH GIÁ (mỗi tiêu chí 0-3 điểm):

1. **T1_neutral_tone** - Giọng điệu trung tính: Không có từ tuyệt đối hóa ("chữa khỏi", "an toàn tuyệt đối", "hiệu quả 100%")
2. **T2_medical_clarity** - Ngôn ngữ chuyên môn rõ ràng: Có thuật ngữ y học được giải thích
3. **T3_no_exaggeration** - Tránh phóng đại: Không có cụm cảm xúc mạnh ("tuyệt vời", "thần kỳ", "đáng kinh ngạc")
4. **T4_fair_balance** - Cân bằng lợi ích/rủi ro: Khi nói lợi ích có kèm cảnh báo
5. **T5_evidence_citation** - Trích dẫn chứng cứ: Có "theo nghiên cứu", "nguồn", DOI/link
6. **T6_expert_author** - Tác giả/duyệt chuyên môn: Có tên + chức danh hoặc "duyệt bởi dược sĩ/bác sĩ"
7. **T7_disclaimer_transparency** - Minh bạch thương mại: Có disclaimer về affiliate/tư vấn y khoa
8. **T8_plain_structure** - Cấu trúc dễ hiểu: Câu chủ động, tiêu đề rõ ràng
9. **T9_empathy_language** - Ngôn ngữ đồng cảm: Có "nếu bạn", "tham khảo bác sĩ"
10. **T10_update_freshness** - Tính cập nhật: Có ngày cập nhật hoặc thời gian nguồn

## 5 LỖI CẤM (nếu có bất kỳ lỗi nào → FAIL):

- **E1**: Claim điều trị bệnh không có chứng cứ
- **E2**: So sánh sản phẩm cạnh tranh không nguồn
- **E3**: Không có khuyến cáo an toàn
- **E4**: Không minh bạch affiliate/quảng cáo
- **E5**: Claim an toàn tuyệt đối

## NHIỆM VỤ:
Phân tích văn bản và trả về JSON format với THÔNG TIN CHI TIẾT về vị trí lỗi:

\`\`\`json
{
  "total_score": <tổng điểm 0-15>,
  "verdict": "PASS" | "NEED REVIEW" | "FAIL",
  "criteria": {
    "T1_neutral_tone": {
      "score": <0-3>,
      "issues": [
        {
          "text": "<đoạn text vi phạm>",
          "reason": "<lý do vi phạm>",
          "suggestion": "<gợi ý sửa>"
        }
      ]
    },
    "T2_medical_clarity": {
      "score": <0-3>,
      "issues": [...]
    },
    ... (tương tự cho T3-T10)
  },
  "errors": [
    {
      "code": "E1|E2|E3|E4|E5",
      "description": "<mô tả lỗi>",
      "text": "<đoạn text vi phạm>",
      "severity": "critical"
    }
  ],
  "explanation": "<giải thích ngắn gọn về đánh giá tổng thể>",
  "recommendations": [
    "<khuyến nghị cụ thể để cải thiện điểm số>"
  ]
}
\`\`\`

**LƯU Ý QUAN TRỌNG:**
- Với mỗi tiêu chí, hãy chỉ ra CỤ THỂ đoạn text nào vi phạm
- Trích dẫn CHÍNH XÁC nội dung gốc, không diễn giải
- Đưa ra gợi ý SỬA CỤ THỂ cho từng vấn đề
- Nếu không có vấn đề, để issues = []`,
};

/**
 * Available prompt templates by industry
 */
export const TONE_PROMPT_TEMPLATES: Record<string, TonePromptTemplate> = {
  "pharma": PHARMA_YMYL_PROMPT,
};

/**
 * Get prompt template by industry ID
 */
export function getTonePromptTemplate(industryId: string): TonePromptTemplate | null {
  return TONE_PROMPT_TEMPLATES[industryId] || null;
}

/**
 * Build complete prompt with content
 */
export function buildToneAnalysisPrompt(industryId: string, content: string): string {
  const template = getTonePromptTemplate(industryId);

  if (!template) {
    throw new Error(`Prompt template not found for industry: ${industryId}`);
  }

  return `${template.systemPrompt}

## VĂN BẢN CẦN PHÂN TÍCH:

${content}`;
}

/**
 * Get list of available industries
 */
export function getAvailableIndustries(): Array<{ id: string; name: string; description: string }> {
  return Object.entries(TONE_PROMPT_TEMPLATES).map(([id, template]) => ({
    id,
    name: template.name,
    description: template.description,
  }));
}
