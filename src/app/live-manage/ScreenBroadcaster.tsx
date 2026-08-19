"use client";

import { useEffect, useRef, useState } from "react";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:openrelay.metered.ca:80" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

type PendingPeer = {
  viewerId: string;
  offerSdp: string;
};

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
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [sharing, setSharing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [message, setMessage] = useState("Choose a tab or screen before going live.");

  function closePeers() {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    setViewerCount(0);
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setSharing(false);
    closePeers();
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
        frameRate: { ideal: 30, max: 30 },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
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
      if (isLive) onStopLive().catch(() => {});
      setMessage("Screen sharing stopped.");
    });

    return true;
  }

  async function handleGoLive() {
    let ready = !!streamRef.current;
    if (!ready) ready = await startShare();
    if (!ready) return;
    await onGoLive();
  }

  async function handleStop() {
    await onStopLive();
    stopStream();
    setMessage("Live broadcast stopped.");
  }

  async function answerPeer(peerData: PendingPeer) {
    if (!streamRef.current) return;
    const existingPeer = peersRef.current.get(peerData.viewerId);
    if (existingPeer) {
      existingPeer.close();
      peersRef.current.delete(peerData.viewerId);
    }
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    let lastViewerCandidateAt = 0;
    let candidateTimer = 0;
    try {
      peersRef.current.set(peerData.viewerId, peer);
      setViewerCount(peersRef.current.size);

      peer.onicecandidate = (event) => {
        if (!event.candidate) return;
        fetch("/api/live-manage/webrtc/candidate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-docupeer-live-admin": "browser-managed",
          },
          body: JSON.stringify({
            viewerId: peerData.viewerId,
            candidate: JSON.stringify(event.candidate.toJSON()),
          }),
        }).catch(() => {});
      };

      streamRef.current.getTracks().forEach((track) => {
        if (streamRef.current) peer.addTrack(track, streamRef.current);
      });

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected" && candidateTimer) {
          window.clearInterval(candidateTimer);
          candidateTimer = 0;
        }
        if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
          if (candidateTimer) {
            window.clearInterval(candidateTimer);
            candidateTimer = 0;
          }
          peer.close();
          peersRef.current.delete(peerData.viewerId);
          setViewerCount(peersRef.current.size);
        }
      };

      await peer.setRemoteDescription({ type: "offer", sdp: peerData.offerSdp });
      candidateTimer = window.setInterval(async () => {
        try {
          const response = await fetch(`/api/live-manage/webrtc/candidates?viewerId=${encodeURIComponent(peerData.viewerId)}&after=${lastViewerCandidateAt}`, {
            cache: "no-store",
            headers: { "x-docupeer-live-admin": "browser-managed" },
          });
          if (!response.ok) return;
          const data = await response.json();
          const candidates: { candidate: string; createdAt: number }[] = Array.isArray(data.candidates) ? data.candidates : [];
          for (const item of candidates) {
            lastViewerCandidateAt = Math.max(lastViewerCandidateAt, Number(item.createdAt || 0));
            await peer.addIceCandidate(JSON.parse(item.candidate));
          }
        } catch {}
      }, 1000);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      if (!peer.localDescription) throw new Error("Missing local description.");

      const response = await fetch("/api/live-manage/webrtc/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-docupeer-live-admin": "browser-managed",
        },
        body: JSON.stringify({
          viewerId: peerData.viewerId,
          answerSdp: peer.localDescription.sdp,
        }),
      });

      if (!response.ok) throw new Error("Could not save answer.");
    } catch {
      if (candidateTimer) window.clearInterval(candidateTimer);
      peer.close();
      peersRef.current.delete(peerData.viewerId);
      setViewerCount(peersRef.current.size);
      await fetch("/api/live-manage/webrtc/fail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-docupeer-live-admin": "browser-managed",
        },
        body: JSON.stringify({ viewerId: peerData.viewerId }),
      }).catch(() => {});
    }
  }

  useEffect(() => {
    if (!isLive || !streamRef.current) return;
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/live-manage/webrtc/peers", {
          cache: "no-store",
          headers: { "x-docupeer-live-admin": "browser-managed" },
        });
        if (!response.ok) return;
        const data = await response.json();
        const peers: PendingPeer[] = Array.isArray(data.peers) ? data.peers : [];
        for (const peer of peers) {
          if (!cancelled) {
            await answerPeer(peer);
          }
        }
      } catch {
        setMessage("Still live, but viewer signaling is having trouble.");
      }
    }

    poll();
    const timer = window.setInterval(poll, 1800);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isLive, sharing]);

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
                Go live will open your browser picker. Select the tab or screen to broadcast to `/live`.
              </p>
            </div>
          </div>
        ) : null}
        {sharing ? (
          <div className="absolute left-4 top-4 rounded-md border border-white/15 bg-black/55 px-3 py-2 text-sm font-semibold text-white backdrop-blur">
            {isLive ? `${viewerCount} viewer connection${viewerCount === 1 ? "" : "s"}` : "Preview ready"}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 bg-[#0b1017] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm leading-6 text-[#c8d3df]">{message}</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startShare}
            disabled={busy}
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
