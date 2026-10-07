import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { GalleryImage } from "@/lib/supabase";

export const revalidate = 60;

async function getGalleryImages(): Promise<GalleryImage[]> {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export default async function HomePage() {
  const images = await getGalleryImages();

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Gallery</h1>
        <nav className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-900">Gallery</span>
          <Link href="/comics" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">Comics</Link>
        </nav>
      </header>

      <div className="px-6 py-8">
        {images.length === 0 ? (
          <p className="text-gray-400 text-sm">No images published yet.</p>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {images.map((img) => (
              <div key={img.id} className="break-inside-avoid">
                <div className="relative overflow-hidden rounded-lg bg-gray-50">
                  <Image
                    src={img.image_url}
                    alt={img.title ?? "Gallery image"}
                    width={800}
                    height={600}
                    className="w-full h-auto object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                {img.title && (
                  <p className="mt-1.5 text-xs text-gray-500 px-0.5">{img.title}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
