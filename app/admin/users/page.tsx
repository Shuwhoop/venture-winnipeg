import {
  requireVentureAdmin
} from "@/lib/auth/admin";
import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  home_neighbourhood: string | null;
  onboarding_completed: boolean | null;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not yet";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeZone: "America/Winnipeg"
  }).format(parsed);
}

export default async function AdminUsersPage() {
  const signedInAdmin = await requireVentureAdmin();
  const admin = getSupabaseAdminClient();

  const [authResult, profilesResult, savedListingsResult, savedOutingsResult] =
    await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 250 }),
      admin
        .from("profiles")
        .select(
          "id, display_name, username, home_neighbourhood, onboarding_completed, avatar_path, created_at, updated_at"
        )
        .order("created_at", { ascending: false })
        .limit(250),
      admin
        .from("user_saved_listings")
        .select("user_id")
        .limit(5000),
      admin
        .from("user_saved_outings")
        .select("user_id")
        .limit(5000)
    ]);

  if (authResult.error) {
    throw authResult.error;
  }

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  if (savedListingsResult.error) {
    throw savedListingsResult.error;
  }

  if (savedOutingsResult.error) {
    throw savedOutingsResult.error;
  }

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const authUsers = authResult.data.users;
  const authMap = new Map(authUsers.map((user) => [user.id, user]));
  const listingCounts = new Map<string, number>();
  const outingCounts = new Map<string, number>();

  for (const row of savedListingsResult.data ?? []) {
    listingCounts.set(
      row.user_id,
      (listingCounts.get(row.user_id) ?? 0) + 1
    );
  }

  for (const row of savedOutingsResult.data ?? []) {
    outingCounts.set(
      row.user_id,
      (outingCounts.get(row.user_id) ?? 0) + 1
    );
  }

  const onboardingComplete = profiles.filter(
    (profile) => profile.onboarding_completed === true
  ).length;
  const withAvatars = profiles.filter(
    (profile) => Boolean(profile.avatar_path)
  ).length;
  const withSaves = profiles.filter(
    (profile) =>
      (listingCounts.get(profile.id) ?? 0) +
        (outingCounts.get(profile.id) ?? 0) >
      0
  ).length;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>PRIVATE ADMIN VIEW</span>
          <h1>Venture profiles</h1>
          <p>
            Review account readiness and sync activity without exposing private
            preferences, saved places, outing contents, or visit notes.
          </p>
        </div>
        <small>Signed in as {signedInAdmin.email}</small>
      </header>

      <section className={styles.metrics}>
        <article><strong>{authUsers.length}</strong><span>Auth accounts</span></article>
        <article><strong>{onboardingComplete}</strong><span>Setup complete</span></article>
        <article><strong>{withSaves}</strong><span>Accounts with saves</span></article>
        <article><strong>{withAvatars}</strong><span>Custom avatars</span></article>
      </section>

      <section className={styles.tableCard}>
        <header>
          <div>
            <span>ACCOUNT OVERVIEW</span>
            <h2>Recent profiles</h2>
          </div>
          <small>{profiles.length} loaded</small>
        </header>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Profile</th>
                <th>Email</th>
                <th>Setup</th>
                <th>Saved</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const authUser = authMap.get(profile.id);
                const savedTotal =
                  (listingCounts.get(profile.id) ?? 0) +
                  (outingCounts.get(profile.id) ?? 0);

                return (
                  <tr key={profile.id}>
                    <td>
                      <strong>{profile.display_name || "Guest"}</strong>
                      <small>
                        {profile.username
                          ? `@${profile.username}`
                          : profile.home_neighbourhood || "No username"}
                      </small>
                    </td>
                    <td>{authUser?.email || "Unavailable"}</td>
                    <td>
                      <span className={profile.onboarding_completed ? styles.ready : styles.pending}>
                        {profile.onboarding_completed ? "Complete" : "Incomplete"}
                      </span>
                    </td>
                    <td>{savedTotal}</td>
                    <td>{formatDate(profile.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
