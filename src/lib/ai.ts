/**
 * AI helper — uses direct HTTP fetch to Z.ai API instead of the SDK.
 * Works on both sandbox (env vars from .env) and Vercel (env vars from dashboard).
 * 
 * On Vercel, set these Environment Variables:
 * - ZAI_BASE_URL = https://internal-api.z.ai/v1
 * - ZAI_API_KEY = Z.ai
 * - ZAI_TOKEN = (your JWT token)
 * - ZAI_CHAT_ID = (your chat id)
 * - ZAI_USER_ID = (your user id)
 */

interface ChatMessage {
  role: "assistant" | "user" | "system";
  content: string;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

function getConfig() {
  const baseUrl = process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1";
  const apiKey = process.env.ZAI_API_KEY || "Z.ai";
  const token = process.env.ZAI_TOKEN || "";
  const chatId = process.env.ZAI_CHAT_ID || "";
  const userId = process.env.ZAI_USER_ID || "";
  return { baseUrl, apiKey, token, chatId, userId };
}

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const config = getConfig();
  const url = `${config.baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    "X-Z-AI-From": "Z",
  };
  if (config.chatId) headers["X-Chat-Id"] = config.chatId;
  if (config.userId) headers["X-User-Id"] = config.userId;
  if (config.token) headers["X-Token"] = config.token;

  const body = {
    messages: [
      { role: "assistant", content: systemPrompt },
      { role: "user", content: userPrompt },
    ] as ChatMessage[],
    thinking: { type: "disabled" },
  };

  console.log("[AI] Sending request to:", url);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  console.log("[AI] Response status:", response.status);

  if (!response.ok) {
    const text = await response.text();
    console.error("[AI] Error response:", text);
    throw new Error(`AI API error ${response.status}: ${text.substring(0, 200)}`);
  }

  const data: ChatCompletionResponse = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  console.log("[AI] Response content length:", content.length);
  return content;
}

/** Parse JSON from AI response, stripping code fences if present */
export function parseAIJson<T>(raw: string): T | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
