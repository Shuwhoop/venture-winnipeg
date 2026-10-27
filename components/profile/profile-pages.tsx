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
  getSavedListingReferences,
  SAVED_LISTINGS_EVENT
} from "@/lib/saved-listings";
import {
  getSavedOutings,
  SAVED_OUTINGS_EVENT
} from "@/lib/saved-outings";
import {
  loadPreferences,
  savePreferences
} from "@/lib/profile-preferences";
import {
  getSupabaseBrowserClient
} from "@/lib/supabase/client";
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
  const [preferences, setPreferences] = useState(loadPreferences);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [counts, setCounts] = useState({ listings: 0, outings: 0 });
  useEffect(() => {
    const refresh = () => setCounts({
      listings: getSavedListingReferences().length,
      outings: getSavedOutings().length
    });
    refresh();
    window.addEventListener(SAVED_LISTINGS_EVENT, refresh);
    window.addEventListener(SAVED_OUTINGS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SAVED_LISTINGS_EVENT, refresh);
      window.removeEventListener(SAVED_OUTINGS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  function saveGuestPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const next = { ...preferences, updatedAt: new Date().toISOString() };
      savePreferences(next);
      setPreferences(next);
      setSaved(true);
      setMessage("Preferences saved on this device. Your next outing will start with these choices.");
    } catch {
      setMessage("Your browser could not save these choices. You can still choose them in the outing builder.");
    }
  }
  return (
    <div className={styles.guestDashboard}>
      <section className={styles.guestHero}>
        <span>MY VENTURE · GUEST</span>
        <h1>Your city, your way.</h1>
        <p>Keep your favourites and shape your next outing. An account is optional.</p>
        <div className={styles.guestActions}>
          <Link className={styles.primaryButton} href="/saved">
            My saves · {counts.listings + counts.outings}
          </Link>
          <Link className={styles.secondaryButton} href="/build-outing">Build an outing</Link>
        </div>
        <small>Saves and preferences stay in this browser until you connect an account.</small>
      </section>
      <form className={styles.formCard} onSubmit={saveGuestPreferences} onChange={() => { setSaved(false); setMessage(""); }}>
        <div><span className={styles.sectionEyebrow}>YOUR STARTING POINT</span>
          <h2>Make the next plan feel like you</h2>
          <p>These are defaults. You can change every choice when you build.</p>
        </div>
        <label className={styles.guestField}>What should we call you?
          <input value={preferences.displayName === "Guest" ? "" : preferences.displayName}
            maxLength={60} autoComplete="given-name" placeholder="Your first name (optional)"
            onChange={(event) => setPreferences({ ...preferences, displayName: event.target.value })} />
        </label>
        <fieldset className={styles.guestFieldset}><legend>Your interests</legend>
          <OptionChips options={INTEREST_OPTIONS} selected={preferences.interests}
            onToggle={(value) => { setSaved(false); setMessage(""); setPreferences({ ...preferences, interests: toggleArray(preferences.interests, value) }); }} />
        </fieldset>
        <label className={styles.guestField}>Default budget per person
          <select value={preferences.budget} onChange={(event) => setPreferences({
            ...preferences, budget: event.target.value as typeof preferences.budget
          })}>
            <option value="free">Free</option><option value="under-40">Under $40</option>
            <option value="under-80">Under $80</option><option value="flexible">Flexible</option>
          </select>
        </label>
        <label className={styles.guestCheck}>
          <input type="checkbox" checked={preferences.alcoholFree}
            onChange={(event) => setPreferences({ ...preferences, alcoholFree: event.target.checked })} />
          <span><strong>Alcohol-free outings</strong><small>Leave out alcohol-focused places by default.</small></span>
        </label>
        <button type="submit" className={styles.primaryButton}>{saved ? "Preferences saved" : "Save my preferences"}</button>
        {message ? <p role="status">{message}</p> : null}
      </form>
      <section className={styles.settingsCard}>
        <h2>Take Venture with you</h2>
        <p>Connect an account to sync your saves and preferences across devices.</p>
        <Link className={styles.secondaryButton} href="/sign-in?next=/profile">Connect an account</Link>
      </section>
    </div>
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
    outings: 0
  });

  useEffect(() => {
    const refreshCounts = () => setCounts({
      listings: getSavedListingReferences().length,
      outings: getSavedOutings().length
    });
    refreshCounts();
    window.addEventListener(SAVED_LISTINGS_EVENT, refreshCounts);
    window.addEventListener(SAVED_OUTINGS_EVENT, refreshCounts);
    window.addEventListener("storage", refreshCounts);
    return () => {
      window.removeEventListener(SAVED_LISTINGS_EVENT, refreshCounts);
      window.removeEventListener(SAVED_OUTINGS_EVENT, refreshCounts);
      window.removeEventListener("storage", refreshCounts);
    };
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

  const { profile, preferences, user } = payload;
  const vibeTags = Array.from(new Set([
    ...preferences.interests,
    ...preferences.outingStyles,
    ...preferences.cuisines
  ])).slice(0, 3);

  const completionChecks = [
    Boolean(profile.avatarUrl),
    Boolean(profile.displayName.trim() && profile.displayName !== "Guest"),
    Boolean(profile.username.trim()),
    Boolean(profile.bio.trim()),
    Boolean(profile.homeNeighbourhood.trim()),
    preferences.interests.length > 0 || preferences.outingStyles.length > 0
  ];
  const profileCompletion = Math.round(
    completionChecks.filter(Boolean).length / completionChecks.length * 100
  );

  return (
    <>
      <section className={styles.profilePass} aria-labelledby="venture-profile-name">
        <div className={styles.passTopline}>
          <span className={styles.passLabel}>VENTURE PASS</span>
          <span className={styles.passCity}>WINNIPEG</span>
        </div>

        <div className={styles.passIdentity}>
          <ProfileAvatar profile={profile} email={user.email} />
          <div className={styles.passIdentityCopy}>
            <span>YOUR CITY, YOUR PICKS</span>
            <h1 id="venture-profile-name">{profile.displayName}</h1>
            <p>
              {profile.username ? `@${profile.username} · ` : ""}
              {profile.homeNeighbourhood
                ? profile.homeNeighbourhood
                : "Winnipeg explorer"}
            </p>
          </div>
        </div>

        {profile.bio ? (
          <p className={styles.passBio}>{profile.bio}</p>
        ) : (
          <p className={styles.passBioMuted}>
            Add a short bio so your Venture profile feels more like you.
          </p>
        )}

        {vibeTags.length > 0 ? (
          <div className={styles.vibeRow} aria-label="Your Venture vibe">
            {vibeTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}

        <div className={styles.passFooter}>
          <Link href="/saved" className={styles.collectionSummary} aria-label="Open your saved places and outings">
            <span>
              <strong>{counts.listings}</strong>
              saved
            </span>
            <i aria-hidden="true" />
            <span>
              <strong>{counts.outings}</strong>
              outings
            </span>
          </Link>
          <Link className={styles.passEditLink} href="/profile/edit">
            Edit profile
          </Link>
        </div>

        <div className={styles.profileCompletion}>
          <span>
            <strong>{profileCompletion}%</strong> of optional profile details
          </span>
          <div aria-hidden="true"><i style={{ width: `${profileCompletion}%` }} /></div>
        </div>
      </section>

      {!profile.onboardingCompleted ? (
        <Link className={styles.onboardingBanner} href="/profile/onboarding">
          <span>
            <strong>Finish making Venture yours</strong>
            <small>A few choices help shape better recommendations.</small>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </Link>
      ) : null}

      <section className={styles.profileHub} aria-labelledby="profile-hub-title">
        <header className={styles.profileHubHeader}>
          <span>YOUR PROFILE</span>
          <h2 id="profile-hub-title">Open what you want to change.</h2>
          <p>Everything about your Venture life stays neatly tucked into its own place.</p>
        </header>

        <nav className={styles.profileMenu} aria-label="Profile sections">
          <Link href="/profile/edit">
            <span className={`${styles.menuIcon} ${styles.menuIconRed}`} aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" /></svg>
            </span>
            <span><strong>About me</strong><small>Photo, name, username, bio, and neighbourhood</small></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </Link>

          <Link href="/profile/preferences">
            <span className={`${styles.menuIcon} ${styles.menuIconYellow}`} aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6" /></svg>
            </span>
            <span><strong>My vibe</strong><small>Interests, food, budget, transport, and outing style</small></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </Link>

          <Link href="/saved">
            <span className={`${styles.menuIcon} ${styles.menuIconSoft}`} aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M20.5 8.5c0 5.4-8.5 11-8.5 11s-8.5-5.6-8.5-11A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.5 2.5Z" /></svg>
            </span>
            <span><strong>My saves</strong><small>Places, events, and outings you want to come back to</small></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </Link>

          <Link href="/profile/settings">
            <span className={`${styles.menuIcon} ${styles.menuIconInk}`} aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>
            </span>
            <span><strong>Account & privacy</strong><small>Email, newsletter, notifications, data, and account controls</small></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </Link>
        </nav>
      </section>
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
      setMessage("About me saved.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not save the profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ProfilePageHeader
        eyebrow="ABOUT ME"
        title="The person behind the plans."
        description="Keep this light. Your profile is here to make Venture feel personal, not turn into another form to maintain."
      />

      <section className={styles.aboutPreviewCard}>
        <ProfileAvatar profile={form} email={payload.user.email} />
        <div>
          <span>YOUR VENTURE CARD</span>
          <h2>{form.displayName || "Venture explorer"}</h2>
          <p>
            {form.username ? `@${form.username} · ` : ""}
            {form.homeNeighbourhood || "Winnipeg"}
          </p>
          <small>{form.bio || "Add one line that sounds like you."}</small>
        </div>
      </section>

      <ProfileAvatarEditor
        userId={payload.user.id}
        email={payload.user.email}
        profile={form}
        onChanged={refresh}
      />

      <form className={styles.profileDetailForm} onSubmit={handleSubmit}>
        <details className={styles.profileDisclosure} open>
          <summary>
            <span><strong>Identity</strong><small>Name and username</small></span>
            <b aria-hidden="true">+</b>
          </summary>
          <div className={styles.disclosureBody}>
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
              Username <small>Used as your lightweight Venture identity</small>
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
          </div>
        </details>

        <details className={styles.profileDisclosure} open>
          <summary>
            <span><strong>A little about you</strong><small>Bio and home neighbourhood</small></span>
            <b aria-hidden="true">+</b>
          </summary>
          <div className={styles.disclosureBody}>
            <label>
              Short bio <small>{form.bio.length}/180</small>
              <textarea
                value={form.bio}
                maxLength={180}
                rows={4}
                placeholder="I am usually looking for good food, music, and something I have not tried yet."
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
          </div>
        </details>

        <div className={styles.groupIdentityNote}>
          <span aria-hidden="true">👥</span>
          <div>
            <strong>Shared group plans stay intentional</strong>
            <small>
              Your Venture profile stays private. When you deliberately join a shared group itinerary,
              Venture can show your display name and avatar inside that plan so friends know who is in.
            </small>
          </div>
        </div>

        <button type="submit" className={styles.primaryButton} disabled={saving}>
          {saving ? "Saving…" : "Save about me"}
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
      setMessage("Your Venture vibe is saved.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not save these preferences.");
    } finally {
      setSaving(false);
    }
  }

  const vibePreview = Array.from(new Set([
    ...form.interests,
    ...form.outingStyles,
    ...form.cuisines
  ])).slice(0, 6);

  return (
    <>
      <ProfilePageHeader
        eyebrow="MY VIBE"
        title="Tell Venture what tends to hit."
        description="Open only the section you want. These are defaults, not rules."
      />

      <section className={styles.vibePreviewCard}>
        <span>YOUR CURRENT MIX</span>
        <h2>{vibePreview.length > 0 ? "A few things Venture knows about you" : "Your vibe is wide open"}</h2>
        {vibePreview.length > 0 ? (
          <div className={styles.vibePreviewChips}>
            {vibePreview.map((item) => <span key={item}>{item}</span>)}
          </div>
        ) : (
          <p>Pick a few things below and recommendations can start closer to your taste.</p>
        )}
      </section>

      <section className={styles.vibeAccordion}>
        <details className={styles.profileDisclosure} open>
          <summary>
            <span><strong>What I am into</strong><small>Interests and outing styles</small></span>
            <b aria-hidden="true">+</b>
          </summary>
          <div className={styles.disclosureBody}>
            <PreferenceSection title="Interests" description="What should Venture surface first?">
              <OptionChips options={INTEREST_OPTIONS} selected={form.interests} onToggle={(value) => toggle("interests", value)} />
            </PreferenceSection>
            <PreferenceSection title="Outing styles" description="The plans you make most often.">
              <OptionChips options={OUTING_STYLE_OPTIONS} selected={form.outingStyles} onToggle={(value) => toggle("outingStyles", value)} />
            </PreferenceSection>
          </div>
        </details>

        <details className={styles.profileDisclosure}>
          <summary>
            <span><strong>Food & practical needs</strong><small>Cuisine, dietary, and accessibility</small></span>
            <b aria-hidden="true">+</b>
          </summary>
          <div className={styles.disclosureBody}>
            <PreferenceSection title="Cuisines" description="Useful for food picks and mixed routes.">
              <OptionChips options={CUISINE_OPTIONS} selected={form.cuisines} onToggle={(value) => toggle("cuisines", value)} />
            </PreferenceSection>
            <PreferenceSection title="Dietary needs" description="Only needs that should affect recommendations.">
              <OptionChips options={DIETARY_OPTIONS} selected={form.dietaryNeeds} onToggle={(value) => toggle("dietaryNeeds", value)} />
            </PreferenceSection>
            <PreferenceSection title="Accessibility" description="Prioritize listings with matching confirmed details.">
              <OptionChips options={ACCESSIBILITY_OPTIONS} selected={form.accessibilityNeeds} onToggle={(value) => toggle("accessibilityNeeds", value)} />
            </PreferenceSection>
          </div>
        </details>

        <details className={styles.profileDisclosure}>
          <summary>
            <span><strong>Where & how I go out</strong><small>Neighbourhood, budget, transport, and group size</small></span>
            <b aria-hidden="true">+</b>
          </summary>
          <div className={styles.disclosureBody}>
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
          </div>
        </details>

        <details className={styles.profileDisclosure}>
          <summary>
            <span><strong>Little preferences</strong><small>Small signals that help ranking</small></span>
            <b aria-hidden="true">+</b>
          </summary>
          <div className={styles.disclosureBody}>
            <ToggleRow label="Prefer alcohol-free options" description="Prioritize plans that do not depend on drinking." checked={form.alcoholFree} onChange={(checked) => setForm({ ...form, alcoholFree: checked })} />
            <ToggleRow label="Free events" description="Give free activities a little more weight." checked={form.likesFreeEvents} onChange={(checked) => setForm({ ...form, likesFreeEvents: checked })} />
            <ToggleRow label="Nightlife" description="Include later hours, bars, and dance options." checked={form.likesNightlife} onChange={(checked) => setForm({ ...form, likesNightlife: checked })} />
            <ToggleRow label="Outdoor plans" description="Surface parks, walks, markets, and seasonal activities." checked={form.likesOutdoors} onChange={(checked) => setForm({ ...form, likesOutdoors: checked })} />
            <ToggleRow label="Date ideas" description="Prioritize combinations suited to dates." checked={form.likesDateIdeas} onChange={(checked) => setForm({ ...form, likesDateIdeas: checked })} />
          </div>
        </details>

        <button type="button" className={styles.primaryButton} disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save my vibe"}
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
          firstName: payload.profile.displayName.split(/\\s+/)[0] || "Venture reader",
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
        throw new Error(result.error || "Venture could not delete the profile.");
      }
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "local" });
      window.localStorage.clear();
      router.push("/?account=deleted");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Venture could not delete the profile.");
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
        eyebrow="ACCOUNT & PRIVACY"
        title="The practical stuff, tucked away."
        description="Open a section only when you need it."
      />

      <section className={styles.settingsAccordion}>
        <details className={styles.profileDisclosure} open>
          <summary>
            <span><strong>Sign-in & email</strong><small>Your Venture account access</small></span>
            <b aria-hidden="true">+</b>
          </summary>
          <div className={styles.disclosureBody}>
            <label>
              Email address
              <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
            </label>
            <p className={styles.settingsHint}>
              Google sign-in is simply a way into this Venture account. Changing or deleting Venture does not delete your Google account.
            </p>
            <button type="button" className={styles.secondaryButton} disabled={working === "email"} onClick={updateEmail}>
              {working === "email" ? "Starting change…" : "Change email"}
            </button>
          </div>
        </details>

        <details className={styles.profileDisclosure}>
          <summary>
            <span><strong>Notifications</strong><small>Only the nudges you actually want</small></span>
            <b aria-hidden="true">+</b>
          </summary>
          <div className={styles.disclosureBody}>
            <ToggleRow label="Weekend digest" description="A compact in-app weekend roundup when available." checked={notifications.weekendDigest} onChange={(checked) => setNotifications({ ...notifications, weekendDigest: checked })} />
            <ToggleRow label="Saved event reminders" description="Remind you before events you deliberately saved." checked={notifications.savedEventReminders} onChange={(checked) => setNotifications({ ...notifications, savedEventReminders: checked })} />
            <ToggleRow label="Outing reminders" description="A reminder before a saved outing starts." checked={notifications.outingReminders} onChange={(checked) => setNotifications({ ...notifications, outingReminders: checked })} />
            <ToggleRow label="Product updates" description="Occasional changes to Venture itself." checked={notifications.productUpdates} onChange={(checked) => setNotifications({ ...notifications, productUpdates: checked })} />
            <button type="button" className={styles.primaryButton} disabled={working === "notifications"} onClick={saveNotifications}>
              {working === "notifications" ? "Saving…" : "Save notifications"}
            </button>
          </div>
        </details>

        <details className={styles.profileDisclosure}>
          <summary>
            <span><strong>The Thursday Venture</strong><small>Newsletter status: {notifications.newsletterStatus.replace("-", " ")}</small></span>
            <b aria-hidden="true">+</b>
          </summary>
          <div className={styles.disclosureBody}>
            <p>Winnipeg picks in your inbox, only when you have opted in.</p>
            <button type="button" className={notifications.newsletterActive ? styles.secondaryButton : styles.primaryButton} disabled={working === "newsletter"} onClick={newsletterAction.action}>
              {working === "newsletter" ? "Updating…" : newsletterAction.label}
            </button>
          </div>
        </details>

        <details className={styles.profileDisclosure}>
          <summary>
            <span><strong>My data & sessions</strong><small>Export or sign out everywhere</small></span>
            <b aria-hidden="true">+</b>
          </summary>
          <div className={styles.disclosureBody}>
            <a className={styles.secondaryButton} href="/api/profile/export">Download my Venture data</a>
            <button type="button" className={styles.secondaryButton} disabled={working === "signout"} onClick={signOutEverywhere}>
              {working === "signout" ? "Signing out…" : "Sign out on every device"}
            </button>
          </div>
        </details>

        <details className={`${styles.profileDisclosure} ${styles.deleteDisclosure}`}>
          <summary>
            <span><strong>Delete my Venture profile</strong><small>Permanent account deletion</small></span>
            <b aria-hidden="true">+</b>
          </summary>
          <div className={styles.disclosureBody}>
            <div className={styles.deleteWarning}>
              <strong>This cannot be undone.</strong>
              <p>
                Venture will remove your profile, preferences, synced saves, visit history, avatar,
                and shared group itineraries you host. Newsletter delivery is stopped. Your Google account itself is untouched.
              </p>
            </div>
            <label>
              Type DELETE to confirm
              <input value={deleteText} autoComplete="off" onChange={(event) => setDeleteText(event.target.value)} />
            </label>
            <button type="button" className={styles.dangerButton} disabled={working === "delete" || deleteText !== "DELETE"} onClick={deleteAccount}>
              {working === "delete" ? "Deleting profile…" : "Delete my Venture profile permanently"}
            </button>
          </div>
        </details>
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
