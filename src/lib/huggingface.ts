export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function getGroqModel() {
  return process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";
}

type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callGroqChat(messages: GroqMessage[], options?: {
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("GROQ_API_KEY is missing.");

  const model = getGroqModel();
  const temperature = options?.temperature ?? 0.72;
  const maxTokens = options?.maxTokens ?? 800;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Groq API error ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned empty response.");

  return text;
}
