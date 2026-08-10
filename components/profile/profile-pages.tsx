"use client";

import Link from "next/link";
import {
  useRouter
} from "next/navigation";
import {
  FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  AccountSyncCard
} from "@/components/account-sync/account-sync";
import {
  VisitHistoryDashboard
} from "@/components/visit-history-dashboard";
import {
  ProfileAvatarEditor
} from "@/components/profile/profile-avatar-editor";
import {
  useProfileData
} from "@/components/profile/use-profile-data";

import {
  ACCESSIBILITY_OPTIONS,
  CUISINE_OPTIONS,
  DIETARY_OPTIONS,
  INTEREST_OPTIONS,
  OUTING_STYLE_OPTIONS,
  cleanUsername,
  dispatchProfileChanged,
  profileInitials,
  type VentureNotificationPreferences,
  type VentureProfile,
  type VentureUserPreferences
} from "@/lib/profile-system";

import {
  getSavedListingReferences
} from "@/lib/saved-listings";
import {
  getSavedOutings
} from "@/lib/saved-outings";
import {
  loadPreferences,
  savePreferences
} from "@/lib/profile-preferences";
import {
  getSupabaseBrowserClient
} from "@/lib/supabase/client";
import {
  getVisitHistory
} from "@/lib/visit-history";
import {
  WINNIPEG_NEIGHBOURHOODS
} from "@/lib/winnipeg-neighbourhoods";

import styles from "@/app/profile/profile-system.module.css";

type ChoiceField =
  | "interests"
  | "cuisines"
  | "dietaryNeeds"
  | "accessibilityNeeds"
  | "preferredNeighbourhoods"
  | "outingStyles";

function LoadingProfile() {
  return (
    <section className={styles.stateCard} aria-busy="true">
      <span className={styles.loadingMark} aria-hidden="true" />
      <h1>Opening your Venture profile</h1>
      <p>Pulling your private preferences and account details together.</p>
    </section>
  );
}

function ErrorProfile({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className={styles.stateCard}>
      <span className={styles.errorMark} aria-hidden="true">!</span>
      <h1>Profile needs another try</h1>
      <p>{message}</p>
      <button type="button" className={styles.primaryButton} onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}

function GuestProfile() {
  return (
    <>
      <section className={styles.guestHero}>
        <span>PRIVATE WHEN YOU WANT IT</span>
        <h1>Use Venture freely. Connect an account when it becomes useful.</h1>
        <p>
          Guest browsing stays open. Signing in adds cross-device saves,
          private preferences, outing history, and account controls.
        </p>
        <Link className={styles.primaryButton} href="/sign-in?next=/profile/onboarding">
          Create or connect profile
        </Link>
      </section>
      <AccountSyncCard />
    </>
  );
}

function ProfileAvatar({
  profile,
  email,
  size = "large"
}: {
  profile: VentureProfile;
  email: string;
  size?: "small" | "large";
}) {
  return (
    <div className={size === "large" ? styles.avatarLarge : styles.avatarSmall}>
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt="" />
      ) : (
        <span aria-hidden="true">
          {profileInitials(profile.displayName, email)}
        </span>
      )}
    </div>
  );
}

function ProfilePageHeader({
  eyebrow,
  title,
  description,
  backHref = "/profile"
}: {
  eyebrow: string;
  title: string;
  description: string;
  backHref?: string;
}) {
  return (
    <header className={styles.pageHeader}>
      <Link href={backHref} className={styles.backLink} aria-label="Back to profile">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m14.5 5-7 7 7 7" />
        </svg>
      </Link>
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}

function OptionChips({
  options,
  selected,
  onToggle
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className={styles.chips}>
      {options.map((option) => {
        const active = selected.includes(option);

        return (
          <button
            key={option}
            type="button"
            className={active ? styles.chipActive : styles.chip}
            aria-pressed={active}
            onClick={() => onToggle(option)}
          >
            {active ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12.5 4 4L19 6.5" />
              </svg>
            ) : null}
            {option}
          </button>
        );
      })}
    </div>
  );
}

function toggleArray(
  values: string[],
  value: string
) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function writeLegacyProfilePreferences({
  displayName,
  preferences
}: {
  displayName: string;
  preferences: VentureUserPreferences;
}) {
  const current = loadPreferences();

  savePreferences({
    ...current,
    displayName: displayName.trim() || "Guest",
    interests: preferences.interests,
    neighbourhoods: preferences.preferredNeighbourhoods,
    outingStyles: preferences.outingStyles,
    budget: preferences.defaultBudget,
    alcoholFree: preferences.alcoholFree,
    updatedAt: new Date().toISOString()
  });
}

export function ProfileDashboard() {
  const {
    state,
    payload,
    error,
    refresh
  } = useProfileData();
  const [counts, setCounts] = useState({
    listings: 0,
    outings: 0,
    visits: 0
  });

  useEffect(() => {
    setCounts({
      listings: getSavedListingReferences().length,
      outings: getSavedOutings().length,
      visits: getVisitHistory().length
    });
  }, []);

  if (state === "loading") {
    return <LoadingProfile />;
  }

  if (state === "error") {
    return <ErrorProfile message={error} onRetry={() => void refresh()} />;
  }

  if (state === "guest" || !payload.user) {
    return <GuestProfile />;
  }

  const { profile, notifications, user } = payload;

  return (
    <>
      <section className={styles.profileHero}>
        <ProfileAvatar profile={profile} email={user.email} />
        <div className={styles.heroCopy}>
          <span>YOUR VENTURE</span>
          <h1>{profile.displayName}</h1>
          <p>
            {profile.username ? `@${profile.username} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ` : ""}
            {profile.homeNeighbourhood
              ? `${profile.homeNeighbourhood}, Winnipeg`
              : "Winnipeg"}
          </p>
          {profile.bio ? <small>{profile.bio}</small> : null}
        </div>
        <Link className={styles.editButton} href="/profile/edit">
          Edit profile
        </Link>
      </section>

      {!profile.onboardingCompleted ? (
        <Link className={styles.onboardingBanner} href="/profile/onboarding">
          <span>
            <strong>Finish your Venture setup</strong>
            <small>Give recommendations a better starting point.</small>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </Link>
      ) : null}

      <section className={styles.statsGrid} aria-label="Your Venture activity">
        <article>
          <strong>{counts.listings}</strong>
          <span>Saved places + events</span>
        </article>
        <article>
          <strong>{counts.outings}</strong>
          <span>Saved outings</span>
        </article>
        <article>
          <strong>{counts.visits}</strong>
          <span>Logged visits</span>
        </article>
        <article>
          <strong>{notifications.newsletterActive ? "ON" : "OFF"}</strong>
          <span>Thursday Venture</span>
        </article>
      </section>

      <section className={styles.profileMenu}>
        <Link href="/profile/preferences">
          <span className={styles.menuIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6" /></svg>
          </span>
          <span><strong>Your preferences</strong><small>Interests, budget, transport, and practical needs</small></span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </Link>
        <Link href="/saved">
          <span className={styles.menuIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M20.5 8.5c0 5.4-8.5 11-8.5 11s-8.5-5.6-8.5-11A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.5 2.5Z" /></svg>
          </span>
          <span><strong>Saved and outing history</strong><small>Return to the plans and places you kept</small></span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </Link>
        <Link href="/profile/settings">
          <span className={styles.menuIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>
          </span>
          <span><strong>Account and privacy</strong><small>Email, newsletter, data export, and deletion</small></span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </Link>
      </section>

      <AccountSyncCard />
      <VisitHistoryDashboard />
    </>
  );
}

export function ProfileEditor() {
  const {
    state,
    payload,
    error,
    refresh,
    update
  } = useProfileData();
  const [form, setForm] = useState<VentureProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    username?: string;
  }>({});

  useEffect(() => {
    if (state === "ready") {
      setForm(payload.profile);
    }
  }, [payload.profile, state]);

  if (state === "loading" || !form && state === "ready") {
    return <LoadingProfile />;
  }

  if (state === "error") {
    return <ErrorProfile message={error} onRetry={() => void refresh()} />;
  }

  if (state === "guest" || !payload.user || !form) {
    return <GuestProfile />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

    const cleanedUsername = cleanUsername(form.username);
    const nextErrors: {
      displayName?: string;
      username?: string;
    } = {};

    if (!form.displayName.trim()) {
      nextErrors.displayName = "Add a display name before saving.";
    }

    if (cleanedUsername && cleanedUsername.length < 3) {
      nextErrors.username = "Use at least three letters, numbers, or underscores.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setMessage("Fix the highlighted profile fields.");
      return;
    }

    setFieldErrors({});
    setSaving(true);
    setMessage("");

    try {
      const result = await update({
        profile: {
          ...form,
          username: cleanedUsername
        }
      });
      setForm(result.profile);
      writeLegacyProfilePreferences({
        displayName: result.profile.displayName,
        preferences: result.preferences
      });
      setMessage("Profile saved.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not save the profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ProfilePageHeader
        eyebrow="PROFILE DETAILS"
        title="Make Venture feel like yours."
        description="These details stay private in Profile V1.0."
      />

      <ProfileAvatarEditor
        userId={payload.user.id}
        email={payload.user.email}
        profile={form}
        onChanged={refresh}
      />

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <label>
          Display name
          <input
            value={form.displayName}
            maxLength={60}
            aria-invalid={Boolean(fieldErrors.displayName)}
            aria-describedby={fieldErrors.displayName ? "profile-display-name-error" : undefined}
            onChange={(event) => {
              setForm({ ...form, displayName: event.target.value });
              setFieldErrors((current) => ({ ...current, displayName: undefined }));
            }}
          />
          {fieldErrors.displayName ? (
            <small id="profile-display-name-error" className={styles.fieldError}>
              {fieldErrors.displayName}
            </small>
          ) : null}
        </label>

        <label>
          Username <small>Optional, reserved for future shared collections</small>
          <div className={styles.usernameField}>
            <span>@</span>
            <input
              value={form.username}
              maxLength={24}
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? "profile-username-error" : undefined}
              onChange={(event) => {
                setForm({ ...form, username: cleanUsername(event.target.value) });
                setFieldErrors((current) => ({ ...current, username: undefined }));
              }}
            />
          </div>
          {fieldErrors.username ? (
            <small id="profile-username-error" className={styles.fieldError}>
              {fieldErrors.username}
            </small>
          ) : null}
        </label>

        <label>
          Short bio <small>{form.bio.length}/180</small>
          <textarea
            value={form.bio}
            maxLength={180}
            rows={4}
            placeholder="What kind of Winnipeg adventures do you enjoy?"
            onChange={(event) => setForm({ ...form, bio: event.target.value })}
          />
        </label>

        <label>
          Home neighbourhood
          <select
            value={form.homeNeighbourhood}
            onChange={(event) => setForm({ ...form, homeNeighbourhood: event.target.value })}
          >
            <option value="">Anywhere in Winnipeg</option>
            {WINNIPEG_NEIGHBOURHOODS.map((neighbourhood) => (
              <option key={neighbourhood} value={neighbourhood}>{neighbourhood}</option>
            ))}
          </select>
        </label>

        <div className={styles.privacyBox}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          <span><strong>Private profile</strong><small>Your bio, preferences, saves, and history are not shown to other users.</small></span>
        </div>

        <button type="submit" className={styles.primaryButton} disabled={saving}>
          {saving ? "SavingÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦" : "Save profile"}
        </button>

        {message ? <p className={styles.formMessage} role="status">{message}</p> : null}
      </form>
    </>
  );
}

export function ProfilePreferencesEditor() {
  const {
    state,
    payload,
    error,
    refresh,
    update
  } = useProfileData();
  const [form, setForm] = useState<VentureUserPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (state === "ready") {
      setForm(payload.preferences);
    }
  }, [payload.preferences, state]);

  if (state === "loading" || !form && state === "ready") {
    return <LoadingProfile />;
  }

  if (state === "error") {
    return <ErrorProfile message={error} onRetry={() => void refresh()} />;
  }

  if (state === "guest" || !form) {
    return <GuestProfile />;
  }

  function toggle(field: ChoiceField, value: string) {
    setForm((current) => current
      ? { ...current, [field]: toggleArray(current[field], value) }
      : current
    );
    setMessage("");
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    if (!form) {
      return;
    }

    try {
      const result = await update({ preferences: form });
      setForm(result.preferences);
      writeLegacyProfilePreferences({
        displayName: result.profile.displayName,
        preferences: result.preferences
      });
      setMessage("Preferences saved and ready for recommendations.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not save these preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ProfilePageHeader
        eyebrow="PERSONALIZATION"
        title="Tune the compass, not the whole city."
        description="These choices influence ranking and defaults without hiding everything else."
      />

      <section className={styles.formCard}>
        <PreferenceSection title="Interests" description="What do you usually want Venture to surface first?">
          <OptionChips options={INTEREST_OPTIONS} selected={form.interests} onToggle={(value) => toggle("interests", value)} />
        </PreferenceSection>

        <PreferenceSection title="Cuisines" description="Helpful for food picks and mixed outing routes.">
          <OptionChips options={CUISINE_OPTIONS} selected={form.cuisines} onToggle={(value) => toggle("cuisines", value)} />
        </PreferenceSection>

        <PreferenceSection title="Dietary needs" description="Only choose needs that should affect recommendations.">
          <OptionChips options={DIETARY_OPTIONS} selected={form.dietaryNeeds} onToggle={(value) => toggle("dietaryNeeds", value)} />
        </PreferenceSection>

        <PreferenceSection title="Accessibility" description="Venture will prioritize listings with matching confirmed details.">
          <OptionChips options={ACCESSIBILITY_OPTIONS} selected={form.accessibilityNeeds} onToggle={(value) => toggle("accessibilityNeeds", value)} />
        </PreferenceSection>

        <PreferenceSection title="Outing styles" description="The kinds of plans you make most often.">
          <OptionChips options={OUTING_STYLE_OPTIONS} selected={form.outingStyles} onToggle={(value) => toggle("outingStyles", value)} />
        </PreferenceSection>

        <label>
          Preferred neighbourhoods
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) {
                toggle("preferredNeighbourhoods", event.target.value);
              }
            }}
          >
            <option value="">Add a neighbourhood</option>
            {WINNIPEG_NEIGHBOURHOODS.filter((item) => !form.preferredNeighbourhoods.includes(item)).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        {form.preferredNeighbourhoods.length > 0 ? (
          <OptionChips options={form.preferredNeighbourhoods} selected={form.preferredNeighbourhoods} onToggle={(value) => toggle("preferredNeighbourhoods", value)} />
        ) : null}

        <div className={styles.twoColumnFields}>
          <label>
            Usual budget
            <select value={form.defaultBudget} onChange={(event) => setForm({ ...form, defaultBudget: event.target.value as VentureUserPreferences["defaultBudget"] })}>
              <option value="free">Free first</option>
              <option value="under-40">Usually under $40</option>
              <option value="under-80">Usually under $80 for two</option>
              <option value="flexible">Flexible</option>
            </select>
          </label>
          <label>
            Usual transport
            <select value={form.defaultTransport} onChange={(event) => setForm({ ...form, defaultTransport: event.target.value as VentureUserPreferences["defaultTransport"] })}>
              <option value="any">Any</option>
              <option value="walk">Walk</option>
              <option value="transit">Transit</option>
              <option value="bike">Bike</option>
              <option value="drive">Drive</option>
              <option value="rideshare">Rideshare</option>
            </select>
          </label>
        </div>

        <label>
          Typical group size
          <input type="number" min={1} max={20} value={form.defaultGroupSize} onChange={(event) => setForm({ ...form, defaultGroupSize: Math.max(1, Math.min(20, Number(event.target.value) || 1)) })} />
        </label>

        <ToggleRow label="Prefer alcohol-free options" description="Prioritize plans that do not depend on drinking." checked={form.alcoholFree} onChange={(checked) => setForm({ ...form, alcoholFree: checked })} />
        <ToggleRow label="Free events" description="Give free activities a little more weight." checked={form.likesFreeEvents} onChange={(checked) => setForm({ ...form, likesFreeEvents: checked })} />
        <ToggleRow label="Nightlife" description="Include later hours, bars, and dance options." checked={form.likesNightlife} onChange={(checked) => setForm({ ...form, likesNightlife: checked })} />
        <ToggleRow label="Outdoor plans" description="Surface parks, walks, markets, and seasonal activities." checked={form.likesOutdoors} onChange={(checked) => setForm({ ...form, likesOutdoors: checked })} />
        <ToggleRow label="Date ideas" description="Prioritize places and combinations suited to dates." checked={form.likesDateIdeas} onChange={(checked) => setForm({ ...form, likesDateIdeas: checked })} />

        <button type="button" className={styles.primaryButton} disabled={saving} onClick={handleSave}>
          {saving ? "SavingÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦" : "Save preferences"}
        </button>
        {message ? <p className={styles.formMessage} role="status">{message}</p> : null}
      </section>
    </>
  );
}

function PreferenceSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={styles.preferenceSection}>
      <legend>{title}</legend>
      <p>{description}</p>
      {children}
    </fieldset>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span><strong>{label}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function ProfileSettings() {
  const router = useRouter();
  const {
    state,
    payload,
    error,
    refresh,
    update
  } = useProfileData();
  const [notifications, setNotifications] = useState<VentureNotificationPreferences | null>(null);
  const [email, setEmail] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (state === "ready" && payload.user) {
      setNotifications(payload.notifications);
      setEmail(payload.user.email);
    }
  }, [payload.notifications, payload.user, state]);

  if (state === "loading" || !notifications && state === "ready") {
    return <LoadingProfile />;
  }

  if (state === "error") {
    return <ErrorProfile message={error} onRetry={() => void refresh()} />;
  }

  if (state === "guest" || !payload.user || !notifications) {
    return <GuestProfile />;
  }

  async function saveNotifications() {
    setWorking("notifications");
    setMessage("");
    if (!notifications) {
      return;
    }

    try {
      const result = await update({ notifications });
      setNotifications(result.notifications);
      setMessage("Notification preferences saved.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not save notification settings.");
    } finally {
      setWorking("");
    }
  }

  async function updateEmail() {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail.includes("@")) {
      setMessage("Enter a valid email address.");
      return;
    }

    setWorking("email");
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const result = await supabase.auth.updateUser({ email: nextEmail });
      if (result.error) {
        throw result.error;
      }
      setMessage("Check both inboxes if Supabase asks you to confirm the email change.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not start the email change.");
    } finally {
      setWorking("");
    }
  }

  async function joinNewsletter() {
    setWorking("newsletter");
    setMessage("");
    const newsletterEmail = payload.user?.email;

    if (!newsletterEmail) {
      return;
    }

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: payload.profile.displayName.split(/\s+/)[0] || "Venture reader",
          email: newsletterEmail,
          consent: true,
          source: "profile-settings",
          website: ""
        })
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Venture could not start newsletter confirmation.");
      }
      setMessage(result.message || "Check your inbox to confirm.");
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not update the newsletter.");
    } finally {
      setWorking("");
    }
  }

  async function leaveNewsletter() {
    setWorking("newsletter");
    setMessage("");
    try {
      const response = await fetch("/api/profile/newsletter", { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Venture could not unsubscribe this account.");
      }
      setMessage("You are unsubscribed from The Thursday Venture.");
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not update the newsletter.");
    } finally {
      setWorking("");
    }
  }

  async function signOutEverywhere() {
    setWorking("signout");
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const result = await supabase.auth.signOut({ scope: "global" });
      if (result.error) {
        throw result.error;
      }
      dispatchProfileChanged();
      router.push("/");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not sign out every session.");
      setWorking("");
    }
  }

  async function deleteAccount() {
    setWorking("delete");
    setMessage("");
    try {
      const response = await fetch("/api/profile/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteText })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Venture could not delete the account.");
      }
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "local" });
      window.localStorage.clear();
      router.push("/?account=deleted");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not delete the account.");
      setWorking("");
    }
  }

  const newsletterAction = notifications.newsletterStatus === "active"
    ? { label: "Unsubscribe", action: leaveNewsletter }
    : notifications.newsletterStatus === "pending"
      ? { label: "Resend confirmation", action: joinNewsletter }
      : { label: "Join The Thursday Venture", action: joinNewsletter };

  return (
    <>
      <ProfilePageHeader
        eyebrow="ACCOUNT + PRIVACY"
        title="Your account, under your control."
        description="Venture keeps profile details private and gives you direct export and deletion controls."
      />

      <section className={styles.settingsCard}>
        <span className={styles.sectionEyebrow}>EMAIL ACCOUNT</span>
        <h2>Sign-in email</h2>
        <label>
          Email address
          <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
        </label>
        <button type="button" className={styles.secondaryButton} disabled={working === "email"} onClick={updateEmail}>
          {working === "email" ? "Starting changeÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦" : "Change email"}
        </button>
      </section>

      <section className={styles.settingsCard}>
        <span className={styles.sectionEyebrow}>NOTIFICATIONS</span>
        <h2>Useful nudges only</h2>
        <ToggleRow label="Weekend digest" description="A compact in-app weekend roundup when available." checked={notifications.weekendDigest} onChange={(checked) => setNotifications({ ...notifications, weekendDigest: checked })} />
        <ToggleRow label="Saved event reminders" description="Remind you before events you deliberately saved." checked={notifications.savedEventReminders} onChange={(checked) => setNotifications({ ...notifications, savedEventReminders: checked })} />
        <ToggleRow label="Outing reminders" description="A reminder before a saved outing starts." checked={notifications.outingReminders} onChange={(checked) => setNotifications({ ...notifications, outingReminders: checked })} />
        <ToggleRow label="Product updates" description="Occasional changes to Venture itself." checked={notifications.productUpdates} onChange={(checked) => setNotifications({ ...notifications, productUpdates: checked })} />
        <button type="button" className={styles.primaryButton} disabled={working === "notifications"} onClick={saveNotifications}>
          {working === "notifications" ? "SavingÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦" : "Save notifications"}
        </button>
      </section>

      <section className={styles.settingsCard}>
        <span className={styles.sectionEyebrow}>NEWSLETTER</span>
        <h2>The Thursday Venture</h2>
        <p>Status: <strong>{notifications.newsletterStatus.replace("-", " ")}</strong></p>
        <button type="button" className={notifications.newsletterActive ? styles.secondaryButton : styles.primaryButton} disabled={working === "newsletter"} onClick={newsletterAction.action}>
          {working === "newsletter" ? "UpdatingÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦" : newsletterAction.label}
        </button>
      </section>

      <section className={styles.settingsCard}>
        <span className={styles.sectionEyebrow}>YOUR DATA</span>
        <h2>Export or sign out</h2>
        <a className={styles.secondaryButton} href="/api/profile/export">Download my Venture data</a>
        <button type="button" className={styles.secondaryButton} disabled={working === "signout"} onClick={signOutEverywhere}>
          {working === "signout" ? "Signing outÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦" : "Sign out on every device"}
        </button>
      </section>

      <section className={styles.dangerCard}>
        <span className={styles.sectionEyebrow}>DANGER ZONE</span>
        <h2>Delete Venture account</h2>
        <p>
          This permanently deletes your profile, preferences, synced saves,
          outings, visit history, and avatar. Newsletter delivery is stopped.
        </p>
        <label>
          Type DELETE
          <input value={deleteText} autoComplete="off" onChange={(event) => setDeleteText(event.target.value)} />
        </label>
        <button type="button" className={styles.dangerButton} disabled={working === "delete" || deleteText !== "DELETE"} onClick={deleteAccount}>
          {working === "delete" ? "Deleting safelyÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦" : "Delete account permanently"}
        </button>
      </section>

      {message ? <p className={styles.globalMessage} role="status">{message}</p> : null}
    </>
  );
}

export function ProfileOnboarding() {
  const router = useRouter();
  const {
    state,
    payload,
    error,
    refresh,
    update
  } = useProfileData();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<VentureProfile | null>(null);
  const [preferences, setPreferences] = useState<VentureUserPreferences | null>(null);
  const [notifications, setNotifications] = useState<VentureNotificationPreferences | null>(null);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (state === "ready") {
      setProfile(payload.profile);
      setPreferences(payload.preferences);
      setNotifications(payload.notifications);
    }
  }, [payload, state]);

  const progress = useMemo(() => `${step} of 4`, [step]);

  if (state === "loading" || state === "ready" && (!profile || !preferences || !notifications)) {
    return <LoadingProfile />;
  }

  if (state === "error") {
    return <ErrorProfile message={error} onRetry={() => void refresh()} />;
  }

  if (state === "guest" || !payload.user || !profile || !preferences || !notifications) {
    return <GuestProfile />;
  }

  function togglePreference(field: ChoiceField, value: string) {
    setPreferences((current) => current
      ? { ...current, [field]: toggleArray(current[field], value) }
      : current
    );
  }

  async function finish(skip = false) {
    setSaving(true);
    setMessage("");

    if (!payload.user || !profile || !preferences || !notifications) {
      setMessage("Your profile data is still loading. Please try again.");
      setSaving(false);
      return;
    }

    const currentUser = payload.user;
    const currentProfile = profile;
    const currentPreferences = preferences;
    const currentNotifications = notifications;

    try {
      const updated = await update({
        profile: {
          ...currentProfile,
          displayName: currentProfile.displayName.trim() || "Venture explorer",
          onboardingCompleted: true
        },
        preferences: currentPreferences,
        notifications: currentNotifications
      });

      writeLegacyProfilePreferences({
        displayName: updated.profile.displayName,
        preferences: updated.preferences
      });

      if (newsletterOptIn && !currentNotifications.newsletterActive) {
        const response = await fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: currentProfile.displayName.split(/\s+/)[0] || "Venture reader",
            email: currentUser.email,
            consent: true,
            source: skip ? "profile-onboarding-skip" : "profile-onboarding",
            website: ""
          })
        });

        if (!response.ok) {
          const result = await response.json() as { error?: string };
          throw new Error(
            result.error ||
              "Your profile is saved, but the newsletter confirmation needs another try."
          );
        }
      }

      router.push("/profile?onboarding=complete");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not finish profile setup.");
      setSaving(false);
    }
  }

  return (
    <section className={styles.onboardingShell}>
      <header className={styles.onboardingHeader}>
        <div>
          <span>PROFILE SETUP ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {progress}</span>
          <h1>
            {step === 1 ? "Start with the basics." :
             step === 2 ? "What pulls you out of the house?" :
             step === 3 ? "Set practical defaults." :
             "Choose what Venture can send."}
          </h1>
        </div>
        <div className={styles.progressTrack} aria-label={`Step ${step} of 4`}>
          <i style={{ width: `${step * 25}%` }} />
        </div>
      </header>

      <div className={styles.onboardingCard}>
        {step === 1 ? (
          <>
            <label>Display name<input value={profile.displayName} maxLength={60} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} /></label>
            <label>Home neighbourhood<select value={profile.homeNeighbourhood} onChange={(event) => setProfile({ ...profile, homeNeighbourhood: event.target.value })}><option value="">Anywhere in Winnipeg</option>{WINNIPEG_NEIGHBOURHOODS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>Short bio<textarea value={profile.bio} maxLength={180} rows={4} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <PreferenceSection title="Interests" description="Choose as many or as few as you like."><OptionChips options={INTEREST_OPTIONS} selected={preferences.interests} onToggle={(value) => togglePreference("interests", value)} /></PreferenceSection>
            <PreferenceSection title="Outing styles" description="What kind of plans should feel easy to start?"><OptionChips options={OUTING_STYLE_OPTIONS} selected={preferences.outingStyles} onToggle={(value) => togglePreference("outingStyles", value)} /></PreferenceSection>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className={styles.twoColumnFields}>
              <label>Usual budget<select value={preferences.defaultBudget} onChange={(event) => setPreferences({ ...preferences, defaultBudget: event.target.value as VentureUserPreferences["defaultBudget"] })}><option value="free">Free first</option><option value="under-40">Under $40</option><option value="under-80">Under $80 for two</option><option value="flexible">Flexible</option></select></label>
              <label>Transport<select value={preferences.defaultTransport} onChange={(event) => setPreferences({ ...preferences, defaultTransport: event.target.value as VentureUserPreferences["defaultTransport"] })}><option value="any">Any</option><option value="walk">Walk</option><option value="transit">Transit</option><option value="bike">Bike</option><option value="drive">Drive</option><option value="rideshare">Rideshare</option></select></label>
            </div>
            <label>Typical group size<input type="number" min={1} max={20} value={preferences.defaultGroupSize} onChange={(event) => setPreferences({ ...preferences, defaultGroupSize: Math.max(1, Math.min(20, Number(event.target.value) || 1)) })} /></label>
            <PreferenceSection title="Dietary needs" description="Only choices that should influence results."><OptionChips options={DIETARY_OPTIONS} selected={preferences.dietaryNeeds} onToggle={(value) => togglePreference("dietaryNeeds", value)} /></PreferenceSection>
            <PreferenceSection title="Accessibility" description="Venture will favor listings with confirmed matching details."><OptionChips options={ACCESSIBILITY_OPTIONS} selected={preferences.accessibilityNeeds} onToggle={(value) => togglePreference("accessibilityNeeds", value)} /></PreferenceSection>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <ToggleRow label="Weekend digest" description="An in-app summary of useful weekend ideas." checked={notifications.weekendDigest} onChange={(checked) => setNotifications({ ...notifications, weekendDigest: checked })} />
            <ToggleRow label="Saved event reminders" description="Only for events you deliberately save." checked={notifications.savedEventReminders} onChange={(checked) => setNotifications({ ...notifications, savedEventReminders: checked })} />
            <ToggleRow label="Outing reminders" description="A useful nudge before a saved plan begins." checked={notifications.outingReminders} onChange={(checked) => setNotifications({ ...notifications, outingReminders: checked })} />
            <ToggleRow label="The Thursday Venture" description="A confirmed email newsletter with Winnipeg picks and an unsubscribe link." checked={newsletterOptIn || notifications.newsletterActive} onChange={(checked) => setNewsletterOptIn(checked)} />
            <p className={styles.consentNote}>Selecting the newsletter asks Venture to send a confirmation email. You are not subscribed until you confirm it.</p>
          </>
        ) : null}
      </div>

      <footer className={styles.onboardingFooter}>
        {step > 1 ? <button type="button" className={styles.textButton} onClick={() => setStep(step - 1)}>Back</button> : <button type="button" className={styles.textButton} disabled={saving} onClick={() => void finish(true)}>Skip for now</button>}
        {step < 4 ? <button type="button" className={styles.primaryButton} onClick={() => setStep(step + 1)}>Continue</button> : <button type="button" className={styles.primaryButton} disabled={saving} onClick={() => void finish(false)}>{saving ? "Saving profileÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦" : "Finish setup"}</button>}
      </footer>

      {message ? <p className={styles.globalMessage} role="status">{message}</p> : null}
    </section>
  );
}
