export type ResourceKind = "video" | "article" | "pdf" | "audio";

export type LearningResource = {
  id: string;
  kind: ResourceKind;
  title: string;
  source: string;
  url: string;
  embedUrl?: string;
  preview: string;
  content?: string;
};

export function getLearningResources(text: string): LearningResource[] {
  const topic = extractTopic(text) ?? normalizeTopic(text);
  const searchTopic = topic ?? "active recall";

  return [
    {
      id: "study-skills-video",
      kind: "video",
      title: topic ? `Video for ${topic}` : "How to learn anything with active recall",
      source: "YouTube · Learning how to learn",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTopic)}`,
      preview: `Search YouTube for "${searchTopic}". Many YouTube results block embedded playback, so Fadfada keeps the query and learning steps here, then opens YouTube only when the user chooses playback.`,
    },
    {
      id: "practical-guide",
      kind: "article",
      title: topic ? `Build a simple first learning path for ${topic}` : "Make a tiny learning plan you can actually finish",
      source: "Article · Practical guide",
      url: topic ? `https://www.google.com/search?q=${encodeURIComponent(`${topic} overview article`)}` : "https://learningcenter.unc.edu/tips-and-tools/studying-101-study-smarter-not-harder/",
      preview: `In-chat reading plan: choose one narrow ${topic ?? "topic"}, study it for 25 minutes, close the source, write five recall questions, then check what you missed. Keep one mistake list instead of rereading everything.`,
    },
    {
      id: "topic-notes",
      kind: "pdf",
      title: topic ? `One-page notes for ${topic}` : "One-page learning notes template",
      source: "Document · In-chat notes",
      url: topic ? `https://www.google.com/search?q=${encodeURIComponent(`${topic} pdf notes`)}` : "https://www.google.com/search?q=one+page+study+notes+template",
      preview: topic ? `Use this quick note sheet for ${topic} before leaving the chat.` : "Use this one-page note sheet before leaving the chat.",
      content: buildDocumentContent(topic),
    },
  ];
}

export function extractLearningTopic(text: string) {
  const normalized = text.trim();
  const match = normalized.match(/(?:learn|study|understand|plan for|video for|video about|material for|resources for|pdf for|article about|خطة ل|خطة عشان|فيديو عن|فيديو ل|مصادر عن|مصادر ل|ذاكر|اتعلم|تعلم|شرح)\s+(.{2,48})/i);
  return match?.[1]?.replace(/[?.!؟]/g, "").trim();
}

function extractTopic(text: string) {
  return extractLearningTopic(text);
}

function normalizeTopic(text: string) {
  const cleaned = text.replace(/[?.!؟]/g, "").trim();
  const looksLikeQuestion = /\b(is|are|can|could|there|any|video|learn|study|watch|material|resource)\b/i.test(cleaned);

  if (!cleaned || looksLikeQuestion || cleaned.length > 64) return undefined;
  return cleaned;
}

function buildDocumentContent(topic?: string) {
  const subject = topic ?? "this topic";

  return `Focus: ${subject}\n\n1. What I am trying to understand:\nWrite the main question in one sentence.\n\n2. Three anchor facts:\n- Who or what is central?\n- What happened or how does it work?\n- Why does it matter?\n\n3. One thing to verify:\nSearch for one reliable source and compare it with the video/article.\n\n4. Memory check:\nClose the source and explain ${subject} out loud in 60 seconds.`;
}
