"use client";

import { useEffect, useState } from "react";

type TypewriterTextProps = {
  text: string;
  speed: number;
  className?: string;
};

export function TypewriterText({ text, speed, className }: TypewriterTextProps) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    let index = 0;
    setShown("");

    const interval = window.setInterval(() => {
      index += 1;
      setShown(text.slice(0, index));
      if (index >= text.length) window.clearInterval(interval);
    }, speed);

    return () => window.clearInterval(interval);
  }, [speed, text]);

  return <p className={className}>{shown}</p>;
}
