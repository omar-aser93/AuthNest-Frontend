"use client";

import { useEffect, useRef } from "react";

// Custom hook to play call sounds (a ringtone when receiving a call, a calling tone when making a call)
export function useCallSound(type: "ringtone" | "calling" | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);      // Ref to the audio element

  // useEffect to play the appropriate sound based on the 'type' parameter, and clean up on unmount or when type changes
  useEffect(() => {
    if (!type) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      return;
    }

    // Create and play the audio
    const src = type === "ringtone" ? "/sounds/ringtone.mp3" : "/sounds/calling.mp3";
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    audio.play().catch(() => {
      // Autoplay may be blocked – requires user interaction first.
      // The call buttons provide the required interaction, so this will usually work.
    });

    // Clean up the audio when unmounting or when the type changes
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [type]);
}