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

const FADE_MS = 400;

const ORIGINS = [
  "20% 20%", "50% 20%", "80% 20%",
  "20% 50%", "50% 50%", "80% 50%",
  "20% 80%", "50% 80%", "80% 80%",
];

export default function ComicReader({ title, panels, autospeed }: Props) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [faded, setFaded] = useState(false); // true = black overlay visible
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitioningRef = useRef(false);
  const total = panels.length;
  const originRef = useRef(ORIGINS[Math.floor(Math.random() * ORIGINS.length)]);

  // Fade-to-black then swap panel then fade in
  const changeTo = useCallback((next: number) => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setFaded(true);
    setTimeout(() => {
      originRef.current = ORIGINS[Math.floor(Math.random() * ORIGINS.length)];
      setCurrent(next);
      setTimeout(() => {
        setFaded(false);
        transitioningRef.current = false;
      }, FADE_MS);
    }, FADE_MS);
  }, []);

  const goNext = useCallback(() => {
    changeTo((current + 1) % total);
  }, [changeTo, current, total]);

  const goPrev = useCallback(() => {
    changeTo((current - 1 + total) % total);
  }, [changeTo, current, total]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (playing && total > 1) {
      intervalRef.current = setInterval(() => {
        // Use functional update so we always have fresh current
        setCurrent((c) => {
          const next = (c + 1) % total;
          if (!transitioningRef.current) {
            transitioningRef.current = true;
            setFaded(true);
            setTimeout(() => {
              originRef.current = ORIGINS[Math.floor(Math.random() * ORIGINS.length)];
              setCurrent(next);
              setTimeout(() => {
                setFaded(false);
                transitioningRef.current = false;
              }, FADE_MS);
            }, FADE_MS);
          }
          return c; // actual update happens inside timeout
        });
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
        className="flex-1 flex items-center justify-center px-4 py-6 cursor-pointer overflow-hidden relative"
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
              animation: `kenburns ${autospeed}s linear forwards`,
              transformOrigin: originRef.current,
            }}
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* Fade-to-black overlay */}
        <div
          className="absolute inset-0 bg-black pointer-events-none"
          style={{
            opacity: faded ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 px-6 py-4 border-t border-white/10">
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="Previous panel"
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-lg"
        >
          ←
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setPlaying((p) => !p); }}
          aria-label={playing ? "Pause" : "Play"}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-colors text-base font-medium"
        >
          {playing ? "⏸" : "▶"}
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
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
              onClick={() => changeTo(i)}
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
