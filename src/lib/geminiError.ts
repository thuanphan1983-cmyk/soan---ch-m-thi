/**
 * Chuyển đổi mã lỗi từ Google Generative AI thành thông báo tiếng Việt thân thiện với người dùng
 */
export function formatGeminiError(error: any): string {
  const msg = (error?.message || '').toLowerCase();
  const status = error?.status || error?.statusCode;

  // 429 Quota Exceeded / Rate Limit
  if (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('resourceexhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('limit exceeded') ||
    msg.includes('too many requests') ||
    msg.includes('tokens per minute')
  ) {
    return 'Hệ thống đang quá tải lượt gọi API hoặc đã hết hạn ngạch gói miễn phí (Quota Exceeded 429). Vui lòng thử lại sau giây lát hoặc giảm bớt số lượng câu hỏi để tiết kiệm token.';
  }

  // 404 Model Not Found
  if (status === 404 || msg.includes('404') || msg.includes('not found') || msg.includes('is no longer available')) {
    return 'Model AI yêu cầu tạm thời không khả dụng trên tài khoản Google AI của bạn. Hệ thống đang tự động chuyển sang gemini-2.0-flash / gemini-1.5-flash, vui lòng thử lại.';
  }

  // Invalid API key
  if (msg.includes('api_key_invalid') || msg.includes('api key not valid') || msg.includes('apikey')) {
    return 'Mã API Key Gemini không hợp lệ hoặc chưa được kích hoạt. Vui lòng kiểm tra lại biến môi trường GEMINI_API_KEY trong cài đặt.';
  }

  // 503 Server overloaded
  if (status === 503 || msg.includes('503') || msg.includes('overloaded') || msg.includes('unavailable') || msg.includes('internal error')) {
    return 'Máy chủ Google AI hiện đang bận hoặc quá tải. Vui lòng thử lại sau ít phút.';
  }

  // Content safety block
  if (msg.includes('safety') || msg.includes('blocked') || msg.includes('recitation')) {
    return 'Nội dung yêu cầu bị bộ lọc an toàn của Google từ chối. Vui lòng điều chỉnh lại mô tả đề thi.';
  }

  return error?.message || 'Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại sau giây lát.';
}
