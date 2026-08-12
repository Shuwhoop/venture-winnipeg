"use client";

import { useLayoutEffect, useRef } from "react";

function findSubmitSection(root: HTMLElement): HTMLElement | null {
  const links = Array.from(
    root.querySelectorAll<HTMLAnchorElement>(
      'a[href="/submit"], a[href^="/submit?"]'
    )
  );

  const preferred =
    links.find((link) => {
      const text = (link.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      return (
        text.includes("submit") ||
        text.includes("add a place") ||
        text.includes("add an event")
      );
    }) ?? links[0] ?? null;

  if (!preferred) return null;

  let node: HTMLElement = preferred;

  while (
    node.parentElement instanceof HTMLElement &&
    node.parentElement !== root
  ) {
    node = node.parentElement;
  }

  return node.parentElement === root ? node : null;
}

export function HomeSubmitLast() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const parent = marker.parentElement;
    if (!(parent instanceof HTMLElement)) return;

    const root: HTMLElement = parent;

    const moveSubmitToEnd = () => {
      const submitSection = findSubmitSection(root);

      if (
        !submitSection ||
        submitSection.dataset.ventureSubmitLast === "true"
      ) {
        return;
      }

      submitSection.dataset.ventureSubmitLast = "true";
      root.appendChild(submitSection);
    };

    moveSubmitToEnd();

    const observer = new MutationObserver(moveSubmitToEnd);
    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return <span ref={markerRef} hidden aria-hidden="true" />;
}
