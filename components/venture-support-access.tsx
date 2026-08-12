"use client";

import Link from "next/link";
import {
  useLayoutEffect,
  useState
} from "react";
import {
  createPortal
} from "react-dom";
import {
  usePathname
} from "next/navigation";

import styles from "./venture-support-access.module.css";

const QUICK_ACTION_LABELS = [
  "edit profile details",
  "account sync",
  "view synced saves",
  "shared group planning",
  "log out"
] as const;

function normalizeText(
  value: string | null | undefined
) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function containsOtherQuickAction(
  text: string,
  currentLabel: string
) {
  return QUICK_ACTION_LABELS.some(
    label =>
      label !== currentLabel &&
      text.includes(label)
  );
}

function findProfileMenu(): HTMLElement | null {
  const links =
    Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        "a"
      )
    );

  const accountLink =
    links.find(link =>
      normalizeText(
        link.textContent
      ).includes(
        "account & privacy"
      )
    );

  const parent =
    accountLink?.parentElement;

  return (
    parent instanceof HTMLElement
      ? parent
      : null
  );
}

function findQuickActionCard(
  label: string
): HTMLElement | null {
  const candidates =
    Array.from(
      document.querySelectorAll<HTMLElement>(
        "a, button, section, article, div"
      )
    )
      .filter(element => {
        const text =
          normalizeText(
            element.textContent
          );

        return (
          text.includes(label) &&
          !containsOtherQuickAction(
            text,
            label
          )
        );
      })
      .sort((a, b) => {
        const aText =
          normalizeText(
            a.textContent
          );

        const bText =
          normalizeText(
            b.textContent
          );

        return (
          aText.length -
          bText.length
        );
      });

  const candidate =
    candidates[0];

  if (!candidate) {
    return null;
  }

  let shell: HTMLElement =
    candidate;

  /*
   * Walk outward only while the parent still belongs solely
   * to this action. This catches little spacing wrappers
   * without swallowing the next Quick Action.
   */
  for (
    let depth = 0;
    depth < 5;
    depth += 1
  ) {
    const parent =
      shell.parentElement;

    if (
      !(parent instanceof HTMLElement)
    ) {
      break;
    }

    const parentText =
      normalizeText(
        parent.textContent
      );

    if (
      !parentText.includes(label) ||
      containsOtherQuickAction(
        parentText,
        label
      ) ||
      parentText.includes(
        "quick actions"
      )
    ) {
      break;
    }

    shell =
      parent;
  }

  candidate.dataset
    .ventureQuickActionCard =
    "true";

  return shell;
}

function organizeQuickActions() {
  const headings =
    Array.from(
      document.querySelectorAll<HTMLElement>(
        "h1, h2, h3, h4, strong, span"
      )
    );

  const heading =
    headings.find(
      element =>
        normalizeText(
          element.textContent
        ) === "quick actions"
    );

  if (heading) {
    heading.dataset
      .ventureQuickActionsHeading =
      "true";
  }

  const found =
    QUICK_ACTION_LABELS
      .map(label => ({
        label,
        shell:
          findQuickActionCard(
            label
          )
      }))
      .filter(
        (
          item
        ): item is {
          label:
            typeof QUICK_ACTION_LABELS[number];
          shell: HTMLElement;
        } =>
          Boolean(
            item.shell
          )
      );

  found.forEach(
    (
      item,
      index
    ) => {
      item.shell.dataset
        .ventureQuickAction =
        "true";

      item.shell.dataset
        .ventureQuickActionPosition =
        index === 0
          ? "first"
          : index ===
              found.length - 1
            ? "last"
            : "middle";
    }
  );
}

export function VentureSupportAccess() {
  const pathname =
    usePathname();

  const [
    menu,
    setMenu
  ] =
    useState<HTMLElement | null>(
      null
    );

  useLayoutEffect(() => {
    if (
      pathname !== "/profile"
    ) {
      setMenu(null);
      return;
    }

    let frame = 0;

    function polishProfile() {
      cancelAnimationFrame(
        frame
      );

      frame =
        requestAnimationFrame(
          () => {
            const nextMenu =
              findProfileMenu();

            setMenu(
              current =>
                current ===
                nextMenu
                  ? current
                  : nextMenu
            );

            organizeQuickActions();
          }
        );
    }

    polishProfile();

    const observer =
      new MutationObserver(
        polishProfile
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    return () => {
      cancelAnimationFrame(
        frame
      );

      observer.disconnect();
    };
  }, [pathname]);

  if (
    pathname !== "/profile" ||
    !menu
  ) {
    return null;
  }

  return createPortal(
    <Link
      className={styles.supportRow}
      href="/support"
      aria-label="Contact Venture support"
    >
      <span
        className={styles.supportIcon}
        aria-hidden="true"
      >
        ?
      </span>

      <span
        className={styles.supportCopy}
      >
        <strong>
          Need help?
        </strong>

        <small>
          Contact Venture directly
        </small>
      </span>

      <span
        className={styles.chevron}
        aria-hidden="true"
      >
        ›
      </span>
    </Link>,
    menu
  );
}
