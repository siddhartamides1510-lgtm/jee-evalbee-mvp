"use client";

import { useEffect, useRef, useState } from "react";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<
    "idle" | "starting" | "ready" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function stopCamera() {
    try {
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setStatus("idle");
      setErrorMsg("");
    } catch {
      // ignore
    }
  }

  async function startCamera() {
    setStatus("starting");
    setErrorMsg("");

    // Always stop old stream first (prevents black screen / stuck camera)
    await stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Video element not found");
      }

      videoRef.current.srcObject = stream;

      // Wait until video is actually ready (fixes black screen)
      await new Promise<void>((resolve, reject) => {
        const v = videoRef.current!;
        const onReady = () => {
          v.removeEventListener("loadedmetadata", onReady);
          resolve();
        };
        const onError = () => {
          v.removeEventListener("loadedmetadata", onReady);
          reject(new Error("Camera metadata load failed"));
        };
        v.addEventListener("loadedmetadata", onReady);
        v.addEventListener("error", onError, { once: true });
      });

      await videoRef.current.play();
      setStatus("ready");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(
        err?.message ||
          "Camera failed. Try again, or allow permission in Chrome settings."
      );
    }
  }

  // IMPORTANT: stop camera when leaving page / refresh
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 18, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Scan</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Module 5B — Camera (stable start/stop + retry)
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button
          onClick={startCamera}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #333",
          }}
        >
          Open Camera
        </button>

        <button
          onClick={stopCamera}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #333",
          }}
        >
          Stop
        </button>

        <button
          onClick={startCamera}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #333",
          }}
        >
          Retry
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        {status === "starting" && (
          <p style={{ fontWeight: 700 }}>Starting camera… wait 2–5 sec</p>
        )}
        {status === "error" && (
          <p style={{ color: "red", fontWeight: 700 }}>
            Camera Error: {errorMsg}
          </p>
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid #333",
          maxWidth: 520,
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", display: "block" }}
        />
      </div>

      <p style={{ marginTop: 12, opacity: 0.8, fontSize: 13 }}>
        Tip: If it shows black, press <b>Retry</b>. If still stuck, press{" "}
        <b>Stop</b> then <b>Open Camera</b>.
      </p>
    </main>
  );
}
