"use client";

import { forwardRef } from "react";

/** Schlichter Player; die signierte URL läuft nach einer Stunde ab (Seite neu laden). */
export const AudioSpieler = forwardRef<HTMLAudioElement, { src: string; onTimeUpdate?: (t: number) => void }>(function AudioSpieler(
  { src, onTimeUpdate },
  ref,
) {
  return (
    <audio
      ref={ref}
      controls
      preload="metadata"
      src={src}
      onTimeUpdate={onTimeUpdate ? (e) => onTimeUpdate(e.currentTarget.currentTime) : undefined}
      className="w-full max-w-lg h-10"
    >
      Dein Browser kann diese Aufnahme nicht abspielen.
    </audio>
  );
});
