"use client";

import { useEffect } from "react";

const visitorSessionKey = "fadfada-visitor-tracked";

export function VisitorTracker() {
  useEffect(() => {
    if (sessionStorage.getItem(visitorSessionKey)) return;
    sessionStorage.setItem(visitorSessionKey, "true");

    void fetch("/api/visitors", {
      method: "POST",
      keepalive: true,
    });
  }, []);

  return null;
}