"use client";

import { useState } from "react";
import type { LearningResource, ResourceKind } from "@/lib/research";

type ResourceListProps = {
  resources: LearningResource[];
};

const icons: Record<ResourceKind, string> = {
  video: "▶",
  article: "✎",
  pdf: "▤",
  audio: "♪",
};

export function ResourceList({ resources }: ResourceListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (resources.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {resources.map((resource) => {
        const open = openId === resource.id;

        return (
          <div key={resource.id} className="rounded-lg border border-line bg-bone/[0.03]" dir="auto">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : resource.id)}
              className="flex w-full items-center gap-3 px-3 py-3 text-start"
            >
              <span className="font-mono text-sm text-sage">{icons[resource.kind]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-arsans text-sm text-bone/85">{resource.title}</span>
                <span className="block font-mono text-[10px] uppercase text-bone/35">{resource.source}</span>
              </span>
              <span className="font-mono text-xs text-bone/40">{open ? "-" : "+"}</span>
            </button>
            {open ? (
              <div className="space-y-3 border-t border-line px-3 py-3">
                <ResourcePreview resource={resource} />
                <a className="font-mono text-xs uppercase tracking-[0.08em] text-gold hover:text-bone" href={resource.url} target="_blank" rel="noreferrer">
                  Open externally
                </a>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ResourcePreview({ resource }: { resource: LearningResource }) {
  if (resource.kind === "video") {
    return (
      <div className="space-y-3">
        <div className="grid aspect-video place-items-center rounded-md border border-line bg-ink/60 px-5 text-center">
          <div className="space-y-3">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-sage/40 bg-sage/10 font-mono text-sage">▶</span>
            <p className="font-arsans text-sm leading-7 text-bone/70">{resource.preview}</p>
          </div>
        </div>
      </div>
    );
  }

  if (resource.kind === "pdf" && resource.embedUrl) {
    return (
      <div className="space-y-2">
        <iframe className="h-96 w-full rounded-md border border-line bg-ink/60" src={resource.embedUrl} title={resource.title} />
        <p className="font-arsans text-sm leading-7 text-bone/55">{resource.preview}</p>
      </div>
    );
  }

  if (resource.kind === "pdf" && resource.content) {
    return (
      <div className="space-y-2 rounded-md border border-line bg-ink/25 p-3">
        <p className="font-arsans text-sm leading-7 text-bone/60">{resource.preview}</p>
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-6 text-bone/75">{resource.content}</pre>
      </div>
    );
  }

  if (resource.kind === "audio" && resource.embedUrl) {
    return (
      <div className="space-y-2">
        <audio className="w-full" controls src={resource.embedUrl} />
        <p className="font-arsans text-sm leading-7 text-bone/55">{resource.preview}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-ink/25 p-3">
      <p className="font-arsans text-sm leading-7 text-bone/70">{resource.preview}</p>
    </div>
  );
}
