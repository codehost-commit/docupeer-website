"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeSessionDescriptionSdp } from "@/lib/webrtc-sdp";

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

type HostStatus = {
  label: string;
  pending: number;
  answered: number;
  lastError: string;
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
  const answeringRef = useRef<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [message, setMessage] = useState("Choose a tab or screen before going live.");
  const [hostStatus, setHostStatus] = useState<HostStatus>({
    label: "Host loop idle",
    pending: 0,
    answered: 0,
    lastError: "",
  });

  function closePeers() {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    answeringRef.current.clear();
    setViewerCount(0);
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setSharing(false);
    closePeers();
    setHostStatus((current) => ({
      ...current,
      label: "Screen share stopped",
      pending: 0,
    }));
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
    setHostStatus((current) => ({
      ...current,
      label: isLive ? "Host loop starting" : "Preview ready",
      lastError: "",
    }));

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
    setHostStatus((current) => ({
      ...current,
      label: "Host loop starting",
      lastError: "",
    }));
  }

  async function handleStop() {
    await onStopLive();
    stopStream();
    setMessage("Live broadcast stopped.");
    setHostStatus({
      label: "Host loop idle",
      pending: 0,
      answered: 0,
      lastError: "",
    });
  }

  async function answerPeer(peerData: PendingPeer) {
    if (!streamRef.current) throw new Error("No screen is selected in this admin tab.");
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
      setHostStatus((current) => ({
        ...current,
        label: `Answering ${peerData.viewerId.slice(0, 18)}...`,
        lastError: "",
      }));

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

      await peer.setRemoteDescription({ type: "offer", sdp: sanitizeSessionDescriptionSdp(peerData.offerSdp) });
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
          answerSdp: sanitizeSessionDescriptionSdp(peer.localDescription.sdp),
        }),
      });

      if (!response.ok) throw new Error("Could not save answer.");
      setHostStatus((current) => ({
        ...current,
        label: "Viewer answered",
        answered: current.answered + 1,
        lastError: "",
      }));
      setMessage("Viewer connection answered. The public page should switch from waiting to the live feed.");
    } catch (err) {
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
      throw err;
    }
  }

  useEffect(() => {
    if (!isLive) {
      setHostStatus((current) => ({
        ...current,
        label: "Host loop idle",
        pending: 0,
      }));
      return;
    }
    let cancelled = false;

    async function poll() {
      try {
        if (!streamRef.current) {
          setHostStatus((current) => ({
            ...current,
            label: "Live is on, but no screen is selected",
            lastError: "Click Pick screen or Stop live. Browsers do not allow screen sharing to start without a click.",
          }));
          setMessage("Live is on, but this admin tab is not sharing a screen.");
        }

        const response = await fetch("/api/live-manage/webrtc/peers", {
          cache: "no-store",
          headers: { "x-docupeer-live-admin": "browser-managed" },
        });
        if (!response.ok) throw new Error(`Peer poll failed with ${response.status}.`);
        const data = await response.json();
        const peers: PendingPeer[] = Array.isArray(data.peers) ? data.peers : [];
        setHostStatus((current) => ({
          ...current,
          label: streamRef.current ? "Host loop listening" : "Waiting for screen selection",
          pending: peers.length,
          lastError: streamRef.current ? "" : current.lastError,
        }));
        if (!streamRef.current) return;
        for (const peer of peers) {
          if (cancelled || answeringRef.current.has(peer.viewerId) || peersRef.current.has(peer.viewerId)) continue;
          answeringRef.current.add(peer.viewerId);
          answerPeer(peer)
            .catch((err) => {
              if (!cancelled) {
                setHostStatus((current) => ({
                  ...current,
                  label: "Answer failed",
                  lastError: err instanceof Error ? err.message : "Could not answer a viewer.",
                }));
                setMessage(err instanceof Error ? err.message : "Could not answer a viewer.");
              }
            })
            .finally(() => {
              answeringRef.current.delete(peer.viewerId);
            });
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Viewer signaling is having trouble.";
        setHostStatus((current) => ({
          ...current,
          label: "Host loop error",
          lastError: detail,
        }));
        setMessage(`Still live, but viewer signaling is having trouble: ${detail}`);
      }
    }

    poll();
    const timer = window.setInterval(poll, 900);
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
      <div className="grid gap-3 border-t border-white/10 bg-[#111923] p-3 text-sm text-[#d4deea] sm:grid-cols-4">
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f9bab]">Host loop</div>
          <div className="mt-1 font-semibold text-white">{hostStatus.label}</div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f9bab]">Pending viewers</div>
          <div className="mt-1 font-semibold text-white">{hostStatus.pending}</div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f9bab]">Answered</div>
          <div className="mt-1 font-semibold text-white">{hostStatus.answered}</div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f9bab]">Last issue</div>
          <div className="mt-1 truncate font-semibold text-white" title={hostStatus.lastError}>
            {hostStatus.lastError || "None"}
          </div>
        </div>
      </div>
    </section>
  );
}
