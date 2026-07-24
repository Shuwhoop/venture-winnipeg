"use client";

import { useEffect } from "react";

function notifyWaitingWorker() {
  window.dispatchEvent(new CustomEvent("venture:sw-waiting"));
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;
    let updateInterval: number | null = null;

    const onControllerChange = () => {
      if (refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (registration.waiting) {
          notifyWaitingWorker();
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;

          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              notifyWaitingWorker();
            }
          });
        });

        updateInterval = window.setInterval(() => {
          void registration.update();
        }, 60 * 60 * 1000);
      })
      .catch(() => {
        // Registration failure should never block Venture's core web experience.
      });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );

      if (updateInterval !== null) {
        window.clearInterval(updateInterval);
      }
    };
  }, []);

  return null;
}
