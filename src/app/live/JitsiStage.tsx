"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiMeetApi;
  }
}

type JitsiMeetApi = {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
};

type JitsiStageProps = {
  roomName: string;
  title: string;
  mode: "host" | "viewer";
  active: boolean;
};

let jitsiScriptPromise: Promise<void> | null = null;

function loadJitsiScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (jitsiScriptPromise) return jitsiScriptPromise;

  jitsiScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the live room."));
    document.head.appendChild(script);
  });

  return jitsiScriptPromise;
}

export function JitsiStage({ roomName, title, mode, active }: JitsiStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<JitsiMeetApi | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;

    async function mount() {
      setReady(false);
      setError("");
      apiRef.current?.dispose();
      apiRef.current = null;

      if (!active || !containerRef.current) return;

      await loadJitsiScript();
      if (disposed || !window.JitsiMeetExternalAPI || !containerRef.current) return;

      const hostMode = mode === "host";
      const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        userInfo: {
          displayName: hostMode ? "DocuPeer Live Host" : "DocuPeer Viewer",
        },
        configOverwrite: {
          subject: title,
          prejoinConfig: { enabled: false },
          disableDeepLinking: true,
          startWithAudioMuted: !hostMode,
          startWithVideoMuted: true,
          channelLastN: hostMode ? -1 : 1,
          enableNoAudioDetection: hostMode,
          enableNoisyMicDetection: hostMode,
          toolbarButtons: hostMode
            ? [
                "microphone",
                "desktop",
                "shareaudio",
                "fullscreen",
                "settings",
                "tileview",
                "videoquality",
                "hangup",
              ]
            : ["fullscreen", "videoquality"],
        },
        interfaceConfigOverwrite: {
          APP_NAME: "DocuPeer Live",
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          DISABLE_PRESENCE_STATUS: true,
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          TILE_VIEW_MAX_COLUMNS: 1,
        },
      });

      apiRef.current = api;
      window.setTimeout(() => {
        if (!disposed) setReady(true);
      }, 900);
    }

    mount().catch((err) => {
      if (!disposed) setError(err instanceof Error ? err.message : "Could not load the live room.");
    });

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [active, mode, roomName, title]);

  function execute(command: string, ...args: unknown[]) {
    apiRef.current?.executeCommand(command, ...args);
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#1d2531] bg-[#090d13] shadow-[0_26px_80px_rgba(8,13,20,0.28)]">
      <div className="aspect-video w-full">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {!active ? (
        <div className="absolute inset-0 grid place-items-center bg-[#0b1017] px-5 text-center">
          <div>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-white/15 bg-white/5 text-sm font-semibold text-white">
              OFF
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-normal text-white">DocuPeer Live is offline</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#aeb9c6]">
              When the team goes live, the stream will appear here automatically.
            </p>
          </div>
        </div>
      ) : null}

      {active && !ready ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#0b1017] text-sm font-semibold text-[#c8d3df]">
          Connecting to the live room...
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-x-4 top-4 rounded-md border border-[#f1b8c2] bg-[#fff1f3] px-4 py-3 text-sm font-semibold text-[#842839]">
          {error}
        </div>
      ) : null}

      {mode === "host" && active ? (
        <div className="flex flex-wrap gap-2 border-t border-white/10 bg-[#0b1017] p-3">
          <button
            type="button"
            onClick={() => execute("toggleShareScreen")}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#10151d] transition hover:bg-[#e9eef4]"
          >
            Share tab or screen
          </button>
          <button
            type="button"
            onClick={() => execute("toggleAudio")}
            className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Toggle mic
          </button>
          <button
            type="button"
            onClick={() => execute("setTileView", false)}
            className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Theatre layout
          </button>
          <button
            type="button"
            onClick={() => execute("hangup")}
            className="rounded-md border border-[#f1b8c2]/50 px-3 py-2 text-sm font-semibold text-[#ffdbe1] transition hover:bg-[#842839]/30"
          >
            Leave room
          </button>
        </div>
      ) : null}
    </div>
  );
}
