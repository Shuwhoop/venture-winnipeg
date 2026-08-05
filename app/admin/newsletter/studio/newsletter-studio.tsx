"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  defaultVentureNewsletterDraft,
  type VentureNewsletterDraft
} from "@/lib/newsletter/campaign-draft";

import styles from "./page.module.css";


type Resource = {
  id: string;
  name: string;
};


type Broadcast = {
  id: string;
  name: string | null;
  subject: string;
  status: string;
  createdAt: string;
  scheduledAt: string | null;
  sentAt: string | null;
  topicId: string | null;
};


type Overview = {
  activeSubscribers: number;
  subscriberError: string;
  resources: {
    segment: Resource | null;
    topic: Resource | null;
    error: string;
  };
  broadcasts: Broadcast[];
  broadcastsError: string;
  deliveryConfigured: boolean;
  webhookConfigured: boolean;
  postalAddressConfigured: boolean;
};


type ApiResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  html?: string;
  subject?: string;
  processed?: number;
  succeeded?: number;
  failed?: number;
  remaining?: number;
  nextOffset?: number;
  details?: string[];
  broadcastId?: string;
  segment?: Resource;
  topic?: Resource;
};


const STORAGE_KEY =
  "venture-newsletter-draft-v1";


function formatDate(
  value: string | null
): string {
  if (!value) {
    return "Not yet";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
      timeZone:
        "America/Winnipeg"
    }
  ).format(date);
}


function readError(
  value: unknown
): string {
  if (
    value &&
    typeof value ===
      "object" &&
    "error" in value &&
    typeof value.error ===
      "string"
  ) {
    return value.error;
  }

  return "Venture could not complete that newsletter action.";
}


async function postJson(
  path: string,
  body?: unknown
): Promise<ApiResult> {
  const response =
    await fetch(
      path,
      {
        method:
          "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body:
          JSON.stringify(
            body ||
            {}
          )
      }
    );

  let data:
    unknown = {};

  try {
    data =
      await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      readError(data)
    );
  }

  return data as ApiResult;
}


export function NewsletterStudio({
  adminEmail,
  initialOverview
}: {
  adminEmail: string;
  initialOverview: Overview;
}) {
  const [draft, setDraft] =
    useState<VentureNewsletterDraft>(
      defaultVentureNewsletterDraft
    );

  const [testRecipient, setTestRecipient] =
    useState(
      adminEmail
    );

  const [testFirstName, setTestFirstName] =
    useState(
      "Prince"
    );

  const [resources, setResources] =
    useState(
      initialOverview.resources
    );

  const [syncOffset, setSyncOffset] =
    useState(0);

  const [busy, setBusy] =
    useState<
      "setup" |
      "sync" |
      "preview" |
      "test" |
      "broadcast" |
      ""
    >("");

  const [notice, setNotice] =
    useState<{
      tone:
        | "success"
        | "error"
        | "info";
      text: string;
    } | null>(null);

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          STORAGE_KEY
        );

      if (stored) {
        const parsed =
          JSON.parse(stored) as Partial<VentureNewsletterDraft>;

        setDraft({
          ...defaultVentureNewsletterDraft,
          ...parsed
        });
      }
    } catch {
      /* The default issue remains available. */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(draft)
      );
    } catch {
      /* Draft persistence is optional. */
    }
  }, [draft]);

  const readyForDraft =
    useMemo(
      () =>
        initialOverview.deliveryConfigured &&
        initialOverview.postalAddressConfigured &&
        Boolean(
          resources.segment &&
          resources.topic
        ),
      [
        initialOverview.deliveryConfigured,
        initialOverview.postalAddressConfigured,
        resources
      ]
    );

  function updateField(
    field: keyof VentureNewsletterDraft,
    value: string
  ) {
    setDraft(
      (current) => ({
        ...current,
        [field]:
          value
      })
    );
  }

  async function runAction({
    key,
    task
  }: {
    key:
      | "setup"
      | "sync"
      | "preview"
      | "test"
      | "broadcast";
    task: () => Promise<void>;
  }) {
    setBusy(key);
    setNotice(null);

    try {
      await task();
    } catch (error) {
      setNotice({
        tone:
          "error",
        text:
          error instanceof Error
            ? error.message
            : "Venture could not complete that action."
      });
    } finally {
      setBusy("");
    }
  }


  return (
    <>
      <section className={styles.readiness} aria-label="Newsletter readiness">
        <article className={initialOverview.deliveryConfigured ? styles.ready : styles.blocked}>
          <span>
            DELIVERY
          </span>

          <strong>
            {initialOverview.deliveryConfigured
              ? "Resend connected"
              : "Resend incomplete"}
          </strong>

          <p>
            Sender: venture@updates.boogiebangers.com
          </p>
        </article>

        <article className={resources.segment && resources.topic ? styles.ready : styles.warning}>
          <span>
            AUDIENCE
          </span>

          <strong>
            {resources.segment && resources.topic
              ? "Segment and topic ready"
              : "Setup required"}
          </strong>

          <p>
            {resources.segment?.name || "No segment"} · {resources.topic?.name || "No topic"}
          </p>
        </article>

        <article className={initialOverview.webhookConfigured ? styles.ready : styles.warning}>
          <span>
            DELIVERY SAFETY
          </span>

          <strong>
            {initialOverview.webhookConfigured
              ? "Webhook secret present"
              : "Webhook not connected"}
          </strong>

          <p>
            Bounces and complaints can automatically stop future delivery.
          </p>
        </article>

        <article className={initialOverview.postalAddressConfigured ? styles.ready : styles.blocked}>
          <span>
            FOOTER
          </span>

          <strong>
            {initialOverview.postalAddressConfigured
              ? "Mailing address present"
              : "Mailing address missing"}
          </strong>

          <p>
            Add VENTURE_POSTAL_ADDRESS before creating a public draft.
          </p>
        </article>
      </section>

      <section className={styles.commandBar}>
        <div>
          <span>
            CONFIRMED AUDIENCE
          </span>

          <strong>
            {initialOverview.activeSubscribers}
          </strong>

          <small>
            active subscriber{initialOverview.activeSubscribers === 1 ? "" : "s"}
          </small>
        </div>

        <button
          disabled={busy !== ""}
          onClick={() =>
            runAction({
              key:
                "setup",
              task:
                async () => {
                  const result =
                    await postJson(
                      "/api/admin/newsletter/setup"
                    );

                  setResources({
                    segment:
                      result.segment ||
                      null,
                    topic:
                      result.topic ||
                      null,
                    error:
                      ""
                  });

                  setNotice({
                    tone:
                      "success",
                    text:
                      "Resend segment and topic are ready."
                  });
                }
            })
          }
          type="button"
        >
          {busy === "setup"
            ? "Preparing…"
            : "Prepare Resend audience"}
        </button>

        <button
          disabled={busy !== "" || !resources.segment || !resources.topic}
          onClick={() =>
            runAction({
              key:
                "sync",
              task:
                async () => {
                  const result =
                    await postJson(
                      "/api/admin/newsletter/sync",
                      {
                        offset:
                          syncOffset
                      }
                    );

                  const remaining =
                    result.remaining ||
                    0;

                  setSyncOffset(
                    remaining > 0
                      ? result.nextOffset ||
                        syncOffset
                      : 0
                  );

                  setNotice({
                    tone:
                      result.failed
                        ? "info"
                        : "success",
                    text:
                      `Synced ${result.succeeded || 0} subscriber${result.succeeded === 1 ? "" : "s"}. ${result.failed || 0} failed.${remaining ? ` ${remaining} remain for the next batch.` : " Audience sync is complete."}`
                  });
                }
            })
          }
          type="button"
        >
          {busy === "sync"
            ? "Syncing…"
            : syncOffset > 0
              ? "Sync next batch"
              : "Sync active subscribers"}
        </button>
      </section>

      {notice ? (
        <div
          className={`${styles.notice} ${styles[notice.tone]}`}
          role="status"
        >
          {notice.text}
        </div>
      ) : null}

      {resources.error || initialOverview.subscriberError ? (
        <div className={`${styles.notice} ${styles.error}`}>
          {resources.error || initialOverview.subscriberError}
        </div>
      ) : null}

      <section className={styles.workspace}>
        <form
          className={styles.editor}
          onSubmit={(event) =>
            event.preventDefault()
          }
        >
          <div className={styles.sectionHeading}>
            <div>
              <span>
                ISSUE BUILDER
              </span>

              <h2>
                Draft the Thursday email
              </h2>
            </div>

            <button
              onClick={() => {
                setDraft(
                  defaultVentureNewsletterDraft
                );
                setNotice({
                  tone:
                    "info",
                  text:
                    "The first-issue starter copy has been restored."
                });
              }}
              type="button"
            >
              Reset starter
            </button>
          </div>

          <div className={styles.fieldGrid}>
            <label>
              <span>
                Issue label
              </span>

              <input
                onChange={(event) =>
                  updateField(
                    "issueLabel",
                    event.target.value
                  )
                }
                value={draft.issueLabel}
              />
            </label>

            <label>
              <span>
                Subject line
              </span>

              <input
                maxLength={140}
                onChange={(event) =>
                  updateField(
                    "subject",
                    event.target.value
                  )
                }
                value={draft.subject}
              />

              <small>
                {draft.subject.length}/140
              </small>
            </label>
          </div>

          <label>
            <span>
              Inbox preheader
            </span>

            <input
              onChange={(event) =>
                updateField(
                  "preheader",
                  event.target.value
                )
              }
              value={draft.preheader}
            />
          </label>

          <label>
            <span>
              Opening note
            </span>

            <textarea
              onChange={(event) =>
                updateField(
                  "intro",
                  event.target.value
                )
              }
              rows={4}
              value={draft.intro}
            />
          </label>

          <fieldset>
            <legend>
              Venture Pick
            </legend>

            <label>
              <span>
                Title
              </span>

              <input
                onChange={(event) =>
                  updateField(
                    "venturePickTitle",
                    event.target.value
                  )
                }
                value={draft.venturePickTitle}
              />
            </label>

            <label>
              <span>
                Description
              </span>

              <textarea
                onChange={(event) =>
                  updateField(
                    "venturePickBody",
                    event.target.value
                  )
                }
                rows={4}
                value={draft.venturePickBody}
              />
            </label>

            <label>
              <span>
                Venture link
              </span>

              <input
                onChange={(event) =>
                  updateField(
                    "venturePickUrl",
                    event.target.value
                  )
                }
                value={draft.venturePickUrl}
              />
            </label>
          </fieldset>

          <div className={styles.splitFields}>
            <fieldset>
              <legend>
                This weekend
              </legend>

              <label>
                <span>
                  Title
                </span>

                <input
                  onChange={(event) =>
                    updateField(
                      "weekendTitle",
                      event.target.value
                    )
                  }
                  value={draft.weekendTitle}
                />
              </label>

              <label>
                <span>
                  Description
                </span>

                <textarea
                  onChange={(event) =>
                    updateField(
                      "weekendBody",
                      event.target.value
                    )
                  }
                  rows={5}
                  value={draft.weekendBody}
                />
              </label>

              <label>
                <span>
                  Link
                </span>

                <input
                  onChange={(event) =>
                    updateField(
                      "weekendUrl",
                      event.target.value
                    )
                  }
                  value={draft.weekendUrl}
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>
                Affordable idea
              </legend>

              <label>
                <span>
                  Title
                </span>

                <input
                  onChange={(event) =>
                    updateField(
                      "budgetTitle",
                      event.target.value
                    )
                  }
                  value={draft.budgetTitle}
                />
              </label>

              <label>
                <span>
                  Description
                </span>

                <textarea
                  onChange={(event) =>
                    updateField(
                      "budgetBody",
                      event.target.value
                    )
                  }
                  rows={5}
                  value={draft.budgetBody}
                />
              </label>

              <label>
                <span>
                  Link
                </span>

                <input
                  onChange={(event) =>
                    updateField(
                      "budgetUrl",
                      event.target.value
                    )
                  }
                  value={draft.budgetUrl}
                />
              </label>
            </fieldset>
          </div>

          <label>
            <span>
              Closing note
            </span>

            <textarea
              onChange={(event) =>
                updateField(
                  "closingNote",
                  event.target.value
                )
              }
              rows={4}
              value={draft.closingNote}
            />
          </label>
        </form>

        <aside className={styles.actions}>
          <div className={styles.sectionHeading}>
            <div>
              <span>
                REVIEW DESK
              </span>

              <h2>
                Test before sending
              </h2>
            </div>
          </div>

          <button
            className={styles.previewButton}
            disabled={busy !== ""}
            onClick={() =>
              runAction({
                key:
                  "preview",
                task:
                  async () => {
                    const previewWindow =
                      window.open(
                        "about:blank",
                        "venture-newsletter-preview"
                      );

                    if (!previewWindow) {
                      throw new Error(
                        "Your browser blocked the preview window. Allow pop-ups for Venture and try again."
                      );
                    }

                    previewWindow.document.write(
                      "<p style='font-family:Arial;padding:24px'>Building Venture preview…</p>"
                    );

                    const result =
                      await postJson(
                        "/api/admin/newsletter/preview",
                        {
                          draft
                        }
                      );

                    previewWindow.document.open();
                    previewWindow.document.write(
                      result.html ||
                      ""
                    );
                    previewWindow.document.close();
                    previewWindow.document.title =
                      result.subject ||
                      "Venture newsletter preview";
                  }
              })
            }
            type="button"
          >
            {busy === "preview"
              ? "Building preview…"
              : "Open email preview"}
          </button>

          <div className={styles.testPanel}>
            <label>
              <span>
                Test recipient
              </span>

              <input
                onChange={(event) =>
                  setTestRecipient(
                    event.target.value
                  )
                }
                type="email"
                value={testRecipient}
              />
            </label>

            <label>
              <span>
                Preview first name
              </span>

              <input
                onChange={(event) =>
                  setTestFirstName(
                    event.target.value
                  )
                }
                value={testFirstName}
              />
            </label>

            <button
              disabled={busy !== "" || !initialOverview.deliveryConfigured}
              onClick={() =>
                runAction({
                  key:
                    "test",
                  task:
                    async () => {
                      const result =
                        await postJson(
                          "/api/admin/newsletter/test",
                          {
                            draft,
                            recipient:
                              testRecipient,
                            firstName:
                              testFirstName
                          }
                        );

                      setNotice({
                        tone:
                          "success",
                        text:
                          result.message ||
                          "Test email sent."
                      });
                    }
                })
              }
              type="button"
            >
              {busy === "test"
                ? "Sending test…"
                : "Send private test"}
            </button>
          </div>

          <div className={styles.productionPanel}>
            <span>
              PRODUCTION HANDOFF
            </span>

            <h3>
              Create a Resend draft
            </h3>

            <p>
              This never sends immediately. It creates a draft in Resend for a final audience, topic, link, and footer review.
            </p>

            <button
              className={styles.broadcastButton}
              disabled={busy !== "" || !readyForDraft}
              onClick={() =>
                runAction({
                  key:
                    "broadcast",
                  task:
                    async () => {
                      const result =
                        await postJson(
                          "/api/admin/newsletter/broadcasts",
                          {
                            draft
                          }
                        );

                      setNotice({
                        tone:
                          "success",
                        text:
                          `${result.message || "Resend draft created."} Broadcast ID: ${result.broadcastId || "available in Resend"}.`
                      });
                    }
                })
              }
              type="button"
            >
              {busy === "broadcast"
                ? "Creating draft…"
                : "Create Resend draft"}
            </button>

            {!readyForDraft ? (
              <small>
                Complete the red and yellow readiness cards first.
              </small>
            ) : null}
          </div>
        </aside>
      </section>

      <section className={styles.history}>
        <div className={styles.sectionHeading}>
          <div>
            <span>
              RESEND HISTORY
            </span>

            <h2>
              Recent campaign drafts and sends
            </h2>
          </div>
        </div>

        {initialOverview.broadcastsError ? (
          <div className={`${styles.notice} ${styles.error}`}>
            {initialOverview.broadcastsError}
          </div>
        ) : initialOverview.broadcasts.length === 0 ? (
          <p className={styles.emptyHistory}>
            No Resend broadcasts yet. Your first draft will appear here after reloading the page.
          </p>
        ) : (
          <div className={styles.broadcastList}>
            {initialOverview.broadcasts.map(
              (broadcast) => (
                <article key={broadcast.id}>
                  <div>
                    <span className={styles.broadcastStatus}>
                      {broadcast.status}
                    </span>

                    <h3>
                      {broadcast.name || broadcast.subject}
                    </h3>

                    <p>
                      {broadcast.subject}
                    </p>
                  </div>

                  <dl>
                    <div>
                      <dt>
                        Created
                      </dt>

                      <dd>
                        {formatDate(
                          broadcast.createdAt
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Scheduled
                      </dt>

                      <dd>
                        {formatDate(
                          broadcast.scheduledAt
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Sent
                      </dt>

                      <dd>
                        {formatDate(
                          broadcast.sentAt
                        )}
                      </dd>
                    </div>
                  </dl>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </>
  );
}
