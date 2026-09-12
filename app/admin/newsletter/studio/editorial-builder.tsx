"use client";

import { useEffect, useMemo, useState } from "react";
import {
  emptyNewsletterEditorialItem,
  newsletterEditorialSectionLabels,
  newsletterEditorialSections,
  type NewsletterEditorialIssue,
  type NewsletterEditorialItem
} from "@/lib/newsletter/editorial-draft";
import styles from "./editorial-builder.module.css";

type ApiResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  issue?: NewsletterEditorialIssue | null;
  issueId?: string;
  url?: string;
};

async function readJson(response: Response): Promise<ApiResult> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Venture could not complete that action.");
  return data as ApiResult;
}

function summary(item: NewsletterEditorialItem): string {
  const bits: string[] = [];
  if (item.eventDate) bits.push(item.eventDate);
  if (item.startTime) bits.push(item.endTime ? `${item.startTime}–${item.endTime}` : item.startTime);
  if (item.venueName) bits.push(item.venueName);
  return bits.join(" · ") || "Add details only if they help the reader.";
}

export function NewsletterEditorialBuilder() {
  const [issue, setIssue] = useState<NewsletterEditorialIssue | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [busy, setBusy] = useState<"load" | "save" | `upload-${number}` | "">("load");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await readJson(await fetch("/api/admin/newsletter/editorial", { cache: "no-store" }));
        if (!active) return;
        setIssue(result.issue || {
          title: "The Weekend Drop",
          subject: "Winnipeg this weekend",
          preheader: "",
          intro: "",
          closingNote: "",
          items: []
        });
      } catch (error) {
        if (active) setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not load the issue." });
      } finally {
        if (active) setBusy("");
      }
    })();
    return () => { active = false; };
  }, []);

  const storyCount = useMemo(() => issue?.items.filter((item) => item.title.trim()).length || 0, [issue]);

  function updateIssue<K extends keyof NewsletterEditorialIssue>(key: K, value: NewsletterEditorialIssue[K]) {
    setIssue((current) => current ? { ...current, [key]: value } : current);
  }

  function updateItem(index: number, patch: Partial<NewsletterEditorialItem>) {
    setIssue((current) => current ? {
      ...current,
      items: current.items.map((item, i) => i === index ? { ...item, ...patch } : item)
    } : current);
  }

  function addStory() {
    setIssue((current) => {
      if (!current) return current;
      const next = [...current.items, emptyNewsletterEditorialItem((current.items.length + 1) * 10)];
      setOpenIndex(next.length - 1);
      return { ...current, items: next };
    });
  }

  function removeStory(index: number) {
    setIssue((current) => current ? { ...current, items: current.items.filter((_, i) => i !== index) } : current);
    setOpenIndex(null);
  }

  function moveStory(index: number, direction: -1 | 1) {
    setIssue((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.items.length) return current;
      const items = [...current.items];
      [items[index], items[target]] = [items[target], items[index]];
      setOpenIndex(target);
      return { ...current, items };
    });
  }

  async function saveIssue() {
    if (!issue) return;
    setBusy("save"); setNotice(null);
    try {
      const result = await readJson(await fetch("/api/admin/newsletter/editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue })
      }));
      setIssue((current) => current ? { ...current, id: result.issueId || current.id } : current);
      setNotice({ tone: "success", text: result.message || "Issue saved." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not save the issue." });
    } finally { setBusy(""); }
  }

  async function uploadImage(index: number, file: File | null) {
    if (!file) return;
    setBusy(`upload-${index}`); setNotice(null);
    try {
      const body = new FormData(); body.append("file", file);
      const result = await readJson(await fetch("/api/admin/newsletter/images", { method: "POST", body }));
      if (result.url) updateItem(index, { imageUrl: result.url });
      setNotice({ tone: "success", text: "Photo added to the story." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not upload the photo." });
    } finally { setBusy(""); }
  }

  if (!issue) {
    return <section className={styles.builder}><p className={styles.muted}>{busy === "load" ? "Loading the current issue…" : "The issue could not be loaded."}</p></section>;
  }

  return <section className={styles.builder} aria-label="Thursday Venture editorial builder">
    <div className={styles.header}>
      <div><span className={styles.eyebrow}>THURSDAY VENTURE · EDITORIAL BUILDER</span><h2>Build the issue like a city blog.</h2><p>Keep the writing first. Title is the only story field that really matters. Date, time, venue, link, photo and internal notes are optional.</p></div>
      <button className={styles.save} disabled={busy !== ""} onClick={saveIssue} type="button">{busy === "save" ? "Saving…" : `Save issue · ${storyCount} stories`}</button>
    </div>

    {notice ? <div className={`${styles.notice} ${styles[notice.tone]}`} role="status">{notice.text}</div> : null}

    <div className={styles.issueMeta}>
      <div className={styles.two}>
        <label className={styles.field}><span>Issue title</span><input value={issue.title} onChange={(e) => updateIssue("title", e.target.value)} /></label>
        <label className={styles.field}><span>Email subject</span><input maxLength={140} value={issue.subject} onChange={(e) => updateIssue("subject", e.target.value)} /><small>{issue.subject.length}/140</small></label>
      </div>
      <label className={styles.field}><span>Inbox preheader · optional</span><input value={issue.preheader} onChange={(e) => updateIssue("preheader", e.target.value)} /></label>
      <label className={styles.field}><span>Opening paragraph · optional</span><textarea rows={4} value={issue.intro} onChange={(e) => updateIssue("intro", e.target.value)} /></label>
      <label className={styles.field}><span>Closing note · optional</span><textarea rows={3} value={issue.closingNote} onChange={(e) => updateIssue("closingNote", e.target.value)} /></label>
    </div>

    <div className={styles.storyTop}><div><span className={styles.eyebrow}>STORIES</span><h3>{storyCount} pieces in this issue</h3></div><button className={styles.add} onClick={addStory} type="button">+ Add a story</button></div>

    <div className={styles.stories}>
      {issue.items.map((item, index) => <article className={styles.card} key={item.id || `story-${index}`}>
        <div className={styles.cardHead}>
          {item.imageUrl ? <img className={styles.thumb} src={item.imageUrl} alt="" /> : <div className={`${styles.thumb} ${styles.placeholder}`}>PHOTO</div>}
          <div className={styles.cardTitle}><span className={styles.pill}>{newsletterEditorialSectionLabels[item.section]}</span><strong>{item.title || "Untitled story"}</strong><div className={styles.metaLine}>{summary(item)}</div></div>
          <div className={styles.cardActions}>
            <button className={styles.smallBtn} disabled={index === 0} onClick={() => moveStory(index, -1)} type="button">↑</button>
            <button className={styles.smallBtn} disabled={index === issue.items.length - 1} onClick={() => moveStory(index, 1)} type="button">↓</button>
            <button className={styles.smallBtn} onClick={() => setOpenIndex(openIndex === index ? null : index)} type="button">{openIndex === index ? "Close" : "Edit"}</button>
            <button className={`${styles.smallBtn} ${styles.danger}`} onClick={() => removeStory(index)} type="button">Remove</button>
          </div>
        </div>
        {openIndex === index ? <div className={styles.details}>
          <div className={styles.two}>
            <label className={styles.field}><span>Story title</span><input placeholder="What is happening?" value={item.title} onChange={(e) => updateItem(index, { title: e.target.value })} /></label>
            <label className={styles.field}><span>Section</span><select value={item.section} onChange={(e) => updateItem(index, { section: e.target.value as NewsletterEditorialItem["section"] })}>{newsletterEditorialSections.map((value) => <option key={value} value={value}>{newsletterEditorialSectionLabels[value]}</option>)}</select></label>
          </div>
          <label className={styles.field}><span>Short write-up · optional</span><textarea rows={4} placeholder="Why should someone care? Keep it human and useful." value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} /></label>
          <div className={styles.triples}>
            <label className={styles.field}><span>Date · optional</span><input type="date" value={item.eventDate} onChange={(e) => updateItem(index, { eventDate: e.target.value })} /></label>
            <label className={styles.field}><span>Starts · optional</span><input type="time" value={item.startTime} onChange={(e) => updateItem(index, { startTime: e.target.value })} /></label>
            <label className={styles.field}><span>Ends · optional</span><input type="time" value={item.endTime} onChange={(e) => updateItem(index, { endTime: e.target.value })} /></label>
          </div>
          <div className={styles.two}>
            <label className={styles.field}><span>Venue / area · optional</span><input placeholder="The Forks, Club Regent, Exchange District…" value={item.venueName} onChange={(e) => updateItem(index, { venueName: e.target.value })} /></label>
            <label className={styles.field}><span>Link · optional</span><input placeholder="https://…" value={item.url} onChange={(e) => updateItem(index, { url: e.target.value })} /></label>
          </div>
          <div className={styles.photoRow}>
            <label className={styles.field}><span>Photo URL · optional</span><input placeholder="Paste an image URL or upload one" value={item.imageUrl} onChange={(e) => updateItem(index, { imageUrl: e.target.value })} /></label>
            <label className={styles.upload}>{busy === `upload-${index}` ? "Uploading…" : "Upload photo"}<input accept="image/jpeg,image/png,image/gif,image/webp" disabled={busy !== ""} onChange={(e) => uploadImage(index, e.target.files?.[0] || null)} type="file" /></label>
          </div>
          <label className={styles.field}><span>Internal Venture note · optional</span><textarea rows={2} placeholder="Verification reminder, why it made the cut, weather risk, etc." value={item.editorNote} onChange={(e) => updateItem(index, { editorNote: e.target.value })} /></label>
        </div> : null}
      </article>)}
    </div>

    {!issue.items.length ? <p className={styles.muted}>No stories yet. Add one and start with only a title. Everything else can come later.</p> : null}
  </section>;
}
