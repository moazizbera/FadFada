export const defaultGeminiModel = "gemini-2.0-flash";

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || defaultGeminiModel;
}
