"use client";

import { useEffect, useRef, useState } from "react";
import { type LiveSnapshotPayload } from "@/lib/live-shared";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function viewerId() {
  const existing = window.sessionStorage.getItem("docupeer-live-viewer-id");
  if (existing) return existing;
  const id = `viewer-${crypto.randomUUID()}`;
  window.sessionStorage.setItem("docupeer-live-viewer-id", id);
  return id;
}

function waitForIceGathering(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 3500);
    peer.addEventListener("icegatheringstatechange", () => {
      if (peer.iceGatheringState === "complete") {
        window.clearTimeout(timeout);
        resolve();
      }
    });
  });
}

export function LivePlayer({ snapshot }: { snapshot: LiveSnapshotPayload }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [state, setState] = useState("Standing by");
  const [error, setError] = useState("");
  const { live } = snapshot;

  useEffect(() => {
    let disposed = false;

    async function connect() {
      setError("");
      peerRef.current?.close();
      peerRef.current = null;

      if (!live.isLive) {
        setState("Standing by");
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }

      setState("Connecting");
      const id = viewerId();
      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerRef.current = peer;
      const stream = new MediaStream();

      peer.addTransceiver("video", { direction: "recvonly" });
      peer.addTransceiver("audio", { direction: "recvonly" });
      peer.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => stream.addTrack(track));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setState("Live");
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") setError("The live connection could not be established. Refresh and try again.");
        if (peer.connectionState === "connected") setState("Live");
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await waitForIceGathering(peer);
      if (disposed || !peer.localDescription) return;

      const offerResponse = await fetch("/api/live/webrtc/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerId: id, offerSdp: peer.localDescription.sdp }),
      });
      if (!offerResponse.ok) throw new Error("The live room is not accepting viewers yet.");

      for (let attempt = 0; attempt < 40 && !disposed; attempt += 1) {
        const answerResponse = await fetch(`/api/live/webrtc/answer?viewerId=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        if (answerResponse.ok) {
          const data = await answerResponse.json();
          if (data.answerSdp) {
            await peer.setRemoteDescription({ type: "answer", sdp: data.answerSdp });
            setState("Live");
            return;
          }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }

      if (!disposed) throw new Error("The host has not accepted this viewer connection yet.");
    }

    connect().catch((err) => {
      if (!disposed) {
        setError(err instanceof Error ? err.message : "Could not connect to the live stream.");
        setState("Connection needed");
      }
    });

    return () => {
      disposed = true;
      peerRef.current?.close();
      peerRef.current = null;
    };
  }, [live.isLive, live.roomName, snapshot.serverTime]);

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
                {live.isLive ? "Connection needed" : "Offline"}
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
