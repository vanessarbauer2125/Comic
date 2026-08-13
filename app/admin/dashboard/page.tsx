"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SeriesSummary {
  id: string;
  title: string;
  slug: string;
  autoplay_speed: number;
  created_at: string;
  panel_count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [series, setSeries] = useState<SeriesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [createError, setCreateError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSeries();
  }, []);

  async function loadSeries() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/series");
      if (res.status === 401) {
        router.push("/admin");
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSeries(data);
    } catch (e) {
      setError("Failed to load series.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function titleToSlug(t: string) {
    return t
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          slug: newSlug || titleToSlug(newTitle),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setCreateError(d.error ?? "Failed to create");
        return;
      }
      const created = await res.json();
      router.push(`/admin/series/${created.id}`);
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            View site
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-medium text-gray-900">All Series</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            {showForm ? "Cancel" : "+ New Series"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white border border-gray-100 rounded-lg p-5 mb-6 space-y-4"
          >
            <h3 className="text-sm font-medium text-gray-900">Create Series</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  setNewSlug(titleToSlug(e.target.value));
                }}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="My Comic Series"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Slug</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono"
                placeholder="my-comic-series"
              />
            </div>
            {createError && (
              <p className="text-sm text-red-600">{createError}</p>
            )}
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
        )}

        {loading && (
          <div className="text-sm text-gray-400 py-8 text-center">
            Loading…
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        {!loading && series.length === 0 && (
          <p className="text-sm text-gray-400 py-8 text-center">
            No series yet. Create your first one above.
          </p>
        )}

        {!loading && series.length > 0 && (
          <div className="space-y-2">
            {series.map((s) => (
              <Link
                key={s.id}
                href={`/admin/series/${s.id}`}
                className="flex items-center gap-4 bg-white border border-gray-100 rounded-lg px-5 py-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {s.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    /{s.slug} · {s.panel_count} panels
                  </p>
                </div>
                <span className="text-xs text-gray-300">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
