"use client";

import {
  useState
} from "react";

import styles from "./page.module.css";

type CommunityLaunchToolsProps = {
  slug: string;
  title: string;
};

export function CommunityLaunchTools({
  slug,
  title
}: CommunityLaunchToolsProps) {
  const [message, setMessage] =
    useState("");

  const publicPath =
    `/community/${slug}`;

  async function copyLink() {
    const url =
      `${window.location.origin}${publicPath}`;

    await navigator.clipboard.writeText(
      url
    );

    setMessage("Link copied");

    window.setTimeout(
      () => setMessage(""),
      1800
    );
  }

  async function shareExperience() {
    const url =
      `${window.location.origin}${publicPath}`;

    if (navigator.share) {
      await navigator.share({
        title,
        text:
          "Join Venture's next community experience in Winnipeg.",
        url
      });

      return;
    }

    await copyLink();
  }

  return (
    <div className={styles.launchToolButtons}>
      <button
        type="button"
        onClick={copyLink}
      >
        Copy public link
      </button>

      <button
        type="button"
        onClick={shareExperience}
      >
        Share experience
      </button>

      <span aria-live="polite">
        {message}
      </span>
    </div>
  );
}
