"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GalleryImage } from "@/lib/supabase";

export default function AdminGalleryPage() {
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadImages(); }, []);

  async function loadImages() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gallery");
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setImages(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError("");
    setUploading(true);

    try {
      const signedRes = await fetch("/api/admin/gallery/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: Array.from(files).map((f) => ({ name: f.name })) }),
      });
      const { results } = await signedRes.json();

      const publicUrls: string[] = [];
      let errs = 0;
      await Promise.all(Array.from(files).map(async (file, i) => {
        const slot = results[i];
        if (slot.error) { errs++; return; }
        const up = await fetch(slot.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!up.ok) { errs++; return; }
        publicUrls.push(slot.publicUrl);
      }));

      if (publicUrls.length > 0) {
        const reg = await fetch("/api/admin/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicUrls }),
        });
        const data = await reg.json();
        if (data.images?.length > 0) setImages((prev) => [...prev, ...data.images]);
        if (data.errors?.length > 0) errs += data.errors.length;
      }

      if (errs > 0) setUploadError(`${errs} file(s) failed to upload.`);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this image?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
      if (res.ok) setImages((prev) => prev.filter((img) => img.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveTitle(id: string) {
    await fetch(`/api/admin/gallery/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle || null }),
    });
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, title: editTitle || null } : img));
    setEditingId(null);
  }

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Gallery</h1>
          <Link href="/admin/dashboard" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">← Comics</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/gallery" target="_blank" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">View gallery ↗</Link>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign out</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-medium text-gray-900">
            Images <span className="text-gray-400 font-normal">({images.length})</span>
          </h2>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" id="gallery-upload" />
            <label htmlFor="gallery-upload"
              className={`cursor-pointer text-sm px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              {uploading ? "Uploading…" : "Upload images"}
            </label>
          </div>
        </div>

        {uploadError && <p className="text-sm text-red-500 mb-4">{uploadError}</p>}

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
        ) : images.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No images yet. Upload some above.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="group relative bg-white border border-gray-100 rounded-lg overflow-hidden">
                <div className="aspect-square relative">
                  <Image src={img.image_url} alt={img.title ?? "Gallery image"} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
                </div>
                <div className="px-2 py-2 space-y-1.5">
                  {editingId === img.id ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(img.id); if (e.key === "Escape") setEditingId(null); }}
                        placeholder="Add title…"
                        className="flex-1 px-1.5 py-0.5 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                      <button onClick={() => handleSaveTitle(img.id)} className="text-xs px-1.5 py-0.5 bg-gray-900 text-white rounded">✓</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingId(img.id); setEditTitle(img.title ?? ""); }}
                      className="w-full text-left text-xs text-gray-400 hover:text-gray-700 transition-colors truncate">
                      {img.title ?? <span className="italic">Add title…</span>}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(img.id)}
                    disabled={deletingId === img.id}
                    className="w-full text-xs py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
