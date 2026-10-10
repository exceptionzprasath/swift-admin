import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlideToConfirmProps {
  onConfirm: () => void | Promise<void>;
  text?: string;
  completedText?: string;
  disabled?: boolean;
  isLoading?: boolean;
  isSuccess?: boolean;
  className?: string;
}

export function SlideToConfirm({
  onConfirm,
  text = "Slide to confirm",
  completedText = "Deleting...",
  disabled = false,
  isLoading = false,
  isSuccess = false,
  className,
}: SlideToConfirmProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentOffsetRef = useRef(0);
  const maxDistanceRef = useRef(0);

  // Compute maximum travel distance
  const updateMaxDistance = useCallback(() => {
    if (trackRef.current && thumbRef.current) {
      const padding = 5; // 5px padding on each side
      const trackWidth = trackRef.current.clientWidth;
      const thumbWidth = thumbRef.current.clientWidth;
      maxDistanceRef.current = Math.max(0, trackWidth - thumbWidth - padding * 2);
    }
  }, []);

  useEffect(() => {
    updateMaxDistance();
    window.addEventListener("resize", updateMaxDistance);
    return () => window.removeEventListener("resize", updateMaxDistance);
  }, [updateMaxDistance]);

  const isComplete = isConfirmed || isLoading || isProcessing || isSuccess;

  // When complete or loading, snap offset to end
  useEffect(() => {
    if (isComplete && maxDistanceRef.current > 0) {
      setOffset(maxDistanceRef.current);
    }
  }, [isComplete]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isComplete) return;
    updateMaxDistance();
    if (maxDistanceRef.current <= 0) return;

    setIsDragging(true);
    startXRef.current = e.clientX - offset;
    currentOffsetRef.current = offset;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled || isComplete) return;

    const rawOffset = e.clientX - startXRef.current;
    const clampedOffset = Math.max(0, Math.min(maxDistanceRef.current, rawOffset));
    setOffset(clampedOffset);
    currentOffsetRef.current = clampedOffset;
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    const progress = maxDistanceRef.current > 0 ? currentOffsetRef.current / maxDistanceRef.current : 0;

    if (progress >= 0.78) {
      // Snap to end and trigger action
      setOffset(maxDistanceRef.current);
      setIsConfirmed(true);
      setIsProcessing(true);

      try {
        await onConfirm();
      } catch {
        // If error, spring back
        setIsConfirmed(false);
        setOffset(0);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Smoothly spring back to beginning
      setOffset(0);
    }
  };

  const progress = maxDistanceRef.current > 0 ? offset / maxDistanceRef.current : 0;

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-[52px] max-w-[270px] w-full mx-auto rounded-full p-[5px] select-none overflow-hidden touch-none",
        isComplete
          ? "bg-[#e52525]" // Solid vibrant red when loading or complete
          : "bg-[#d4d4d8] dark:bg-[#3f3f46]", // Clean light gray track
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{
        transition: isDragging ? "none" : "background-color 220ms ease",
      }}
    >
      {/* Bright solid red fill that follows knob with ZERO delay during slide */}
      {!isComplete && (
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#e52525] pointer-events-none"
          style={{
            width: offset > 0 ? `${offset + 42 + 10}px` : "0px",
            opacity: offset > 0 ? 1 : 0,
            transition: isDragging
              ? "none"
              : "width 260ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease",
          }}
        />
      )}

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12 z-10">
        {isComplete ? (
          <span className="text-sm font-bold text-white tracking-wide flex items-center gap-2 animate-fadeIn">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            {completedText}
          </span>
        ) : (
          <span
            className="text-sm font-semibold text-neutral-900 tracking-tight"
            style={{
              opacity: Math.max(0, 1 - progress * 2),
              transition: isDragging ? "none" : "opacity 150ms ease",
            }}
          >
            {text}
          </span>
        )}
      </div>

      {/* Draggable circular white knob */}
      <div
        ref={thumbRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "absolute top-[5px] bottom-[5px] w-[42px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.25)] select-none z-20",
          isDragging ? "cursor-grabbing" : "cursor-grab hover:scale-[1.02]",
          isComplete && "cursor-default pointer-events-none"
        )}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging
            ? "none"
            : "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {isComplete ? (
          isSuccess ? (
            <Check className="w-5 h-5 text-[#e52525] stroke-[3] animate-scaleIn" />
          ) : (
            <Loader2 className="w-5 h-5 text-[#e52525] animate-spin" />
          )
        ) : (
          <ChevronRight className="w-5 h-5 text-neutral-900 stroke-[3] ml-0.5" />
        )}
      </div>
    </div>
  );
}
