export type SafetyResult = {
  triggered: boolean;
  language: "ar" | "en";
  text: string;
};

const crisisPattern = /\b(suicide|kill myself|end my life|self harm|hurt myself|can't go on|cant go on)\b|انتحار|أنتحر|انتحر|اموت نفسي|أموت نفسي|اذي نفسي|أذي نفسي|مش قادر اكمل|مش قادرة اكمل/i;

export function detectSafety(text: string): SafetyResult {
  const language = /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
  const triggered = crisisPattern.test(text);

  if (!triggered) {
    return { triggered: false, language, text: "" };
  }

  if (language === "ar") {
    return {
      triggered: true,
      language,
      text: "أنا آسف إنك شايل ده لوحدك. لو في خطر مباشر أو ممكن تأذي نفسك الآن، اتصل بالطوارئ في بلدك فورًا أو خليك مع شخص موثوق في نفس المكان.\n\nموارد ممكن تبدأ منها: الكويت 147، السعودية مساندة 920033360، الإمارات 800-4673، ولأي بلد تقدر تستخدم findahelpline.com.\n\nأنا معاك دلوقتي، لكن وجود شخص مدرّب أو قريب آمن معك مهم جدًا في اللحظة دي. فضفضة ليست بديلًا عن الطوارئ أو مختص مؤهل.",
    };
  }

  return {
    triggered: true,
    language,
    text: "I'm really sorry you're carrying this. If there is immediate danger or you might hurt yourself now, call your local emergency number or stay with a trusted person in the same place.\n\nStarting points: Kuwait 147, Saudi Mosanada 920033360, UAE 800-4673, and findahelpline.com for international support.\n\nI'm with you right now, but a trained person or safe nearby human matters in this moment. Fadfada is not a substitute for emergency care or a qualified professional.",
  };
}
