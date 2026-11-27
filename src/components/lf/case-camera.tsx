import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { enqueueFiles } from "@/lib/file-upload-queue";
export function CaseCamera({
  userId,
  caseId,
  collectionId,
  onClose,
}: {
  userId: string;
  caseId: string;
  collectionId: string;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    let stream: MediaStream | undefined;
    const stop = () => stream?.getTracks().forEach((t) => t.stop());
    if (!navigator.mediaDevices) {
      setError("Camera is unavailable in this browser. Use Upload files instead.");
      return;
    }
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((s) => {
        stream = s;
        if (!active) {
          stop();
          return;
        }
        if (video.current) video.current.srcObject = s;
      })
      .catch((e) =>
        setError("Camera could not be opened. Allow camera access or use Upload files."),
      );
    const hide = () => {
      if (document.visibilityState === "hidden") {
        stop();
        onClose();
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      active = false;
      stop();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  async function capture() {
    if (!video.current || !ready || busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.current.videoWidth;
      canvas.height = video.current.videoHeight;
      canvas.getContext("2d")!.drawImage(video.current, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Photo could not be captured"))),
          "image/jpeg",
          0.92,
        ),
      );
      await enqueueFiles(userId, caseId, collectionId, [
        new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }),
      ]);
      setCount((c) => c + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Case camera · {count} saved</DialogTitle>
        </DialogHeader>
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          className="max-h-[65vh] w-full rounded-lg bg-black"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Each shot is saved on this device, then uploaded for office review.
        </p>
        <div className="flex gap-3">
          <Button disabled={!ready || busy} onClick={() => void capture()}>
            {busy ? "Saving photo…" : "Take photo"}
          </Button>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
