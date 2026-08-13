"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Panel } from "@/lib/supabase";

interface Props {
  title: string;
  panels: Panel[];
  autospeed: number;
}

export default function ComicReader({ title, panels, autospeed }: Props) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = panels.length;

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + total) % total);
  }, [total]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (playing && total > 1) {
      intervalRef.current = setInterval(() => {
        setCurrent((c) => (c + 1) % total);
      }, autospeed * 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [playing, autospeed, total, clearTimer]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "p") {
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  if (total === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <p className="text-gray-500 text-sm">No panels in this series yet.</p>
        <Link href="/" className="mt-6 text-xs text-gray-600 hover:text-gray-400 underline">
          ← Back
        </Link>
      </div>
    );
  }

  const panel = panels[current];

  return (
    <div className="min-h-screen bg-black flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <Link
          href="/"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← All Comics
        </Link>
        <span className="text-xs text-gray-500 font-medium tracking-wide">
          {title}
        </span>
        <span className="text-xs text-gray-600 tabular-nums">
          {current + 1} / {total}
        </span>
      </div>

      {/* Panel display */}
      <div
        className="flex-1 flex items-center justify-center px-4 py-6 cursor-pointer overflow-hidden"
        onClick={goNext}
      >
        <div className="relative w-full max-w-3xl overflow-hidden rounded-sm">
          <Image
            key={panel.id}
            src={panel.image_url}
            alt={`Panel ${current + 1}`}
            width={1200}
            height={900}
            className="w-full h-auto object-contain"
            style={{
              animation: `kenburns ${autospeed}s ease-in-out forwards`,
            }}
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 px-6 py-4 border-t border-white/10">
        <button
          onClick={goPrev}
          aria-label="Previous panel"
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-lg"
        >
          ←
        </button>

        <button
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause" : "Play"}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-colors text-base font-medium"
        >
          {playing ? "⏸" : "▶"}
        </button>

        <button
          onClick={goNext}
          aria-label="Next panel"
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-lg"
        >
          →
        </button>
      </div>

      {/* Panel dot indicator */}
      {total <= 30 && (
        <div className="flex items-center justify-center gap-1.5 pb-5">
          {panels.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to panel ${i + 1}`}
              className={`rounded-full transition-all ${
                i === current
                  ? "w-2 h-2 bg-white"
                  : "w-1.5 h-1.5 bg-white/25 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
