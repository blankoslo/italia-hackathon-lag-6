"use client";
import { useState } from "react";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="px-4 py-2 text-sm font-semibold transition-colors"
      style={{
        background: copied ? "var(--color-success-bg)" : "transparent",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        color: copied ? "var(--color-success-text)" : "var(--color-text-secondary)",
      }}
    >
      {copied ? "Kopiert!" : "Kopier lenke"}
    </button>
  );
}
