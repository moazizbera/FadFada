"use client";

import { ReactNode } from "react";
import { AppShell } from "./AppShell";

export function AppShellClient({ children }: { children: ReactNode }) {
  return <AppShell initialLanguage="ar">{children}</AppShell>;
}
