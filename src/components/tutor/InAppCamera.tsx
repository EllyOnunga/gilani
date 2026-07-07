import { useEffect, useRef, useState } from "react";
import { X, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

type Props = {
  onCapture: (file: File) => void;
  onClose: () => void;
};

export function InAppCamera({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isInitializing, setIsInitializing] = useState(true);

  const startCamera = async (mode: "environment" | "user") => {
    setIsInitializing(true);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (!window.isSecureContext) {
        toast.error("Camera requires a secure connection (HTTPS) on mobile.");
      } else {
        toast.error("Camera access denied. Please allow permissions in your browser settings.");
      }
      onClose();
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontally if front camera is used so the image isn't mirrored
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Failed to capture image.");
        return;
      }
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
    }, "image/jpeg", 0.9);
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="flex h-16 items-center justify-between px-4 bg-black/40 text-white z-10 absolute top-0 left-0 right-0">
        <button onClick={onClose} className="p-3 active:scale-90 transition-transform bg-black/40 rounded-full backdrop-blur-md">
          <X className="w-6 h-6" />
        </button>
        <button onClick={toggleCamera} className="p-3 active:scale-90 transition-transform bg-black/40 rounded-full backdrop-blur-md">
          <RefreshCcw className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <span className="animate-pulse">Starting camera...</span>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
        />
      </div>

      <div className="h-32 flex items-center justify-center pb-8 absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent">
        <button
          onClick={handleCapture}
          className="w-20 h-20 rounded-full border-[6px] border-white/80 flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-black/50"
        >
          <div className="w-16 h-16 rounded-full bg-white shadow-inner" />
        </button>
      </div>
    </div>
  );
}
