"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./app-foundation.module.css";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const INSTALL_DISMISS_KEY = "venture:pwa-install-dismissed:v1";

type FoundationIconName =
  | "offline"
  | "online"
  | "update";

function FoundationIcon({
  name
}: {
  name: FoundationIconName;
}) {
  const paths: Record<FoundationIconName, React.ReactNode> = {
    offline: (
      <>
        <path d="M4 9.5c4.8-4.7 11.2-4.7 16 0" />
        <path d="M7.5 13c2.7-2.6 6.3-2.6 9 0" />
        <circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none" />
        <path d="m4 4 16 16" />
      </>
    ),
    online: (
      <>
        <path d="M4 10c4.8-4.7 11.2-4.7 16 0" />
        <path d="M7.5 13.5c2.7-2.6 6.3-2.6 9 0" />
        <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    update: (
      <>
        <path d="M19 8a7.5 7.5 0 0 0-12.6-2L4 8" />
        <path d="M4 4v4h4" />
        <path d="M5 16a7.5 7.5 0 0 0 12.6 2L20 16" />
        <path d="M20 20v-4h-4" />
      </>
    )
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as NavigatorWithStandalone).standalone)
  );
}

function isIOSDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isSafariBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /safari/i.test(navigator.userAgent) &&
    !/crios|fxios|edgios|chrome|android/i.test(navigator.userAgent);
}

export function AppFoundationRuntime({
  showInstall
}: {
  showInstall: boolean;
}) {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIOS] = useState(false);
  const [safari, setSafari] = useState(false);
  const [online, setOnline] = useState(true);
  const [updateReady, setUpdateReady] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const wasOfflineRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    setStandalone(isStandaloneMode());
    setIOS(isIOSDevice());
    setSafari(isSafariBrowser());
    const initiallyOnline = window.navigator.onLine;
    setOnline(initiallyOnline);
    wasOfflineRef.current = !initiallyOnline;
    setInstallDismissed(
      window.localStorage.getItem(INSTALL_DISMISS_KEY) === "yes"
    );

    const media = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => setStandalone(isStandaloneMode());
    const onOnline = () => {
      setOnline(true);

      if (wasOfflineRef.current) {
        setReconnected(true);

        if (reconnectTimerRef.current !== null) {
          window.clearTimeout(reconnectTimerRef.current);
        }

        reconnectTimerRef.current = window.setTimeout(() => {
          setReconnected(false);
        }, 6500);
      }

      wasOfflineRef.current = false;
    };
    const onOffline = () => {
      wasOfflineRef.current = true;
      setReconnected(false);
      setOnline(false);
    };
    const onUpdate = () => setUpdateReady(true);
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setStandalone(true);
      setInstallEvent(null);
      window.localStorage.removeItem(INSTALL_DISMISS_KEY);
    };

    media.addEventListener?.("change", onDisplayModeChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("venture:sw-waiting", onUpdate);

    return () => {
      media.removeEventListener?.("change", onDisplayModeChange);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("venture:sw-waiting", onUpdate);

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  async function installApp() {
    if (!installEvent) {
      return;
    }

    setInstalling(true);

    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;

      if (choice.outcome === "accepted") {
        setInstallEvent(null);
      }
    } finally {
      setInstalling(false);
    }
  }

  function dismissInstall() {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, "yes");
    setInstallDismissed(true);
  }

  async function applyUpdate() {
    const registration = await navigator.serviceWorker?.getRegistration();

    if (!registration?.waiting) {
      window.location.reload();
      return;
    }

    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  const shouldShowInstall =
    showInstall &&
    !standalone &&
    !installDismissed &&
    (Boolean(installEvent) || (ios && safari));

  return (
    <>
      {!online ? (
        <aside className={styles.connectionBanner} role="alert">
          <span aria-hidden="true"><FoundationIcon name="offline" /></span>
          <div>
            <strong>You are offline</strong>
            <small>Saved plans still work. New searches need a connection.</small>
          </div>
          <a href="/offline/saved">Open saved</a>
        </aside>
      ) : null}

      {online && reconnected ? (
        <aside className={styles.restoredBanner} role="status">
          <span aria-hidden="true"><FoundationIcon name="online" /></span>
          <div>
            <strong>Back online</strong>
            <small>Live search, hours, and route tools are available again.</small>
          </div>
          <button type="button" onClick={() => window.location.reload()}>Refresh</button>
          <button
            type="button"
            className={styles.dismissIcon}
            aria-label="Dismiss connection message"
            onClick={() => setReconnected(false)}
          >
            ×
          </button>
        </aside>
      ) : null}

      {updateReady ? (
        <aside className={styles.updatePrompt} role="status">
          <span className={styles.updateIcon} aria-hidden="true"><FoundationIcon name="update" /></span>
          <div>
            <strong>A fresher Venture is ready</strong>
            <small>Update now to use the latest fixes.</small>
          </div>
          <button type="button" onClick={applyUpdate}>Update</button>
          <button
            type="button"
            className={styles.dismissIcon}
            aria-label="Dismiss update prompt"
            onClick={() => setUpdateReady(false)}
          >
            ×
          </button>
        </aside>
      ) : null}

      {shouldShowInstall ? (
        <section className={styles.installCard} aria-labelledby="install-venture-title">
          <div className={styles.installMark} aria-hidden="true">
            <span>V</span>
          </div>

          <div className={styles.installCopy}>
            <span>PUT VENTURE IN YOUR POCKET</span>
            <h2 id="install-venture-title">Open it like an app.</h2>
            {installEvent ? (
              <p>
                Install Venture for faster access, a clean full-screen view, and
                your saved plans close at hand.
              </p>
            ) : (
              <p>
                On iPhone, tap <strong>Share</strong>, then choose
                <strong> Add to Home Screen</strong>.
              </p>
            )}
          </div>

          <div className={styles.installActions}>
            {installEvent ? (
              <button type="button" onClick={installApp} disabled={installing}>
                {installing ? "Opening…" : "Install Venture"}
              </button>
            ) : (
              <span className={styles.iosHint}>Share ↑ · Add to Home Screen</span>
            )}

            <button type="button" className={styles.laterButton} onClick={dismissInstall}>
              Not now
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}

export function AppStatusCard() {
  const [loaded, setLoaded] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [online, setOnline] = useState(true);
  const [serviceWorker, setServiceWorker] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneMode());
    setOnline(window.navigator.onLine);
    setServiceWorker("serviceWorker" in navigator);
    setLoaded(true);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const build = useMemo(
    () => process.env.NEXT_PUBLIC_VENTURE_BUILD || "local",
    []
  );

  if (!loaded) {
    return null;
  }

  return (
    <section className={styles.statusCard} aria-labelledby="venture-app-status">
      <header>
        <span>VENTURE APP</span>
        <h2 id="venture-app-status">Your pocket-city setup</h2>
        <p>See how Venture is running on this device.</p>
      </header>

      <div className={styles.statusGrid}>
        <article>
          <span aria-hidden="true">▣</span>
          <div>
            <strong>{standalone ? "Installed" : "Browser mode"}</strong>
            <small>{standalone ? "Running as a standalone app" : "Add Venture to your home screen"}</small>
          </div>
        </article>
        <article>
          <span aria-hidden="true">⌁</span>
          <div>
            <strong>{online ? "Connected" : "Offline"}</strong>
            <small>{online ? "Live discovery is available" : "Using saved local information"}</small>
          </div>
        </article>
        <article>
          <span aria-hidden="true">↻</span>
          <div>
            <strong>{serviceWorker ? "Offline support ready" : "Browser limited"}</strong>
            <small>Build {build}</small>
          </div>
        </article>
      </div>
    </section>
  );
}
