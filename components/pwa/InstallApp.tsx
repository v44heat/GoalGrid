"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Install app" button. Android and desktop Chrome offer a real install prompt; iPhones have no such
 * API, so there we show the two taps needed. Renders nothing when the app is already installed.
 */
export function InstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(true); // assume installed until we know otherwise
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the event so the button can trigger it later
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferred && !isIos) return null;

  return (
    <div className="mb-3 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={async () => {
          if (deferred) {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          } else {
            setShowIosHelp((v) => !v);
          }
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-turf-600 px-4 py-2 text-sm text-chalk hover:bg-turf-800"
      >
        <Download className="h-4 w-4" aria-hidden />
        Install the app
      </button>
      {showIosHelp && (
        <p className="flex max-w-xs items-center gap-1 text-center text-xs text-chalk-dim">
          Tap <Share className="inline h-4 w-4" aria-label="Share" /> in Safari, then choose Add to Home Screen.
        </p>
      )}
    </div>
  );
}
