"use client";

import { useRouter } from "next/navigation";

import { useEffect } from "react";
import styles from "./explore-interaction-polish.module.css";

const CARD = "data-venture-explore-detail-card";
const DETAIL = "data-venture-detail-link";
const RANK = "data-venture-hidden-rank";
const MARKER = "data-venture-compact-map-marker";
const MEDIA = "data-venture-list-media";
const BODY = "data-venture-list-content";
const ACTIONS = "data-venture-list-actions";
const HEART = "data-venture-doodle-heart";
const HEART_SAVED = "data-venture-doodle-heart-saved";

const clean = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

function isDetailsLink(element: Element) {
  if (!(element instanceof HTMLAnchorElement)) return false;
  const text = clean(element.textContent).toLowerCase();
  return text === "view details" || text === "view listing" || text === "details";
}

function isMapAction(element: Element) {
  if (!(element instanceof HTMLAnchorElement || element instanceof HTMLButtonElement)) return false;
  const text = clean(element.textContent).toLowerCase();
  return text === "show on map" || text === "shown on map" || text === "on map";
}

function findCard(detailsLink: HTMLAnchorElement) {
  const article = detailsLink.closest("article");
  if (article instanceof HTMLElement) return article;

  let current = detailsLink.parentElement;
  for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
    const text = clean(current.textContent).toLowerCase();
    if (text.includes("view details") && (text.includes("show on map") || text.includes("shown on map"))) {
      return current;
    }
  }
  return null;
}

function hideRank(card: HTMLElement) {
  const bounds = card.getBoundingClientRect();
  for (const candidate of Array.from(card.querySelectorAll<HTMLElement>("span,b,strong,i,div"))) {
    if (candidate.children.length > 0) continue;
    const text = clean(candidate.textContent);
    if (!/^\d{1,3}$/.test(text)) continue;
    const rect = candidate.getBoundingClientRect();
    if (rect.width <= 54 && rect.height <= 54 && rect.left <= bounds.left + 80 && rect.top <= bounds.top + 68) {
      candidate.setAttribute(RANK, "true");
    }
  }
}

function markStructure(card: HTMLElement) {
  const children = Array.from(card.children).filter((item): item is HTMLElement => item instanceof HTMLElement);
  const media = children.find((child) => {
    if (child.matches("a,button")) return false;
    const name = typeof child.className === "string" ? child.className.toLowerCase() : "";
    return Boolean(child.querySelector("img,picture,video,canvas")) || name.includes("image") || name.includes("media") || name.includes("photo");
  });
  if (media) media.setAttribute(MEDIA, "true");

  const body = children.find((child) => {
    if (child === media || child.matches("a,button")) return false;
    const name = typeof child.className === "string" ? child.className.toLowerCase() : "";
    return name.includes("body") || name.includes("content") || clean(child.textContent).length > 24;
  });
  if (body) body.setAttribute(BODY, "true");

  const mapAction = Array.from(card.querySelectorAll("a,button")).find(isMapAction);
  if (mapAction?.parentElement) mapAction.parentElement.setAttribute(ACTIONS, "true");
}

function markHearts(root: ParentNode) {
  for (const button of Array.from(root.querySelectorAll<HTMLElement>(".save-button"))) {
    button.setAttribute(HEART, "true");
    const words = [
      button.getAttribute("aria-label"),
      button.getAttribute("title"),
      button.textContent,
      typeof button.className === "string" ? button.className : "",
    ].map(clean).join(" ").toLowerCase();
    const saved = button.getAttribute("aria-pressed") === "true" || words.includes("remove") || words.includes("saved") || clean(button.textContent) === "♥";
    button.setAttribute(HEART_SAVED, saved ? "true" : "false");
  }
}

function polishList() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a")).filter(isDetailsLink);
  for (const detailsLink of links) {
    const card = findCard(detailsLink);
    if (!card) continue;
    card.setAttribute(CARD, detailsLink.href);
    detailsLink.setAttribute(DETAIL, "true");
    if (!card.hasAttribute("tabindex")) card.tabIndex = 0;
    if (!card.hasAttribute("role")) card.setAttribute("role", "link");
    const name = card.querySelector("h2,h3,[data-listing-name]")?.textContent;
    if (name && !card.hasAttribute("aria-label")) card.setAttribute("aria-label", `View details for ${clean(name)}`);
    for (const action of Array.from(card.querySelectorAll("a,button"))) {
      if (isMapAction(action) && clean(action.textContent).toLowerCase() === "shown on map") action.textContent = "Show on map";
    }
    hideRank(card);
    markStructure(card);
    markHearts(card);
  }
}

function polishMarkers() {
  for (const marker of Array.from(document.querySelectorAll<HTMLElement>(".maplibregl-marker"))) {
    marker.setAttribute(MARKER, "true");
    for (const node of [marker, ...Array.from(marker.querySelectorAll<HTMLElement>("span,b,strong,i,div"))]) {
      if (node.children.length > 0) continue;
      if (/^\d{1,3}$/.test(clean(node.textContent))) {
        node.textContent = "";
        node.setAttribute("aria-hidden", "true");
      }
    }
  }
}

function polish() {
  polishList();
  polishMarkers();
  markHearts(document);
}

function isInteractive(target: EventTarget | null, card: HTMLElement) {
  if (!(target instanceof Element)) return false;
  const hit = target.closest("a,button,input,select,textarea,label,[role='button']");
  return Boolean(hit && hit !== card);
}

export function ExploreInteractionPolish() {
  const router = useRouter();

  useEffect(() => {
    let frame = 0;
    const queue = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(polish);
    };

    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const card = event.target.closest<HTMLElement>(`[${CARD}]`);
      if (!card || isInteractive(event.target, card)) return;
      const href = card.getAttribute(CARD);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      router.push(href);
    };

    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (!(event.target instanceof HTMLElement)) return;
      const card = event.target.closest<HTMLElement>(`[${CARD}]`);
      if (!card || event.target !== card) return;
      const href = card.getAttribute(CARD);
      if (!href) return;
      event.preventDefault();
      router.push(href);
    };

    const observer = new MutationObserver(queue);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-pressed", "aria-label", "class"],
    });

    document.addEventListener("click", click, true);
    document.addEventListener("keydown", keydown, true);
    window.addEventListener("resize", queue);
    queue();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", keydown, true);
      window.removeEventListener("resize", queue);
    };
  }, []);

  return <div className={styles.behaviorMarker} aria-hidden="true" />;
}
