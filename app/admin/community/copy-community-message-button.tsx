"use client";

import {
  useState
} from "react";

export function CopyCommunityMessageButton({
  text
}: {
  text: string;
}) {
  const [copied, setCopied] =
    useState(false);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(
        text
      );

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        1800
      );
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyMessage}
    >
      {copied
        ? "Copied"
        : "Copy message"}
    </button>
  );
}
