"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
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
import { CAPTION_FONTS } from "@/lib/fonts";

interface Props {
  series: Series & { panels: Panel[] };
}

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = CAPTION_FONTS.find((f) => f.value === value) ?? CAPTION_FONTS[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] text-gray-700 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-gray-400"
        style={{ fontFamily: selected.value }}
      >
        {selected.label}
        <span className="text-gray-400 ml-1">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 bottom-full mb-1 left-0 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {CAPTION_FONTS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => { onChange(f.value); setOpen(false); }}
              className={`w-full text-left px-2 py-1 text-sm hover:bg-gray-50 ${value === f.value ? "bg-gray-100" : ""}`}
              style={{ fontFamily: f.value }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SortablePanelProps {
  panel: Panel;
  isCover: boolean;
  onSetCover: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
  seriesId: string;
  onPanelUpdate: (panelId: string, width: number | null, height: number | null, caption?: string | null, captionPosition?: string, captionFontSize?: number, captionFontFamily?: string, captionColor?: string | null, fadeIn?: number | null, fadeOut?: number | null) => void;
}

function SortablePanel({
  panel,
  isCover,
  onSetCover,
  onDelete,
  deleting,
  seriesId,
  onPanelUpdate,
}: SortablePanelProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: panel.id });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localWidth, setLocalWidth] = useState<number | null>(panel.custom_width ?? null);
  const [localHeight, setLocalHeight] = useState<number | null>(panel.custom_height ?? null);
  const [widthInput, setWidthInput] = useState(panel.custom_width != null ? String(panel.custom_width) : "");
  const [heightInput, setHeightInput] = useState(panel.custom_height != null ? String(panel.custom_height) : "");
  const [captionInput, setCaptionInput] = useState(panel.caption ?? "");
  const [captionPosition, setCaptionPosition] = useState<string>(panel.caption_position ?? "bottom");
  const [captionFontSize, setCaptionFontSize] = useState(panel.caption_font_size ?? 16);
  const [captionFontFamily, setCaptionFontFamily] = useState(panel.caption_font_family ?? CAPTION_FONTS[0].value);
  const [captionColor, setCaptionColor] = useState(panel.caption_color ?? "#ffffff");
  const [fadeIn, setFadeIn] = useState<number | null>(panel.fade_in_duration ?? null);
  const [fadeOut, setFadeOut] = useState<number | null>(panel.fade_out_duration ?? null);

  const thumbnailRef = useRef<HTMLDivElement>(null);

  const cardStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  async function saveAll(overrides: Partial<{
    width: number | null; height: number | null;
    caption: string; position: string; fontSize: number; fontFamily: string; color: string;
    fi: number | null; fo: number | null;
  }> = {}) {
    const width = overrides.width !== undefined ? overrides.width : localWidth;
    const height = overrides.height !== undefined ? overrides.height : localHeight;
    const caption = overrides.caption !== undefined ? overrides.caption : captionInput;
    const position = overrides.position ?? captionPosition;
    const fontSize = overrides.fontSize ?? captionFontSize;
    const fontFamily = overrides.fontFamily ?? captionFontFamily;
    const color = overrides.color ?? captionColor;
    const fi = overrides.fi !== undefined ? overrides.fi : fadeIn;
    const fo = overrides.fo !== undefined ? overrides.fo : fadeOut;

    onPanelUpdate(panel.id, width, height, caption || null, position, fontSize, fontFamily, color, fi, fo);
    try {
      await fetch(`/api/admin/series/${seriesId}/panels/${panel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_width: width,
          custom_height: height,
          caption: caption || null,
          caption_position: position,
          caption_font_size: fontSize,
          caption_font_family: fontFamily,
          caption_color: color,
          fade_in_duration: fi,
          fade_out_duration: fo,
        }),
      });
    } catch { /* silent */ }
  }

  const cornerCursors = { tl: "cursor-nw-resize", tr: "cursor-ne-resize", bl: "cursor-sw-resize", br: "cursor-se-resize" };
  const cornerPositions = { tl: "top-0 left-0", tr: "top-0 right-0", bl: "bottom-0 left-0", br: "bottom-0 right-0" };

  const dragStateRef = useRef<{ corner: "tl"|"tr"|"bl"|"br"; startX: number; startY: number; startW: number; startH: number | null; currentW: number; currentH: number | null } | null>(null);

  function handleCornerMouseDown(e: React.MouseEvent, corner: "tl" | "tr" | "bl" | "br") {
    e.preventDefault(); e.stopPropagation();
    const rect = thumbnailRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStateRef.current = { corner, startX: e.clientX, startY: e.clientY, startW: localWidth ?? 100, startH: localHeight, currentW: localWidth ?? 100, currentH: localHeight };

    function onMouseMove(me: MouseEvent) {
      const ds = dragStateRef.current; if (!ds) return;
      const r = thumbnailRef.current?.getBoundingClientRect() ?? rect;
      const dx = me.clientX - ds.startX, dy = me.clientY - ds.startY;
      const wSign = (corner === "tl" || corner === "bl") ? -1 : 1;
      const newW = Math.round(Math.min(100, Math.max(10, ds.startW + (dx * wSign / (r?.width || 1)) * 100)));
      const hSign = (corner === "tl" || corner === "tr") ? -1 : 1;
      const rawH = (ds.startH ?? 0) + (dy * hSign / (r?.height || 1)) * 100;
      const newH = rawH < 5 ? null : Math.round(Math.min(100, Math.max(10, rawH)));
      dragStateRef.current = { ...ds, currentW: newW, currentH: newH };
      setLocalWidth(newW); setWidthInput(String(newW));
      setLocalHeight(newH); setHeightInput(newH != null ? String(newH) : "");
    }
    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      const ds = dragStateRef.current; if (!ds) return;
      saveAll({ width: ds.currentW, height: ds.currentH });
      dragStateRef.current = null;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  const modal = settingsOpen && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSettingsOpen(false)}>
      <div className="bg-white rounded-xl shadow-xl w-80 max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Panel #{panel.display_order + 1} settings</h3>
          <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        </div>

        {/* Size */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Size</p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-6">W</label>
            <input type="number" min={10} max={100} value={widthInput} onChange={(e) => setWidthInput(e.target.value)}
              onBlur={() => { const v = parseInt(widthInput,10); const c = isNaN(v)?null:Math.min(100,Math.max(10,v)); setLocalWidth(c); saveAll({width:c}); }}
              placeholder="100" className="w-16 px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            <span className="text-xs text-gray-400">%</span>
            <label className="text-xs text-gray-400 w-6 ml-2">H</label>
            <input type="text" value={heightInput} onChange={(e) => setHeightInput(e.target.value)}
              onBlur={() => { const t=heightInput.trim().toLowerCase(); if(!t||t==="auto"){setLocalHeight(null);setHeightInput("");saveAll({height:null});}else{const v=parseInt(t,10);const c=isNaN(v)?null:Math.min(100,Math.max(10,v));setLocalHeight(c);setHeightInput(c!=null?String(c):"");saveAll({height:c});} }}
              placeholder="auto" className="w-16 px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            {heightInput && <span className="text-xs text-gray-400">%</span>}
          </div>
        </div>

        {/* Caption */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Caption</p>
          <textarea value={captionInput} onChange={(e) => setCaptionInput(e.target.value)}
            onBlur={() => saveAll()} placeholder="Caption text (optional)" rows={3}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none" />
          {captionInput && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 shrink-0">Position</label>
                <select value={captionPosition} onChange={(e) => { setCaptionPosition(e.target.value); saveAll({position:e.target.value}); }}
                  className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400">
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 shrink-0">Font size</label>
                <input type="number" min={8} max={72} value={captionFontSize}
                  onChange={(e) => setCaptionFontSize(Number(e.target.value))}
                  onBlur={() => saveAll()}
                  className="w-16 px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400" />
                <span className="text-xs text-gray-400">px</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Font</label>
                <FontPicker value={captionFontFamily} onChange={(val) => { setCaptionFontFamily(val); saveAll({fontFamily:val}); }} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 shrink-0">Color</label>
                <input type="color" value={captionColor} onChange={(e) => setCaptionColor(e.target.value)} onBlur={() => saveAll()}
                  className="w-7 h-7 rounded cursor-pointer border border-gray-200 p-0.5" />
                <input type="text" value={captionColor} onChange={(e) => setCaptionColor(e.target.value)} onBlur={() => saveAll()}
                  className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400" />
              </div>
            </div>
          )}
        </div>

        {/* Transition */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Transition (overrides series default)</p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-16 shrink-0">Fade in</label>
            <input type="number" min={0} max={3000} step={50} value={fadeIn ?? ""}
              onChange={(e) => setFadeIn(e.target.value===""?null:Number(e.target.value))}
              onBlur={() => saveAll()} placeholder="default"
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            <span className="text-xs text-gray-400">ms</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-16 shrink-0">Fade out</label>
            <input type="number" min={0} max={3000} step={50} value={fadeOut ?? ""}
              onChange={(e) => setFadeOut(e.target.value===""?null:Number(e.target.value))}
              onBlur={() => saveAll()} placeholder="default"
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            <span className="text-xs text-gray-400">ms</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          {!isCover && (
            <button onClick={() => { onSetCover(panel.id); setSettingsOpen(false); }}
              className="flex-1 text-xs px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
              Set as cover
            </button>
          )}
          <button onClick={() => { setSettingsOpen(false); onDelete(panel.id); }} disabled={deleting}
            className="flex-1 text-xs px-3 py-1.5 rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50">
            Delete panel
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={setNodeRef} style={cardStyle}
      className={`relative group rounded-lg overflow-hidden border-2 ${isCover ? "border-gray-900" : "border-gray-100"} bg-gray-50`}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners}
        className="absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center rounded bg-white/80 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Drag to reorder">⠿</div>

      {/* Cover badge */}
      {isCover && (
        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded font-medium">Cover</div>
      )}

      <div className="aspect-[4/3] relative" ref={thumbnailRef}>
        {panel.image_url ? (
          <Image src={panel.image_url} alt={`Panel ${panel.display_order + 1}`} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <span className="text-3xl text-gray-300 select-none">T</span>
          </div>
        )}
        {(["tl", "tr", "bl", "br"] as const).map((corner) => (
          <div key={corner} onMouseDown={(e) => handleCornerMouseDown(e, corner)}
            className={`absolute z-20 w-2 h-2 bg-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ${cornerCursors[corner]} ${cornerPositions[corner]}`}
            style={{ touchAction: "none" }} />
        ))}
      </div>

      <div className="px-2 py-1.5 bg-white flex items-center justify-between">
        <span className="text-xs text-gray-400">#{panel.display_order + 1}</span>
        <button onClick={() => setSettingsOpen(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
          ⚙ Settings
        </button>
      </div>

      {modal}
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
  const [defaultPanelWidth, setDefaultPanelWidth] = useState(series.default_panel_width ?? 100);
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
        body: JSON.stringify({ title, slug, description, autoplay_speed: autospeed, cover_panel_id: coverPanelId, fade_duration: fadeDuration, transition_type: transitionType, zoom_amount: zoomAmount, zoom_origin: zoomOrigin, background_color: bgColor, default_panel_width: defaultPanelWidth }),
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

    try {
      // Step 1: get signed upload URLs from the server
      const signedRes = await fetch(
        `/api/admin/series/${series.id}/panels/signed-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: Array.from(files).map((f) => ({ name: f.name })),
          }),
        }
      );
      const { results: signedResults } = await signedRes.json();

      // Step 2: upload each file directly to Supabase storage
      const publicUrls: string[] = [];
      let uploadErrors = 0;
      await Promise.all(
        Array.from(files).map(async (file, i) => {
          const slot = signedResults[i];
          if (slot.error) { uploadErrors++; return; }
          const uploadRes = await fetch(slot.signedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!uploadRes.ok) { uploadErrors++; return; }
          publicUrls.push(slot.publicUrl);
        })
      );

      // Step 3: register the uploaded panels in the database
      if (publicUrls.length > 0) {
        const registerRes = await fetch(
          `/api/admin/series/${series.id}/panels`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicUrls }),
          }
        );
        const data = await registerRes.json();
        if (data.panels?.length > 0) {
          setPanels((prev) => [...prev, ...data.panels]);
        }
        if (data.errors?.length > 0) uploadErrors += data.errors.length;
      }

      if (uploadErrors > 0) {
        setUploadError(`${uploadErrors} file(s) failed to upload.`);
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

  function handlePanelUpdate(panelId: string, width: number | null, height: number | null, caption?: string | null, captionPosition?: string, captionFontSize?: number, captionFontFamily?: string, captionColor?: string | null, fadeIn?: number | null, fadeOut?: number | null) {
    setPanels((prev) =>
      prev.map((p) =>
        p.id === panelId ? {
          ...p,
          custom_width: width,
          custom_height: height,
          ...(caption !== undefined ? { caption } : {}),
          ...(captionPosition !== undefined ? { caption_position: captionPosition as Panel["caption_position"] } : {}),
          ...(captionFontSize !== undefined ? { caption_font_size: captionFontSize } : {}),
          ...(captionFontFamily !== undefined ? { caption_font_family: captionFontFamily } : {}),
          ...(captionColor !== undefined ? { caption_color: captionColor } : {}),
          ...(fadeIn !== undefined ? { fade_in_duration: fadeIn } : {}),
          ...(fadeOut !== undefined ? { fade_out_duration: fadeOut } : {}),
        } : p
      )
    );
  }

  async function handleAddTextPanel() {
    try {
      const res = await fetch(`/api/admin/series/${series.id}/panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captionOnly: true }),
      });
      const data = await res.json();
      if (data.panel) {
        setPanels((prev) => [...prev, data.panel]);
      }
    } catch {
      // silent
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
              <label className="block text-xs text-gray-500 mb-2">
                Default panel size: <span className="font-medium text-gray-700">{defaultPanelWidth}%</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={defaultPanelWidth}
                  onChange={(e) => setDefaultPanelWidth(parseInt(e.target.value))}
                  className="flex-1 accent-gray-900"
                />
                <input
                  type="number"
                  min={10}
                  max={100}
                  step={5}
                  value={defaultPanelWidth}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setDefaultPanelWidth(Math.min(100, Math.max(10, val)));
                  }}
                  className="w-16 px-2 py-1.5 border border-gray-200 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
              <div className="flex justify-between text-xs text-gray-300 mt-1"><span>10%</span><span>100%</span></div>
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
              <button
                type="button"
                onClick={handleAddTextPanel}
                className="text-sm px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                Add text panel
              </button>
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
                      seriesId={series.id}
                      onPanelUpdate={handlePanelUpdate}
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
