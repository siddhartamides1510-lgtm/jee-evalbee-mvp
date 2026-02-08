"use client";

import { useEffect, useRef, useState } from "react";

type Step = "select" | "capture" | "preview";

export default function ScanPage() {
  const [step, setStep] = useState<Step>("select");
  const [status, setStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function openCamera() {
    setStatus("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStep("capture");
    } catch (err) {
      setStatus("❌ Camera permission denied or not available.");
    }
  }

  function captureImage() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setPreviewUrl(dataUrl);

    // Stop camera after capture
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setStep("preview");
  }

  function resetAll() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPreviewUrl(null);
    setStatus("");
    setStep("select");
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Scan OMR</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Module 5B: Real camera capture in browser
      </p>

      <hr style={{ margin: "18px 0" }} />

      {step === "select" && (
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>
            Step 1 — Open Camera
          </h2>

          <button
            onClick={openCamera}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Open Camera
          </button>
        </section>
      )}

      {step === "capture" && (
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>
            Step 2 — Capture Image
          </h2>

          <video
            ref={videoRef}
            style={{
              marginTop: 12,
              width: "100%",
              maxHeight: 420,
              borderRadius: 12,
              background: "#000",
            }}
            playsInline
          />

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              onClick={captureImage}
              style={{ padding: "10px 14px", fontWeight: 900, cursor: "pointer" }}
            >
              Capture
            </button>

            <button
              onClick={resetAll}
              style={{ padding: "10px 14px", fontWeight: 900, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {step === "preview" && (
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>
            Step 3 — Preview
          </h2>

          {previewUrl && (
            <img
              src={previewUrl}
              alt="Captured"
              style={{
                marginTop: 12,
                width: "100%",
                borderRadius: 12,
                border: "1px solid #ddd",
              }}
            />
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              onClick={() =>
                setStatus("✅ Image captured. Next: OpenCV scan (Module 6).")
              }
              style={{ padding: "10px 14px", fontWeight: 900, cursor: "pointer" }}
            >
              Continue
            </button>

            <button
              onClick={resetAll}
              style={{ padding: "10px 14px", fontWeight: 900, cursor: "pointer" }}
            >
              New Scan
            </button>
          </div>
        </section>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {status && <p style={{ marginTop: 16, fontWeight: 900 }}>{status}</p>}
    </main>
  );
}
