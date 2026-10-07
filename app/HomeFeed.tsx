"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type FeedItem =
  | { type: "image"; id: string; image_url: string; title: string | null; created_at: string }
  | { type: "comic"; id: string; slug: string; title: string; coverUrl: string | null; panel_count: number; created_at: string };

type Filter = "all" | "images" | "comics";

export default function HomeFeed({ items }: { items: FeedItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = filter === "all" ? items : items.filter((i) => i.type === (filter === "images" ? "image" : "comic"));

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-8">
        {(["all", "images", "comics"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors capitalize ${
              filter === f
                ? "bg-gray-900 text-white"
                : "text-gray-400 hover:text-gray-900"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((item) => {
            if (item.type === "image") {
              return (
                <div key={item.id} className="group block rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors">
                  <div className="aspect-[3/4] bg-gray-50 relative overflow-hidden">
                    <Image
                      src={item.image_url}
                      alt={item.title ?? "Image"}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  {item.title && (
                    <div className="px-3 py-3">
                      <p className="text-sm text-gray-700 leading-snug">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Image</p>
                    </div>
                  )}
                  {!item.title && (
                    <div className="px-3 py-3">
                      <p className="text-xs text-gray-400">Image</p>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={`/${item.slug}`}
                className="group block rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors"
              >
                <div className="aspect-[3/4] bg-gray-50 relative overflow-hidden">
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-gray-200 text-4xl select-none">◻</span>
                    </div>
                  )}
                </div>
                <div className="px-3 py-3">
                  <p className="font-medium text-gray-900 text-sm leading-snug">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Comic · {item.panel_count} {item.panel_count === 1 ? "panel" : "panels"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
