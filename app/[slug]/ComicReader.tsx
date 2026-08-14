"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Panel } from "@/lib/supabase";

interface Props {
  title: string;
  panels: Panel[];
  autospeed: number;
  fadeDuration: number;
  transitionType: string;
  zoomAmount: number;
  zoomOrigin: string;
  bgColor: string;
}

const ORIGINS = [
  "20% 20%", "50% 20%", "80% 20%",
  "20% 50%", "50% 50%", "80% 50%",
  "20% 80%", "50% 80%", "80% 80%",
];

function pickOrigin(zoomOrigin: string): string {
  if (zoomOrigin === "random") return ORIGINS[Math.floor(Math.random() * ORIGINS.length)];
  return zoomOrigin;
}

export default function ComicReader({ title, panels, autospeed, fadeDuration, transitionType, zoomAmount, zoomOrigin, bgColor }: Props) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0); // for fade-black
  const [crossfadeIn, setCrossfadeIn] = useState(false);    // for crossfade
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitioningRef = useRef(false);
  const originRef = useRef(pickOrigin(zoomOrigin));
  const total = panels.length;

  const doTransition = useCallback((nextIndex: number) => {
    if (transitioningRef.current || nextIndex === current) return;
    transitioningRef.current = true;

    if (transitionType === "instant") {
      originRef.current = pickOrigin(zoomOrigin);
      setCurrent(nextIndex);
      transitioningRef.current = false;
      return;
    }

    if (transitionType === "crossfade") {
      setPrev(current);
      originRef.current = pickOrigin(zoomOrigin);
      setCurrent(nextIndex);
      setCrossfadeIn(false);
      // tiny delay to let prev render, then fade in new panel
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCrossfadeIn(true);
          setTimeout(() => {
            setPrev(null);
            transitioningRef.current = false;
          }, fadeDuration);
        });
      });
      return;
    }

    // fade-black (default)
    setOverlayOpacity(1);
    setTimeout(() => {
      originRef.current = pickOrigin(zoomOrigin);
      setCurrent(nextIndex);
      setTimeout(() => {
        setOverlayOpacity(0);
        transitioningRef.current = false;
      }, fadeDuration);
    }, fadeDuration);
  }, [current, fadeDuration, transitionType, zoomOrigin]);

  const goNext = useCallback(() => {
    doTransition((current + 1) % total);
  }, [doTransition, current, total]);

  const goPrev = useCallback(() => {
    doTransition((current - 1 + total) % total);
  }, [doTransition, current, total]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (playing && total > 1) {
      intervalRef.current = setInterval(() => {
        setCurrent((c) => {
          const next = (c + 1) % total;
          if (!transitioningRef.current) {
            transitioningRef.current = true;

            if (transitionType === "instant") {
              originRef.current = pickOrigin(zoomOrigin);
              setCurrent(next);
              transitioningRef.current = false;
            } else if (transitionType === "crossfade") {
              setPrev(c);
              originRef.current = pickOrigin(zoomOrigin);
              setCurrent(next);
              setCrossfadeIn(false);
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setCrossfadeIn(true);
                  setTimeout(() => {
                    setPrev(null);
                    transitioningRef.current = false;
                  }, fadeDuration);
                });
              });
            } else {
              setOverlayOpacity(1);
              setTimeout(() => {
                originRef.current = pickOrigin(zoomOrigin);
                setCurrent(next);
                setTimeout(() => {
                  setOverlayOpacity(0);
                  transitioningRef.current = false;
                }, fadeDuration);
              }, fadeDuration);
            }
          }
          return c;
        });
      }, autospeed * 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [playing, autospeed, total, clearTimer, fadeDuration, transitionType, zoomOrigin]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "p") setPlaying((p) => !p);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  if (total === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white" style={{ backgroundColor: bgColor }}>
        <p className="text-gray-500 text-sm">No panels in this series yet.</p>
        <Link href="/" className="mt-6 text-xs text-gray-600 hover:text-gray-400 underline">← Back</Link>
      </div>
    );
  }

  const scaleFrom = 1 + zoomAmount / 100;
  const panelImageStyle = {
    animation: `kenburns ${autospeed}s linear forwards`,
    transformOrigin: originRef.current,
    ["--kb-scale" as string]: scaleFrom,
  };

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← All Comics</Link>
        <span className="text-xs text-gray-500 font-medium tracking-wide">{title}</span>
        <span className="text-xs text-gray-600 tabular-nums">{current + 1} / {total}</span>
      </div>

      {/* Panel display */}
      <div
        className="flex-1 flex items-center justify-center px-4 py-6 cursor-pointer overflow-hidden relative"
        onClick={goNext}
      >
        {/* Previous panel (crossfade only) */}
        {transitionType === "crossfade" && prev !== null && (
          <div className="absolute inset-0 flex items-center justify-center px-4 py-6">
            <div className="relative w-full max-w-3xl overflow-hidden rounded-sm">
              <Image
                src={panels[prev].image_url}
                alt={`Panel ${prev + 1}`}
                width={1200}
                height={900}
                className="w-full h-auto object-contain"
                style={{ opacity: crossfadeIn ? 0 : 1, transition: `opacity ${fadeDuration}ms ease-in-out` }}
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>
          </div>
        )}

        {/* Current panel */}
        <div
          className="relative w-full max-w-3xl overflow-hidden rounded-sm"
          style={transitionType === "crossfade" ? {
            opacity: crossfadeIn ? 1 : (prev !== null ? 0 : 1),
            transition: `opacity ${fadeDuration}ms ease-in-out`,
          } : {}}
        >
          <Image
            key={`${panels[current].id}-${originRef.current}`}
            src={panels[current].image_url}
            alt={`Panel ${current + 1}`}
            width={1200}
            height={900}
            className="w-full h-auto object-contain"
            style={panelImageStyle}
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* Fade-to-black overlay */}
        {transitionType === "fade-black" && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: bgColor, opacity: overlayOpacity, transition: `opacity ${fadeDuration}ms ease-in-out` }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 px-6 py-4 border-t border-white/10">
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous panel"
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-lg">
          ←
        </button>
        <button onClick={(e) => { e.stopPropagation(); setPlaying((p) => !p); }} aria-label={playing ? "Pause" : "Play"}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-colors text-base font-medium">
          {playing ? "⏸" : "▶"}
        </button>
        <button onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next panel"
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-lg">
          →
        </button>
      </div>

      {/* Dot indicator */}
      {total <= 30 && (
        <div className="flex items-center justify-center gap-1.5 pb-5">
          {panels.map((_, i) => (
            <button key={i} onClick={() => doTransition(i)} aria-label={`Go to panel ${i + 1}`}
              className={`rounded-full transition-all ${i === current ? "w-2 h-2 bg-white" : "w-1.5 h-1.5 bg-white/25 hover:bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
