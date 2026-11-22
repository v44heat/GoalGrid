"use client";

import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Builds a PNG in the browser on click. Offers "Share" too where the device can share files
 * (phones), which opens WhatsApp and friends directly with the image attached.
 */
export function DownloadImageButton({
  label,
  filename,
  makeBlob,
  iconOnly = false,
  variant = "secondary",
}: {
  label: string;
  filename: string;
  makeBlob: () => Promise<Blob>;
  iconOnly?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    try {
      const probe = new File([""], "probe.png", { type: "image/png" });
      setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShare(false);
    }
  }, []);

  const name = `${slug(filename)}.png`;

  async function download() {
    setBusy("download");
    try {
      const blob = await makeBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      console.error("image download failed:", err);
      toast("error", "Couldn't create the image. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    setBusy("share");
    try {
      const blob = await makeBlob();
      const file = new File([blob], name, { type: "image/png" });
      await navigator.share({ files: [file], title: label });
    } catch (err) {
      // Closing the share sheet is not an error.
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error("image share failed:", err);
        toast("error", "Couldn't share the image. Try downloading it instead.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <span className="inline-flex gap-2">
      <Button
        size="sm"
        variant={variant}
        loading={busy === "download"}
        disabled={busy !== null}
        onClick={download}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
      >
        {busy !== "download" && <Download className="h-4 w-4" aria-hidden />}
        {!iconOnly && label}
      </Button>
      {canShare && (
        <Button
          size="sm"
          variant="ghost"
          loading={busy === "share"}
          disabled={busy !== null}
          onClick={share}
          aria-label={`Share: ${label}`}
          title="Share"
        >
          {busy !== "share" && <Share2 className="h-4 w-4" aria-hidden />}
          {!iconOnly && "Share"}
        </Button>
      )}
    </span>
  );
}
