"use client";
import Image from "next/image";

/**
 * Logo component uses the primary PNG (better for some email/social contexts).
 */
export function Logo({ className = "", priority = false, width = 208, height = 96 }: { className?: string; priority?: boolean; width?: number; height?: number }) {
  return (
    <Image
      src="/tiny-diner-logo.png"
      alt="Tiny Diner logo"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
