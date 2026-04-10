"use client";

import { useEffect, useRef } from "react";

type WaveformProps = {
  mediaStream: MediaStream | null;
  isActive: boolean;
};

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const ACCENT_COLOR = "#7c83ff";
const IDLE_COLOR = "rgba(124, 131, 255, 0.2)";

export function Waveform({ mediaStream, isActive }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const opacityRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cleanup previous audio graph
    const cleanup = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
    };

    cleanup();

    if (!mediaStream || !isActive) {
      // Draw idle flat line
      opacityRef.current = 0;

      const drawIdle = () => {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = IDLE_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
      };

      drawIdle();
      return;
    }

    // Build audio graph
    const audioCtx = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(mediaStream);
    sourceRef.current = source;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(draw);

      if (timestamp - lastFrameTime.current < FRAME_INTERVAL) return;
      lastFrameTime.current = timestamp;

      // Fade in
      opacityRef.current = Math.min(1, opacityRef.current + 0.08);

      analyser.getByteTimeDomainData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.globalAlpha = opacityRef.current;
      ctx.strokeStyle = ACCENT_COLOR;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();

      const sliceWidth = w / bufferLength;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128 - 1; // [-1, 1]
        const y = (v * h) / 2 + h / 2;
        const x = i * sliceWidth;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    rafRef.current = requestAnimationFrame(draw);

    return cleanup;
  }, [mediaStream, isActive]);

  // Resize observer to match canvas width to parent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width;
        canvas.height = 48;
      }
    });

    observer.observe(canvas.parentElement ?? canvas);
    canvas.width = canvas.offsetWidth || 300;
    canvas.height = 48;

    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      height={48}
      style={{ width: "100%", height: "48px", display: "block" }}
    />
  );
}
