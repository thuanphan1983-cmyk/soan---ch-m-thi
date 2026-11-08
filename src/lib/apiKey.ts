import { NextRequest } from 'next/server';

/**
 * Helper to dynamically and flexibly resolve the Gemini API key from:
 * 1. Request headers (e.g. x-api-key)
 * 2. Request JSON body (e.g. apiKey)
 * 3. Environment variables: GEMINI_API_KEY, GOOGLE_API_KEY, NEXT_PUBLIC_GEMINI_API_KEY, etc.
 */
export function getGeminiApiKey(req?: NextRequest, body?: any): string {
  // 1. Check client-supplied key in body
  if (body?.apiKey && typeof body.apiKey === 'string') {
    const trimmed = body.apiKey.trim();
    if (trimmed.length > 5 && trimmed !== 'your_api_key_here') {
      return trimmed;
    }
  }

  // 2. Check client-supplied key in headers
  if (req) {
    const headerKey = req.headers.get('x-api-key') || req.headers.get('x-gemini-api-key') || req.headers.get('authorization');
    if (headerKey) {
      const cleanHeader = headerKey.replace(/^Bearer\s+/i, '').trim();
      if (cleanHeader.length > 5 && cleanHeader !== 'your_api_key_here') {
        return cleanHeader;
      }
    }
  }

  // 3. Check environment variables in priority order
  const envCandidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    process.env.GEMINI_KEY,
    process.env.GOOGLE_GENAI_API_KEY,
    process.env.API_KEY,
  ];

  for (const envVal of envCandidates) {
    if (envVal && typeof envVal === 'string') {
      const trimmed = envVal.trim();
      if (trimmed.length > 5 && trimmed !== 'your_api_key_here') {
        return trimmed;
      }
    }
  }

  return '';
}
