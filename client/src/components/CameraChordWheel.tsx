import {
  Camera,
  CameraOff,
  ChevronLeft,
  Fingerprint,
  Hand,
  LoaderCircle,
  LockKeyhole,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";
import { GuitarEngine, type ChordName } from "@/lib/guitar";

type TrackingStatus = "idle" | "requesting" | "loading-model" | "tracking" | "denied" | "unavailable" | "error";

type Props = {
  engine: GuitarEngine;
  onBack: () => void;
};

export type WheelGeometry = {
  centerX: number;
  centerY: number;
  outerRadius: number;
  innerRadius: number;
};

const WHEEL_CHORDS: ChordName[] = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export function getWheelGeometry(width: number, height: number): WheelGeometry {
  const outerRadius = Math.min(width, height) * (width < 680 ? 0.39 : 0.35);
  return {
    centerX: width * 0.5,
    centerY: height * (width < 680 ? 0.52 : 0.54),
    outerRadius,
    innerRadius: outerRadius * 0.58,
  };
}

export function getChordAtPoint(x: number, y: number, geometry: WheelGeometry) {
  const deltaX = x - geometry.centerX;
  const deltaY = y - geometry.centerY;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < geometry.innerRadius || distance > geometry.outerRadius) return null;

  let angle = Math.atan2(deltaY, deltaX) + Math.PI / 2;
  if (angle < 0) angle += Math.PI * 2;
  const index = Math.floor(angle / ((Math.PI * 2) / WHEEL_CHORDS.length));
  return WHEEL_CHORDS[index] ?? null;
}

function drawWheel(
  canvas: HTMLCanvasElement,
  activeChord: ChordName | null,
  finger: { x: number; y: number } | null,
  hasHand: boolean,
) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }

  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const geometry = getWheelGeometry(width, height);
  const segmentAngle = (Math.PI * 2) / WHEEL_CHORDS.length;
  const startOffset = -Math.PI / 2;

  context.save();
  context.translate(geometry.centerX, geometry.centerY);
  const ambient = context.createRadialGradient(0, 0, geometry.innerRadius * 0.1, 0, 0, geometry.outerRadius * 1.2);
  ambient.addColorStop(0, "rgba(12, 13, 13, 0.08)");
  ambient.addColorStop(0.62, "rgba(10, 11, 11, 0.22)");
  ambient.addColorStop(1, "rgba(10, 11, 11, 0.72)");
  context.fillStyle = ambient;
  context.beginPath();
  context.arc(0, 0, geometry.outerRadius * 1.16, 0, Math.PI * 2);
  context.fill();
  context.restore();

  WHEEL_CHORDS.forEach((chord, index) => {
    const start = startOffset + index * segmentAngle;
    const end = start + segmentAngle;
    const selected = chord === activeChord;

    context.beginPath();
    context.arc(geometry.centerX, geometry.centerY, geometry.outerRadius, start, end);
    context.arc(geometry.centerX, geometry.centerY, geometry.innerRadius, end, start, true);
    context.closePath();
    context.fillStyle = selected ? "rgba(217, 164, 65, 0.34)" : "rgba(17, 18, 18, 0.56)";
    context.fill();
    context.strokeStyle = selected ? "rgba(244, 210, 137, 0.9)" : "rgba(238, 234, 225, 0.16)";
    context.lineWidth = selected ? 1.8 : 0.7;
    context.stroke();

    const mid = start + segmentAngle / 2;
    const labelRadius = (geometry.innerRadius + geometry.outerRadius) / 2;
    const labelX = geometry.centerX + Math.cos(mid) * labelRadius;
    const labelY = geometry.centerY + Math.sin(mid) * labelRadius;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = selected
      ? `600 ${Math.max(15, geometry.outerRadius * 0.087)}px Manrope, sans-serif`
      : `500 ${Math.max(13, geometry.outerRadius * 0.07)}px DM Mono, monospace`;
    context.fillStyle = selected ? "#fff2d1" : "rgba(238, 234, 225, 0.78)";
    context.fillText(chord, labelX, labelY + 1);
  });

  context.beginPath();
  context.arc(geometry.centerX, geometry.centerY, geometry.innerRadius * 0.84, 0, Math.PI * 2);
  context.strokeStyle = activeChord ? "rgba(217, 164, 65, 0.32)" : "rgba(238, 234, 225, 0.09)";
  context.lineWidth = 1;
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(238, 234, 225, 0.46)";
  context.font = "500 9px DM Mono, monospace";
  context.fillText(hasHand ? "INDEX FINGER" : "SHOW YOUR HAND", geometry.centerX, geometry.centerY - 21);
  context.fillStyle = activeChord ? "#f3ead7" : "rgba(238, 234, 225, 0.82)";
  context.font = `400 ${Math.max(42, geometry.innerRadius * 0.5)}px Instrument Serif, serif`;
  context.fillText(activeChord ?? "—", geometry.centerX, geometry.centerY + 14);
  context.fillStyle = activeChord ? "#d9a441" : "rgba(238, 234, 225, 0.32)";
  context.font = "500 8px DM Mono, monospace";
  context.fillText(activeChord ? "ARPEGGIO PLAYING" : "MOVE INTO THE RING", geometry.centerX, geometry.centerY + 50);

  if (finger) {
    context.beginPath();
    context.arc(finger.x, finger.y, 18, 0, Math.PI * 2);
    context.fillStyle = activeChord ? "rgba(217, 164, 65, 0.15)" : "rgba(238, 234, 225, 0.08)";
    context.fill();
    context.beginPath();
    context.arc(finger.x, finger.y, 6, 0, Math.PI * 2);
    context.fillStyle = activeChord ? "#f0bd58" : "#eeeae1";
    context.shadowBlur = 18;
    context.shadowColor = activeChord ? "rgba(217, 164, 65, 0.85)" : "rgba(238, 234, 225, 0.45)";
    context.fill();
    context.shadowBlur = 0;
  }
}

function statusCopy(status: TrackingStatus) {
  switch (status) {
    case "requesting":
      return "カメラの許可を待っています";
    case "loading-model":
      return "指先モデルを読み込み中";
    case "tracking":
      return "指先をトラッキング中";
    case "denied":
      return "カメラへのアクセスが許可されていません";
    case "unavailable":
      return "利用できるカメラが見つかりません";
    case "error":
      return "カメラを開始できませんでした";
    default:
      return "カメラは停止中です";
  }
}

export default function CameraChordWheel({ engine, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeChordRef = useRef<ChordName | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastInferenceRef = useRef(0);
  const missingFramesRef = useRef(0);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [activeChord, setActiveChord] = useState<ChordName | null>(null);
  const [handVisible, setHandVisible] = useState(false);

  const stopSound = useCallback(() => {
    engine.stopArpeggio();
    activeChordRef.current = null;
    setActiveChord(null);
  }, [engine]);

  const selectChord = useCallback(
    (nextChord: ChordName | null) => {
      if (nextChord === activeChordRef.current) return;
      engine.stopArpeggio();
      activeChordRef.current = nextChord;
      setActiveChord(nextChord);
      if (nextChord) void engine.startArpeggio(nextChord, 0, 108);
    },
    [engine],
  );

  const drawIdleWheel = useCallback(() => {
    if (!canvasRef.current || status === "tracking") return;
    drawWheel(canvasRef.current, activeChordRef.current, null, false);
  }, [status]);

  useEffect(() => {
    drawIdleWheel();
    window.addEventListener("resize", drawIdleWheel);
    return () => window.removeEventListener("resize", drawIdleWheel);
  }, [drawIdleWheel]);

  const renderLoop = useCallback(() => {
    if (!mountedRef.current || status !== "tracking") return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker) return;

    const now = performance.now();
    let tip: NormalizedLandmark | null = null;
    let processedFrame = false;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTimeRef.current && now - lastInferenceRef.current > 32) {
      lastVideoTimeRef.current = video.currentTime;
      lastInferenceRef.current = now;
      const result = landmarker.detectForVideo(video, now);
      tip = result.landmarks[0]?.[8] ?? null;
      processedFrame = true;
    }

    if (!processedFrame) {
      animationFrameRef.current = window.requestAnimationFrame(renderLoop);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (tip) {
      missingFramesRef.current = 0;
      const finger = { x: (1 - tip.x) * rect.width, y: tip.y * rect.height };
      const chord = getChordAtPoint(finger.x, finger.y, getWheelGeometry(rect.width, rect.height));
      selectChord(chord);
      setHandVisible(true);
      drawWheel(canvas, chord, finger, true);
    } else {
      missingFramesRef.current += 1;
      if (missingFramesRef.current > 2) {
        selectChord(null);
        setHandVisible(false);
      }
      drawWheel(canvas, activeChordRef.current, null, false);
    }

    animationFrameRef.current = window.requestAnimationFrame(renderLoop);
  }, [selectChord, status]);

  useEffect(() => {
    if (status === "tracking") {
      animationFrameRef.current = window.requestAnimationFrame(renderLoop);
    }
    return () => {
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [renderLoop, status]);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    try {
      landmarkerRef.current?.close();
    } catch {
      // MediaPipe may already be disposing its graph.
    }
    landmarkerRef.current = null;
    lastVideoTimeRef.current = -1;
    setHandVisible(false);
    stopSound();
    setStatus("idle");
  }, [stopSound]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      try {
        landmarkerRef.current?.close();
      } catch {
        // Cleanup should remain safe during navigation.
      }
      engine.stopArpeggio();
    };
  }, [engine]);

  const startCamera = async () => {
    try {
      setStatus("requesting");
      await engine.activate();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      setStatus("loading-model");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      let landmarker: HandLandmarker;
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.56,
          minHandPresenceConfidence: 0.52,
          minTrackingConfidence: 0.52,
        });
      } catch {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.56,
          minHandPresenceConfidence: 0.52,
          minTrackingConfidence: 0.52,
        });
      }
      if (!mountedRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      setStatus("tracking");
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      const unavailable = error instanceof DOMException && (error.name === "NotFoundError" || error.name === "DevicesNotFoundError");
      setStatus(denied ? "denied" : unavailable ? "unavailable" : "error");
      stopSound();
    }
  };

  const isBusy = status === "requesting" || status === "loading-model";
  const isTracking = status === "tracking";

  return (
    <main className="camera-mode">
      <div className="camera-noise" aria-hidden="true" />
      <header className="camera-topbar">
        <button type="button" className="camera-back" onClick={() => { stopCamera(); onBack(); }}>
          <ChevronLeft size={15} />
          STRUMKEY
        </button>
        <div className="camera-title">
          <span>CAMERA CHORD WHEEL</span>
          <small>GESTURE INSTRUMENT · 02</small>
        </div>
        <div className={`tracking-pill ${isTracking ? "live" : ""}`}>
          <i />
          {isTracking ? "TRACKING" : "OFFLINE"}
        </div>
      </header>

      <section className="camera-stage">
        <video ref={videoRef} className="camera-feed" playsInline muted aria-label="ウェブカメラ映像" />
        <div className="camera-vignette" aria-hidden="true" />
        <div className="camera-scanlines" aria-hidden="true" />
        <canvas ref={canvasRef} className="wheel-canvas" aria-label="指で操作するコード環" />

        {!isTracking && (
          <div className="camera-onboarding">
            <div className="onboarding-icon">
              {isBusy ? <LoaderCircle className="spin" size={30} /> : <Hand size={31} strokeWidth={1.35} />}
            </div>
            <span className="camera-kicker">TOUCH THE SOUND</span>
            <h1>指先で、<em>コードを選ぶ。</em></h1>
            <p>
              カメラに人差し指を見せ、円環のコードに重ねてください。
              <br />触れている間だけアルペジオが流れます。
            </p>
            <button type="button" className="start-camera" onClick={() => void startCamera()} disabled={isBusy}>
              {isBusy ? <LoaderCircle className="spin" size={16} /> : <Camera size={16} />}
              {status === "requesting"
                ? "許可を待っています"
                : status === "loading-model"
                  ? "指先モデルを準備中"
                  : status === "denied"
                    ? "カメラを再度許可する"
                    : status === "unavailable"
                      ? "カメラを再検出"
                    : "カメラを起動"}
            </button>
            <div className="privacy-note">
              <LockKeyhole size={12} />
              映像は端末内で処理され、保存・送信されません
            </div>
          </div>
        )}

        {isTracking && (
          <div className="camera-hud">
            <div className="hud-block">
              <span>VISION</span>
              <strong>{handVisible ? "HAND LOCKED" : "SEARCHING"}</strong>
            </div>
            <div className="hud-block current-hud">
              <span>ACTIVE CHORD</span>
              <strong>{activeChord ?? "—"}</strong>
            </div>
            <div className="hud-block">
              <span>ARP RATE</span>
              <strong>108 BPM</strong>
            </div>
          </div>
        )}

        <div className="corner-mark top-left" aria-hidden="true" />
        <div className="corner-mark top-right" aria-hidden="true" />
        <div className="corner-mark bottom-left" aria-hidden="true" />
        <div className="corner-mark bottom-right" aria-hidden="true" />
      </section>

      <footer className="camera-footer">
        <div className="camera-status">
          <span className={isTracking ? "live" : ""}><i /></span>
          <div>
            <small>STATUS</small>
            <strong>{statusCopy(status)}</strong>
          </div>
        </div>
        <div className="camera-instructions">
          <span><Fingerprint size={15} /> 人差し指を円環に重ねる</span>
          <span><Sparkles size={15} /> 触れている間だけ再生</span>
          <span><ScanLine size={15} /> 指を離すと停止</span>
        </div>
        {isTracking ? (
          <button type="button" className="stop-camera" onClick={stopCamera}>
            <CameraOff size={14} /> STOP CAMERA
          </button>
        ) : (
          <span className="local-processing">ON-DEVICE VISION</span>
        )}
      </footer>
    </main>
  );
}
