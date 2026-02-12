"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    cv?: any;
  }
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);

  const [cvReady, setCvReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "starting" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [lastBubbleCount, setLastBubbleCount] = useState(0);

  async function stopCamera() {
    try {
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setStatus("idle");
    } catch {}
  }

  async function startCamera() {
    setStatus("starting");
    await stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;

      if (!videoRef.current) throw new Error("Video element not found");
      videoRef.current.srcObject = stream;

      await videoRef.current.play();
      setStatus("ready");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Camera failed.");
    }
  }

  function captureFrameToCanvas() {
    const v = videoRef.current;
    const c = captureCanvasRef.current;
    if (!v || !c) return;

    c.width = v.videoWidth;
    c.height = v.videoHeight;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(v, 0, 0);
  }

  function ensureCvReadyOrWarn() {
    if (!cvReady || !window.cv) {
      alert("OpenCV not ready yet.");
      return false;
    }
    return true;
  }

  function syncOverlay() {
    const processed = processedCanvasRef.current;
    const overlay = overlayRef.current;
    if (!processed || !overlay) return;

    overlay.width = processed.width;
    overlay.height = processed.height;

    const ctx = overlay.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
  }

  function preprocessWithOpenCV() {
    if (!ensureCvReadyOrWarn()) return;

    const cv = window.cv!;
    const srcCanvas = captureCanvasRef.current;
    const outCanvas = processedCanvasRef.current;
    if (!srcCanvas || !outCanvas) return;

    const src = cv.imread(srcCanvas);

    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    const blur = new cv.Mat();
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);

    const thr = new cv.Mat();
    cv.adaptiveThreshold(
      blur,
      thr,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      31,
      7
    );

    outCanvas.width = thr.cols;
    outCanvas.height = thr.rows;
    cv.imshow(outCanvas, thr);

    syncOverlay();
    setLastBubbleCount(0);

    src.delete();
    gray.delete();
    blur.delete();
    thr.delete();
  }

  function detectBubblesAndDraw() {
    if (!ensureCvReadyOrWarn()) return;

    const cv = window.cv!;
    const processed = processedCanvasRef.current;
    const overlay = overlayRef.current;
    if (!processed || !overlay) return;

    syncOverlay();

    const src = cv.imread(processed);

    const circles = new cv.Mat();

    // 🔥 MUCH MORE SENSITIVE PARAMETERS
    cv.HoughCircles(
      gray,
      circles,
      cv.HOUGH_GRADIENT,
      1.2,     // dp
      12,      // minDist (lower = more detection)
      100,     // param1
      18,      // param2 (LOWER = MORE SENSITIVE)
      6,       // minRadius
      35       // maxRadius
    );

    const ctx = overlay.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;

      const count = circles.cols;
      setLastBubbleCount(count);

      for (let i = 0; i < circles.cols; i++) {
        const x = circles.data32F[i * 3];
        const y = circles.data32F[i * 3 + 1];
        const r = circles.data32F[i * 3 + 2];

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    src.delete();
    circles.delete();
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <main style={{ padding: 18, fontFamily: "system-ui" }}>
      <Script
        src="https://docs.opencv.org/4.x/opencv.js"
        strategy="afterInteractive"
        onLoad={() => {
          const cv = window.cv;
          if (!cv) return;
          cv["onRuntimeInitialized"] = () => setCvReady(true);
        }}
      />

      <h1 style={{ fontSize: 24, fontWeight: 900 }}>Scan (Module 6)</h1>

      <p style={{ fontWeight: 800 }}>
        OpenCV: {cvReady ? "✅ Ready" : "⏳ Loading..."}
      </p>

      <p style={{ fontWeight: 800 }}>
        Detected circles: {lastBubbleCount}
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <button onClick={startCamera}>Open Camera</button>
        <button onClick={stopCamera}>Stop</button>
        <button
          onClick={() => {
            captureFrameToCanvas();
            preprocessWithOpenCV();
          }}
        >
          Capture + Preprocess
        </button>
        <button onClick={detectBubblesAndDraw}>
          Detect Bubbles
        </button>
      </div>

      <div style={{ marginTop: 20, maxWidth: 520 }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%" }} />

        <canvas ref={captureCanvasRef} style={{ width: "100%", marginTop: 10 }} />

        <div style={{ position: "relative", marginTop: 10 }}>
          <canvas ref={processedCanvasRef} style={{ width: "100%" }} />
          <canvas
            ref={overlayRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </main>
  );
}
