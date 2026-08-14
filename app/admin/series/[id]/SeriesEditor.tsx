"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Series, Panel } from "@/lib/supabase";

interface Props {
  series: Series & { panels: Panel[] };
}

interface SortablePanelProps {
  panel: Panel;
  isCover: boolean;
  onSetCover: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}

function SortablePanel({
  panel,
  isCover,
  onSetCover,
  onDelete,
  deleting,
}: SortablePanelProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: panel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg overflow-hidden border-2 ${
        isCover ? "border-gray-900" : "border-gray-100"
      } bg-gray-50`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center rounded bg-white/80 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Drag to reorder"
      >
        ⠿
      </div>

      {/* Cover badge */}
      {isCover && (
        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded font-medium">
          Cover
        </div>
      )}

      <div className="aspect-[4/3] relative">
        <Image
          src={panel.image_url}
          alt={`Panel ${panel.display_order + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
      </div>

      <div className="flex items-center justify-between px-2 py-1.5 bg-white">
        <span className="text-xs text-gray-400">#{panel.display_order + 1}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isCover && (
            <button
              onClick={() => onSetCover(panel.id)}
              title="Set as cover"
              className="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              Cover
            </button>
          )}
          <button
            onClick={() => onDelete(panel.id)}
            disabled={deleting}
            title="Delete panel"
            className="text-xs px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
          >
            Del
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SeriesEditor({ series }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(series.title);
  const [slug, setSlug] = useState(series.slug);
  const [description, setDescription] = useState(series.description ?? "");
  const [autospeed, setAutospeed] = useState(series.autoplay_speed ?? 3.5);
  const [fadeDuration, setFadeDuration] = useState(series.fade_duration ?? 400);
  const [transitionType, setTransitionType] = useState(series.transition_type ?? "fade-black");
  const [zoomAmount, setZoomAmount] = useState(series.zoom_amount ?? 2.5);
  const [zoomOrigin, setZoomOrigin] = useState(series.zoom_origin ?? "random");
  const [bgColor, setBgColor] = useState(series.background_color ?? "#000000");
  const [panels, setPanels] = useState<Panel[]>(series.panels ?? []);
  const [coverPanelId, setCoverPanelId] = useState<string | null>(
    series.cover_panel_id
  );

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`/api/admin/series/${series.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, description, autoplay_speed: autospeed, cover_panel_id: coverPanelId, fade_duration: fadeDuration, transition_type: transitionType, zoom_amount: zoomAmount, zoom_origin: zoomOrigin, background_color: bgColor }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveMsg(`Error: ${d.error}`);
      } else {
        setSaveMsg("Saved!");
        setTimeout(() => setSaveMsg(""), 2000);
      }
    } catch {
      setSaveMsg("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError("");
    setUploading(true);

    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));

    try {
      const res = await fetch(`/api/admin/series/${series.id}/panels`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.panels?.length > 0) {
        setPanels((prev) => [...prev, ...data.panels]);
      }
      if (data.errors?.length > 0) {
        setUploadError(`${data.errors.length} file(s) failed to upload.`);
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = panels.findIndex((p) => p.id === active.id);
      const newIndex = panels.findIndex((p) => p.id === over.id);
      const newOrder = arrayMove(panels, oldIndex, newIndex).map((p, i) => ({
        ...p,
        display_order: i,
      }));
      setPanels(newOrder);

      try {
        await fetch(`/api/admin/series/${series.id}/panels/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: newOrder.map((p) => p.id) }),
        });
      } catch {
        // Silently fail — UI already updated optimistically
      }
    },
    [panels, series.id]
  );

  async function handleSetCover(panelId: string) {
    setCoverPanelId(panelId);
    try {
      await fetch(`/api/admin/series/${series.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_panel_id: panelId }),
      });
    } catch {
      // silent
    }
  }

  async function handleDelete(panelId: string) {
    if (!confirm("Delete this panel?")) return;
    setDeletingId(panelId);
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/series/${series.id}/panels/${panelId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setPanels((prev) => prev.filter((p) => p.id !== panelId));
        if (coverPanelId === panelId) setCoverPanelId(null);
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
      setDeleting(false);
    }
  }

  async function handleDeleteSeries() {
    if (!confirm(`Delete "${series.title}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/admin/series/${series.id}`, { method: "DELETE" });
      router.push("/admin/dashboard");
    } catch {
      // silent
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm text-gray-900 font-medium">{series.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/${series.slug}`}
            target="_blank"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Preview ↗
          </Link>
          <button
            onClick={handleDeleteSeries}
            className="text-sm text-red-400 hover:text-red-600 transition-colors"
          >
            Delete series
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Series settings */}
        <section className="bg-white border border-gray-100 rounded-lg p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-5">
            Series Settings
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Autoplay speed: <span className="font-medium text-gray-700">{autospeed.toFixed(1)}s</span>
              </label>
              <input type="range" min={1} max={10} step={0.5} value={autospeed}
                onChange={(e) => setAutospeed(parseFloat(e.target.value))}
                className="w-full accent-gray-900" />
              <div className="flex justify-between text-xs text-gray-300 mt-1"><span>1s</span><span>10s</span></div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Transition type
              </label>
              <div className="flex gap-2">
                {(["fade-black", "crossfade", "instant"] as const).map((t) => (
                  <button key={t} type="button"
                    onClick={() => setTransitionType(t)}
                    className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${transitionType === t ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                    {t === "fade-black" ? "Fade to black" : t === "crossfade" ? "Crossfade" : "Instant cut"}
                  </button>
                ))}
              </div>
            </div>

            {transitionType !== "instant" && (
              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Fade duration: <span className="font-medium text-gray-700">{fadeDuration}ms</span>
                </label>
                <input type="range" min={100} max={1000} step={50} value={fadeDuration}
                  onChange={(e) => setFadeDuration(parseInt(e.target.value))}
                  className="w-full accent-gray-900" />
                <div className="flex justify-between text-xs text-gray-300 mt-1"><span>100ms</span><span>1000ms</span></div>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Zoom amount: <span className="font-medium text-gray-700">{zoomAmount.toFixed(1)}%</span>
              </label>
              <input type="range" min={0} max={5} step={0.5} value={zoomAmount}
                onChange={(e) => setZoomAmount(parseFloat(e.target.value))}
                className="w-full accent-gray-900" />
              <div className="flex justify-between text-xs text-gray-300 mt-1"><span>0% (off)</span><span>5%</span></div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Zoom origin</label>
              <div className="flex flex-col gap-2">
                <button type="button"
                  onClick={() => setZoomOrigin("random")}
                  className={`w-full px-3 py-1.5 rounded-md text-xs border transition-colors text-left ${zoomOrigin === "random" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                  Random (different each panel)
                </button>
                <div className="grid grid-cols-3 gap-1 w-32">
                  {[
                    "20% 20%", "50% 20%", "80% 20%",
                    "20% 50%", "50% 50%", "80% 50%",
                    "20% 80%", "50% 80%", "80% 80%",
                  ].map((o) => (
                    <button key={o} type="button"
                      onClick={() => setZoomOrigin(o)}
                      title={o}
                      className={`aspect-square rounded border-2 transition-colors ${zoomOrigin === o ? "bg-gray-900 border-gray-900" : "border-gray-200 hover:border-gray-400 bg-gray-50"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  {zoomOrigin === "random" ? "Random position" : `Fixed: ${zoomOrigin}`}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Background color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-200 p-0.5"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBgColor(val);
                  }}
                  placeholder="#000000"
                  className="w-32 px-3 py-2 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <div className="w-8 h-8 rounded border border-gray-200 flex-shrink-0" style={{ backgroundColor: bgColor }} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save settings"}
              </button>
              {saveMsg && (
                <span
                  className={`text-sm ${
                    saveMsg.startsWith("Error") ? "text-red-500" : "text-green-600"
                  }`}
                >
                  {saveMsg}
                </span>
              )}
            </div>
          </form>
        </section>

        {/* Panels */}
        <section className="bg-white border border-gray-100 rounded-lg p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-medium text-gray-900">
              Panels{" "}
              <span className="text-gray-400 font-normal">
                ({panels.length})
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                className="hidden"
                id="panel-upload"
              />
              <label
                htmlFor="panel-upload"
                className={`cursor-pointer text-sm px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors ${
                  uploading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {uploading ? "Uploading…" : "Upload panels"}
              </label>
            </div>
          </div>

          {uploadError && (
            <p className="text-sm text-red-500 mb-4">{uploadError}</p>
          )}

          {panels.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-300">
                No panels yet. Upload some images above.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={panels.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {panels.map((panel) => (
                    <SortablePanel
                      key={panel.id}
                      panel={panel}
                      isCover={coverPanelId === panel.id}
                      onSetCover={handleSetCover}
                      onDelete={handleDelete}
                      deleting={deleting && deletingId === panel.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {panels.length > 0 && (
            <p className="text-xs text-gray-300 mt-4">
              Drag panels to reorder. Hover a panel to set as cover or delete.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
