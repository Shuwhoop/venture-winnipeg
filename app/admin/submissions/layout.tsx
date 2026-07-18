import type {
  ReactNode
} from "react";

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
    ReactNode;
}) {
  const admin =
    await requireVentureAdmin();

  return (
    <>
      <div
        className={
          styles.bar
        }
      >
        <div>
          <span>
            SECURE ADMIN SESSION
          </span>

          <strong>
            {admin.email}
          </strong>
        </div>

        <form
          action={
            logoutAdmin
          }
        >
          <button
            type="submit"
          >
            Log out
          </button>
        </form>
      </div>

      {children}
    </>
  );
}
