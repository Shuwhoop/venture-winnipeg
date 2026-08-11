"use client";

import {
  useEffect
} from "react";

import styles from "./explore-interaction-polish.module.css";

const CARD_ATTRIBUTE =
  "data-venture-explore-detail-card";

const DETAIL_LINK_ATTRIBUTE =
  "data-venture-detail-link";

const NUMBER_ATTRIBUTE =
  "data-venture-hidden-rank";

const MAP_MARKER_ATTRIBUTE =
  "data-venture-unnumbered-marker";

function normalizeText(
  value: string | null | undefined
) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function isDetailsLink(
  element: Element
) {
  if (!(element instanceof HTMLAnchorElement)) {
    return false;
  }

  const text =
    normalizeText(element.textContent)
      .toLowerCase();

  return (
    text === "view details" ||
    text === "view listing" ||
    text === "details"
  );
}

function isMapAction(
  element: Element
) {
  if (
    !(
      element instanceof HTMLAnchorElement ||
      element instanceof HTMLButtonElement
    )
  ) {
    return false;
  }

  const text =
    normalizeText(element.textContent)
      .toLowerCase();

  return (
    text === "show on map" ||
    text === "shown on map" ||
    text === "on map"
  );
}

function findCard(
  detailsLink: HTMLAnchorElement
) {
  const article =
    detailsLink.closest("article");

  if (article instanceof HTMLElement) {
    return article;
  }

  let current =
    detailsLink.parentElement;

  for (
    let depth = 0;
    current && depth < 6;
    depth += 1,
    current = current.parentElement
  ) {
    const text =
      normalizeText(current.textContent)
        .toLowerCase();

    if (
      text.includes("view details") &&
      (
        text.includes("show on map") ||
        text.includes("shown on map")
      )
    ) {
      return current;
    }
  }

  return null;
}

function hideCardRank(
  card: HTMLElement
) {
  const cardRect =
    card.getBoundingClientRect();

  const candidates =
    Array.from(
      card.querySelectorAll<HTMLElement>(
        "span, b, strong, i, div"
      )
    );

  for (const candidate of candidates) {
    if (
      candidate.hasAttribute(
        NUMBER_ATTRIBUTE
      )
    ) {
      continue;
    }

    if (
      candidate.children.length > 0
    ) {
      continue;
    }

    const text =
      normalizeText(candidate.textContent);

    if (!/^\d{1,3}$/.test(text)) {
      continue;
    }

    const rect =
      candidate.getBoundingClientRect();

    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.width > 52 ||
      rect.height > 52
    ) {
      continue;
    }

    const closeToTopLeft =
      rect.left <=
        cardRect.left +
          Math.min(
            72,
            cardRect.width * 0.26
          ) &&
      rect.top <=
        cardRect.top + 62;

    if (!closeToTopLeft) {
      continue;
    }

    candidate.setAttribute(
      NUMBER_ATTRIBUTE,
      "true"
    );
  }
}

function polishListCards() {
  const detailLinks =
    Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        "a"
      )
    ).filter(isDetailsLink);

  for (const detailsLink of detailLinks) {
    const card =
      findCard(detailsLink);

    if (!card) {
      continue;
    }

    card.setAttribute(
      CARD_ATTRIBUTE,
      detailsLink.href
    );

    detailsLink.setAttribute(
      DETAIL_LINK_ATTRIBUTE,
      "true"
    );

    if (
      !card.hasAttribute("tabindex")
    ) {
      card.tabIndex = 0;
    }

    if (
      !card.hasAttribute("role")
    ) {
      card.setAttribute(
        "role",
        "link"
      );
    }

    const listingName =
      card.querySelector(
        "h2, h3, [data-listing-name]"
      )?.textContent;

    if (
      listingName &&
      !card.hasAttribute("aria-label")
    ) {
      card.setAttribute(
        "aria-label",
        `View details for ${normalizeText(
          listingName
        )}`
      );
    }

    for (
      const action of
      Array.from(
        card.querySelectorAll(
          "a, button"
        )
      )
    ) {
      if (
        isMapAction(action) &&
        normalizeText(
          action.textContent
        ).toLowerCase() ===
          "shown on map"
      ) {
        action.textContent =
          "Show on map";
      }
    }

    hideCardRank(card);
  }
}

function polishMapMarkers() {
  const markers =
    Array.from(
      document.querySelectorAll<HTMLElement>(
        ".maplibregl-marker, [class*='marker'], [data-marker]"
      )
    );

  for (const marker of markers) {
    const candidates =
      [
        marker,
        ...Array.from(
          marker.querySelectorAll<HTMLElement>(
            "button, span, div"
          )
        )
      ];

    for (const candidate of candidates) {
      if (
        candidate.hasAttribute(
          MAP_MARKER_ATTRIBUTE
        )
      ) {
        continue;
      }

      if (
        candidate.children.length > 0
      ) {
        continue;
      }

      const text =
        normalizeText(
          candidate.textContent
        );

      if (!/^\d{1,3}$/.test(text)) {
        continue;
      }

      const rect =
        candidate.getBoundingClientRect();

      if (
        rect.width > 64 ||
        rect.height > 64
      ) {
        continue;
      }

      candidate.setAttribute(
        MAP_MARKER_ATTRIBUTE,
        "true"
      );

      candidate.setAttribute(
        "aria-hidden",
        "true"
      );

      candidate.textContent = "";
    }
  }
}

function polishExplore() {
  polishListCards();
  polishMapMarkers();
}

function isInteractiveTarget(
  target: EventTarget | null,
  card: HTMLElement
) {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactive =
    target.closest(
      "a, button, input, select, textarea, label, [role='button']"
    );

  return Boolean(
    interactive &&
    interactive !== card
  );
}

export function ExploreInteractionPolish() {
  useEffect(() => {
    let frame = 0;

    function queuePolish() {
      cancelAnimationFrame(frame);

      frame =
        requestAnimationFrame(
          polishExplore
        );
    }

    function handleClick(
      event: MouseEvent
    ) {
      if (!(event.target instanceof Element)) {
        return;
      }

      const card =
        event.target.closest<HTMLElement>(
          `[${CARD_ATTRIBUTE}]`
        );

      if (!card) {
        return;
      }

      if (
        isInteractiveTarget(
          event.target,
          card
        )
      ) {
        return;
      }

      const href =
        card.getAttribute(
          CARD_ATTRIBUTE
        );

      if (!href) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      window.location.assign(
        href
      );
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key !== "Enter" &&
        event.key !== " "
      ) {
        return;
      }

      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const card =
        event.target.closest<HTMLElement>(
          `[${CARD_ATTRIBUTE}]`
        );

      if (
        !card ||
        event.target !== card
      ) {
        return;
      }

      const href =
        card.getAttribute(
          CARD_ATTRIBUTE
        );

      if (!href) {
        return;
      }

      event.preventDefault();

      window.location.assign(
        href
      );
    }

    const observer =
      new MutationObserver(
        queuePolish
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
        characterData: true
      }
    );

    document.addEventListener(
      "click",
      handleClick,
      true
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );

    queuePolish();

    return () => {
      cancelAnimationFrame(frame);

      observer.disconnect();

      document.removeEventListener(
        "click",
        handleClick,
        true
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
        true
      );
    };
  }, []);

  return (
    <div
      className={styles.behaviorMarker}
      aria-hidden="true"
    />
  );
}
