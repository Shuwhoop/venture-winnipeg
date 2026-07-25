import Link from "next/link";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  logoutAdmin
} from "../login/actions";

import styles from "./admin-layout.module.css";


export const dynamic =
  "force-dynamic";


export default async function SubmissionAdminLayout({
  children
}: {
  children:
    React.ReactNode;
}) {
  const admin =
    await requireVentureAdmin();

  return (
    <>
      <header
        className={
          styles.bar
        }
      >
        <div
          className={
            styles.identity
          }
        >
          <span>
            SECURE ADMIN SESSION
          </span>

          <strong>
            {admin.email}
          </strong>
        </div>

        <nav
          aria-label="Admin navigation"
          className={
            styles.navigation
          }
        >
          <Link
            href="/admin/submissions"
          >
            Review queue
          </Link>

          <Link
            href="/admin/submissions/history"
          >
            History
          </Link>

          <Link
            href="/admin/submissions/requests"
          >
            Search requests
          </Link>

          <Link
            href="/admin/submissions/photos"
          >
            Photo portal
          </Link>

          <Link
            href="/submit"
          >
            Public form
          </Link>
        </nav>

        <form
          action={
            logoutAdmin
          }
          className={
            styles.logout
          }
        >
          <button
            type="submit"
          >
            Log out
          </button>
        </form>
      </header>

      {children}
    </>
  );
}
