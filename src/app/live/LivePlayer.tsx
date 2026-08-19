"use client";

import { useEffect, useRef, useState } from "react";
import { type LiveSnapshotPayload } from "@/lib/live-shared";

type LiveChunk = {
  sequence: number;
  mimeType: string;
  data: string;
};

function base64ToArrayBuffer(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function supportedMimeType(mimeType: string) {
  if (window.MediaSource?.isTypeSupported(mimeType)) return mimeType;
  if (window.MediaSource?.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
  if (window.MediaSource?.isTypeSupported("video/webm")) return "video/webm";
  return "";
}

export function LivePlayer({ snapshot }: { snapshot: LiveSnapshotPayload }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const lastSequenceRef = useRef(0);
  const [state, setState] = useState("Standing by");
  const [error, setError] = useState("");
  const { live } = snapshot;

  useEffect(() => {
    let disposed = false;
    let mediaSource: MediaSource | null = null;
    let objectUrl = "";
    let pollTimer = 0;

    function appendNext() {
      const sourceBuffer = sourceBufferRef.current;
      if (!sourceBuffer || sourceBuffer.updating || !queueRef.current.length) return;
      const next = queueRef.current.shift();
      if (!next) return;
      try {
        sourceBuffer.appendBuffer(next);
      } catch {
        queueRef.current.unshift(next);
      }
    }

    async function pollChunks() {
      try {
        const response = await fetch(`/api/live/stream/chunks?after=${lastSequenceRef.current}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Stream request failed with ${response.status}.`);
        const data = await response.json();
        const chunks: LiveChunk[] = Array.isArray(data.chunks) ? data.chunks : [];
        if (!data.live?.isLive) {
          setState("Standing by");
          return;
        }
        if (!chunks.length) {
          setState(lastSequenceRef.current ? "Live" : "Waiting for stream");
          return;
        }

        const firstChunk = chunks[0];
        if (!sourceBufferRef.current) {
          if (!mediaSource || mediaSource.readyState !== "open") return;
          const mimeType = supportedMimeType(firstChunk.mimeType);
          if (!mimeType) throw new Error("This browser cannot play the DocuPeer Live WebM stream.");
          const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
          sourceBuffer.mode = "sequence";
          sourceBuffer.addEventListener("updateend", appendNext);
          sourceBufferRef.current = sourceBuffer;
        }

        for (const chunk of chunks) {
          if (chunk.sequence <= lastSequenceRef.current) continue;
          lastSequenceRef.current = chunk.sequence;
          queueRef.current.push(base64ToArrayBuffer(chunk.data));
        }
        setState("Live");
        appendNext();
        videoRef.current?.play().catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load the live stream.");
        setState("Connection needed");
      }
    }

    function start() {
      setError("");
      queueRef.current = [];
      sourceBufferRef.current = null;
      lastSequenceRef.current = 0;

      if (!live.isLive) {
        setState("Standing by");
        if (videoRef.current) videoRef.current.removeAttribute("src");
        return;
      }

      if (!window.MediaSource) {
        setError("This browser cannot play DocuPeer Live.");
        setState("Connection needed");
        return;
      }

      mediaSource = new MediaSource();
      objectUrl = URL.createObjectURL(mediaSource);
      if (videoRef.current) videoRef.current.src = objectUrl;
      setState("Waiting for stream");
      mediaSource.addEventListener("sourceopen", () => {
        if (!disposed) pollChunks();
      });
      pollTimer = window.setInterval(pollChunks, 1000);
    }

    start();

    return () => {
      disposed = true;
      if (pollTimer) window.clearInterval(pollTimer);
      sourceBufferRef.current = null;
      queueRef.current = [];
      if (videoRef.current) videoRef.current.removeAttribute("src");
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [live.isLive, live.startedAt]);

  return (
    <section className="overflow-hidden rounded-lg border border-[#1d2531] bg-[#090d13] shadow-[0_26px_80px_rgba(8,13,20,0.28)]">
      <div className="relative aspect-video w-full">
        <video
          ref={videoRef}
          className="h-full w-full bg-black object-contain"
          playsInline
          controls
          autoPlay
        />
        {!live.isLive || error ? (
          <div className="absolute inset-0 grid place-items-center bg-[#0b1017] px-5 text-center">
            <div className="max-w-2xl">
              <div className={`mx-auto inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${live.isLive ? "border-[#f1b8c2]/40 bg-[#3a1019] text-[#ffdbe1]" : "border-white/15 bg-white/5 text-[#d4deea]"}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${live.isLive ? "bg-[#e76a80]" : "bg-[#8b96a5]"}`} />
                {live.isLive ? "Stream unavailable" : "Offline"}
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-normal text-white sm:text-6xl">
                {live.title}
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#bac7d5] sm:text-base">
                {error || "The room will open here when DocuPeer Live starts."}
              </p>
              {live.isLive ? (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-8 rounded-md bg-white px-6 py-3 text-sm font-semibold text-[#10151d] transition hover:bg-[#e9eef4]"
                >
                  Reconnect
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {live.isLive && !error ? (
          <div className="absolute left-4 top-4 rounded-md border border-white/15 bg-black/55 px-3 py-2 text-sm font-semibold text-white backdrop-blur">
            {state}
          </div>
        ) : null}
      </div>
    </section>
  );
}
