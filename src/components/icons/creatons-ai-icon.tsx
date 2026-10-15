import React from "react";
import { cn } from "@/lib/utils";

export interface CreatonsAiIconProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
  variant?: "mask" | "img";
}

/**
 * Creatons AI neural microchip & circuit icon.
 * Supports theme-adaptive coloring via CSS mask-image + currentColor,
 * or direct high-res image rendering.
 */
export function CreatonsAiIcon({
  className,
  variant = "mask",
  style,
  ...props
}: CreatonsAiIconProps) {
  if (variant === "img") {
    return (
      <img
        src="/creatons-ai-icon.png"
        alt="Creatons AI"
        className={cn("inline-block shrink-0 object-contain select-none", className)}
        style={style}
        {...(props as React.ImgHTMLAttributes<HTMLImageElement>)}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label="Creatons AI"
      className={cn("inline-block shrink-0 bg-current transition-colors select-none", className)}
      style={{
        maskImage: "url(/creatons-ai-icon.png)",
        WebkitMaskImage: "url(/creatons-ai-icon.png)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        ...style,
      }}
      {...props}
    />
  );
}
