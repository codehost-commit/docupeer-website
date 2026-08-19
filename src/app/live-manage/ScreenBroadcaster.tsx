"use client";

import { useRef, useState } from "react";

const MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function preferredMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || "";
}

export function ScreenBroadcaster({
  isLive,
  busy,
  onGoLive,
  onStopLive,
}: {
  isLive: boolean;
  busy: boolean;
  onGoLive: () => Promise<void>;
  onStopLive: () => Promise<void>;
}) {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const liveRef = useRef(isLive);
  const chunkCountRef = useRef(0);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("Choose a tab or screen before going live.");

  liveRef.current = isLive;

  async function uploadChunk(blob: Blob) {
    if (!blob.size || !liveRef.current) return;
    try {
      const response = await fetch("/api/live-manage/stream/chunk", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-docupeer-live-mime": blob.type || "video/webm",
        },
        body: blob,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Chunk upload failed with ${response.status}.`);
      }
      chunkCountRef.current += 1;
      setMessage(`Streaming to the public live page. ${chunkCountRef.current} chunks sent.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not upload the live stream.");
    }
  }

  function stopRecorder() {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function startRecorder() {
    if (!streamRef.current) {
      setMessage("Pick a screen before going live.");
      return false;
    }
    if (typeof MediaRecorder === "undefined") {
      setMessage("This browser cannot record a screen stream.");
      return false;
    }

    stopRecorder();
    const mimeType = preferredMimeType();
    const recorder = new MediaRecorder(streamRef.current, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 1_500_000,
      audioBitsPerSecond: 128_000,
    });
    recorderRef.current = recorder;
    chunkCountRef.current = 0;

    recorder.ondataavailable = (event) => {
      if (event.data.size) uploadChunk(event.data);
    };
    recorder.onerror = () => {
      setMessage("The browser recorder hit an error. Stop live and start again.");
    };

    recorder.start(1000);
    setMessage("Streaming to the public live page.");
    return true;
  }

  function stopStream() {
    stopRecorder();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setSharing(false);
  }

  async function startShare() {
    const mediaDevices = navigator.mediaDevices as MediaDevices & {
      getDisplayMedia?: (constraints?: DisplayMediaStreamOptions) => Promise<MediaStream>;
    };
    if (!mediaDevices.getDisplayMedia) {
      setMessage("This browser does not support screen sharing.");
      return false;
    }

    const stream = await mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 24, max: 30 },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
      },
      audio: true,
    });

    streamRef.current = stream;
    if (previewRef.current) {
      previewRef.current.srcObject = stream;
      previewRef.current.muted = true;
      await previewRef.current.play().catch(() => {});
    }
    setSharing(true);
    setMessage("Screen share is ready. Tab audio works when your browser includes audio in the selected share.");

    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      stopStream();
      if (liveRef.current) onStopLive().catch(() => {});
      setMessage("Screen sharing stopped.");
    });

    return true;
  }

  async function handleGoLive() {
    let ready = !!streamRef.current;
    if (!ready) ready = await startShare();
    if (!ready) return;
    await onGoLive();
    liveRef.current = true;
    startRecorder();
  }

  async function handleStop() {
    liveRef.current = false;
    stopStream();
    await onStopLive();
    chunkCountRef.current = 0;
    setMessage("Live broadcast stopped.");
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#1d2531] bg-[#090d13] shadow-[0_26px_80px_rgba(8,13,20,0.28)]">
      <div className="relative aspect-video w-full">
        <video ref={previewRef} className="h-full w-full bg-black object-contain" playsInline muted autoPlay />
        {!sharing ? (
          <div className="absolute inset-0 grid place-items-center bg-[#0b1017] px-5 text-center">
            <div className="max-w-2xl">
              <div className="mx-auto inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-[#d4deea]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8b96a5]" />
                Not sharing
              </div>
              <h2 className="mt-6 text-4xl font-semibold tracking-normal text-white sm:text-6xl">
                Share a tab or screen
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#bac7d5] sm:text-base">
                Go live opens your browser picker. Select the Jitsi tab or screen and DocuPeer will stream it to `/live`.
              </p>
            </div>
          </div>
        ) : null}
        {sharing ? (
          <div className="absolute left-4 top-4 rounded-md border border-white/15 bg-black/55 px-3 py-2 text-sm font-semibold text-white backdrop-blur">
            {isLive ? "Streaming" : "Preview ready"}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 bg-[#0b1017] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm leading-6 text-[#c8d3df]">{message}</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startShare}
            disabled={busy || isLive}
            className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            Pick screen
          </button>
          <button
            type="button"
            onClick={isLive ? handleStop : handleGoLive}
            disabled={busy}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${isLive ? "bg-[#842839] hover:bg-[#6e1f2e]" : "bg-[#174c33] hover:bg-[#113b27]"}`}
          >
            {isLive ? "Stop live" : "Go live"}
          </button>
        </div>
      </div>
    </section>
  );
}
