"use client";
import Image from "next/image";
import { useState } from "react";

/**
 * Logo component tries primary PNG (better for some email/social contexts) and falls back to SVG if it fails.
 */
export function Logo({ className = "", priority = false, width = 208, height = 96 }: { className?: string; priority?: boolean; width?: number; height?: number }) {
  const [src, setSrc] = useState("/tiny-diner-logo-2.png");
  return (
    <Image
      src={src}
      alt="Tiny Diner logo"
      width={width}
      height={height}
      priority={priority}
      className={className}
      onError={() => {
        if (src !== "/tiny-diner-logo.svg") setSrc("/tiny-diner-logo.svg");
      }}
    />
  );
}
