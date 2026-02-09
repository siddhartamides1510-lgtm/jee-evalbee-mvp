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

  const [cvReady, setCvReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "starting" | "ready" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function stopCamera() {
    try {
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setStatus("idle");
      setErrorMsg("");
    } catch {
      // ignore
    }
  }

  async function startCamera() {
    setStatus("starting");
    setErrorMsg("");

    await stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (!videoRef.current) throw new Error("Video element not found");
      videoRef.current.srcObject = stream;

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
      setErrorMsg(err?.message || "Camera failed. Check permission.");
    }
  }

  function captureFrameToCanvas() {
    const v = videoRef.current;
    const c = captureCanvasRef.current;
    if (!v || !c) return;

    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;

    c.width = w;
    c.height = h;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(v, 0, 0, w, h);
  }

  function ensureCvReadyOrWarn() {
    if (!cvReady || !window.cv) {
      alert("OpenCV is not ready yet. Wait 2–5 seconds and try again.");
      return false;
    }
    return true;
  }

  function preprocessWithOpenCV() {
    if (!ensureCvReadyOrWarn()) return;

    const cv = window.cv!;
    const srcCanvas = captureCanvasRef.current;
    const outCanvas = processedCanvasRef.current;
    if (!srcCanvas || !outCanvas) return;

    // Read captured image
    const src = cv.imread(srcCanvas);

    // Preprocess: grayscale -> blur -> adaptive threshold
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

    // Show result
    outCanvas.width = thr.cols;
    outCanvas.height = thr.rows;
    cv.imshow(outCanvas, thr);

    // Cleanup
    src.delete();
    gray.delete();
    blur.delete();
    thr.delete();
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 18, fontFamily: "system-ui" }}>
      {/* OpenCV script */}
      <Script
        src="https://docs.opencv.org/4.x/opencv.js"
        strategy="afterInteractive"
        onLoad={() => {
          // OpenCV uses onRuntimeInitialized for WASM init
          const cv = window.cv;
          if (!cv) return;
          cv["onRuntimeInitialized"] = () => setCvReady(true);
        }}
      />

      <h1 style={{ fontSize: 24, fontWeight: 900 }}>Scan (Module 6)</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Capture → OpenCV preprocess (grayscale + threshold) → show result
      </p>

      <p style={{ marginTop: 10, fontWeight: 800 }}>
        OpenCV status:{" "}
        {cvReady ? "✅ Ready" : "⏳ Loading (wait a few seconds)"}
      </p>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={startCamera}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}
        >
          Open Camera
        </button>

        <button
          onClick={stopCamera}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}
        >
          Stop
        </button>

        <button
          onClick={() => {
            captureFrameToCanvas();
            preprocessWithOpenCV();
          }}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}
        >
          Capture + Preprocess
        </button>
      </div>

      {status === "starting" && (
        <p style={{ marginTop: 10, fontWeight: 800 }}>Starting camera… wait 2–5 sec</p>
      )}
      {status === "error" && (
        <p style={{ marginTop: 10, color: "red", fontWeight: 800 }}>
          Camera Error: {errorMsg}
        </p>
      )}

      <div style={{ marginTop: 14, display: "grid", gap: 14, maxWidth: 520 }}>
        <div style={{ border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", display: "block" }} />
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: 8, fontWeight: 800, opacity: 0.8 }}>Captured frame</div>
          <canvas ref={captureCanvasRef} style={{ width: "100%", display: "block" }} />
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: 8, fontWeight: 800, opacity: 0.8 }}>
            Processed (threshold)
          </div>
          <canvas ref={processedCanvasRef} style={{ width: "100%", display: "block" }} />
        </div>
      </div>

      <p style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
        If processed image looks mostly black/white, that’s OK. We will tune thresholds later.
      </p>
    </main>
  );
}
