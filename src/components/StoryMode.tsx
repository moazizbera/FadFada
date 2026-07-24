"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type StoryChoice = {
  id: string;
  textAr: string;
  textEn: string;
  nextNodeId: string;
};

type StoryNode = {
  id: string;
  textAr: string;
  textEn: string;
  emoji: string;
  choices?: StoryChoice[];
  isEnding?: boolean;
  reward?: number;
};

type Language = "ar" | "en";

type StoryModeProps = {
  language: Language;
  storyId: string;
  titleAr: string;
  titleEn: string;
  coverEmoji: string;
  nodes: StoryNode[];
  onComplete: (points: number) => void;
  onExit: () => void;
};

export function StoryMode({
  language,
  storyId,
  titleAr,
  titleEn,
  coverEmoji,
  nodes,
  onComplete,
  onExit,
}: StoryModeProps) {
  const isArabic = language === "ar";
  const [currentNodeId, setCurrentNodeId] = useState(nodes[0]?.id ?? "");
  const [history, setHistory] = useState<string[]>([]);
  const [showChoices, setShowChoices] = useState(false);
  const [totalReward, setTotalReward] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentNode = nodes.find((n) => n.id === currentNodeId);

  useEffect(() => {
    setShowChoices(false);
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setShowChoices(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [currentNodeId]);

  const handleChoice = (choice: StoryChoice) => {
    setHistory((prev) => [...prev, currentNodeId]);
    setCurrentNodeId(choice.nextNodeId);
  };

  useEffect(() => {
    if (currentNode?.isEnding) {
      const reward = currentNode.reward ?? 10;
      setTotalReward((prev) => prev + reward);
      setTimeout(() => onComplete(reward), 2000);
    }
  }, [currentNode, onComplete]);

  if (!currentNode) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#0E0D10]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onExit}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-bone/60 transition-all hover:bg-white/[0.12] hover:text-bone"
        >
          ✕
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{coverEmoji}</span>
          <span className="font-arsans text-sm font-bold text-bone/70" dir={isArabic ? "rtl" : "ltr"}>
            {isArabic ? titleAr : titleEn}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm">⭐</span>
          <span className="font-arsans text-xs text-amber-200">{totalReward}</span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 py-4">
        {nodes.map((node, index) => (
          <div
            key={node.id}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              node.id === currentNodeId
                ? "bg-amber-200 scale-125"
                : history.includes(node.id)
                ? "bg-amber-200/40"
                : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Story content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* Emoji */}
        <div
          className={`mb-6 text-6xl transition-all duration-500 ${
            isAnimating ? "scale-0 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          {currentNode.emoji}
        </div>

        {/* Text */}
        <div
          className={`max-w-md text-center transition-all duration-700 ${
            isAnimating ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <p
            className="font-arsans text-lg leading-relaxed text-bone/90"
            dir={isArabic ? "rtl" : "ltr"}
          >
            {isArabic ? currentNode.textAr : currentNode.textEn}
          </p>
        </div>

        {/* Choices */}
        {showChoices && currentNode.choices && currentNode.choices.length > 0 && (
          <div className="mt-8 flex w-full max-w-md flex-col gap-3">
            {currentNode.choices.map((choice, index) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChoice(choice)}
                className="animate-riseIn rounded-xl border border-white/15 bg-white/[0.05] px-5 py-4 text-left transition-all duration-200 hover:border-amber-200/30 hover:bg-amber-200/[0.08] hover:shadow-lg active:scale-[0.98]"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <span className="font-arsans text-sm text-bone/80" dir={isArabic ? "rtl" : "ltr"}>
                  {isArabic ? choice.textAr : choice.textEn}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Ending */}
        {currentNode.isEnding && (
          <div className="mt-8 animate-riseIn text-center">
            <p className="text-4xl">🎉</p>
            <p className="mt-3 font-arsans text-lg font-bold text-amber-100" dir={isArabic ? "rtl" : "ltr"}>
              {isArabic ? "أحسنت!" : "Well done!"}
            </p>
            <p className="mt-1 font-arsans text-sm text-bone/60" dir={isArabic ? "rtl" : "ltr"}>
              +{currentNode.reward ?? 10} ⭐
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
