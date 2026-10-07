import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function Route({ method, path, description }: { method?: string; path: string; description: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-50 text-blue-600",
    POST: "bg-green-50 text-green-600",
    PUT: "bg-yellow-50 text-yellow-700",
    DELETE: "bg-red-50 text-red-500",
  };
  return (
    <div className="flex items-start gap-3">
      {method && (
        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono mt-0.5 ${colors[method]}`}>
          {method}
        </span>
      )}
      <div>
        <code className="text-xs font-mono text-gray-800 bg-gray-50 px-1.5 py-0.5 rounded">{path}</code>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function Feature({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 text-xs font-medium text-gray-700 w-32">{label}</span>
      <p className="text-xs text-gray-500">{children}</p>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Dashboard</Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm font-medium text-gray-900">Docs</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        <div>
          <h1 className="text-xl font-semibold text-gray-900">Site documentation</h1>
          <p className="text-sm text-gray-400 mt-1">All pages, routes, and features for your comic hosting site.</p>
        </div>

        {/* Public pages */}
        <Section title="Public pages">
          <div className="space-y-3">
            <Route path="/" description="Homepage — shows all comic series as a card grid. Each card links to its reader." />
            <Route path="/gallery" description="Gallery page — masonry grid of all uploaded gallery images with optional titles." />
            <Route path="/[slug]" description="Comic reader — full-screen panel viewer for a series. Replace [slug] with the series slug (e.g. /my-comic)." />
          </div>
        </Section>

        {/* Admin pages */}
        <Section title="Admin pages">
          <div className="space-y-3">
            <Route path="/admin" description="Login page — enter your admin password to access the dashboard." />
            <Route path="/admin/dashboard" description="Comics dashboard — create and manage comic series." />
            <Route path="/admin/gallery" description="Gallery dashboard — upload, title, and delete gallery images." />
            <Route path="/admin/series/[id]" description="Series editor — manage panels, captions, transitions, and series settings for a specific series." />
            <Route path="/admin/docs" description="This page." />
          </div>
        </Section>

        {/* Series editor features */}
        <Section title="Series editor features">
          <div className="space-y-2.5">
            <Feature label="Upload panels">Click "Upload panels" to add one or more images. They appear in order uploaded.</Feature>
            <Feature label="Add text panel">Click "Add text panel" to insert a caption-only panel with no image (just text on the background color).</Feature>
            <Feature label="Reorder panels">Drag panels by the ⠿ handle to reorder them.</Feature>
            <Feature label="Panel settings">Hover a panel and click ⚙ Settings to open the panel modal.</Feature>
            <Feature label="Set cover">In the panel settings modal, click "Set as cover" to use that panel as the series thumbnail on the homepage.</Feature>
            <Feature label="Caption">Type in the Caption field. Supports position (top/bottom/left/right), font, size, color.</Feature>
            <Feature label="Fade in / Fade out">Per-panel transition durations (ms). Leave blank to use the series default fade duration.</Feature>
            <Feature label="Size (W/H)">Set panel width and height as a % of the screen. Leave H blank for auto.</Feature>
          </div>
        </Section>

        {/* Series settings */}
        <Section title="Series settings">
          <div className="space-y-2.5">
            <Feature label="Autoplay speed">How many seconds each panel shows before advancing. Range: 1–10s.</Feature>
            <Feature label="Transition type">Fade to black, crossfade, or instant cut between panels.</Feature>
            <Feature label="Fade duration">Default fade duration in ms used when a panel has no per-panel override.</Feature>
            <Feature label="Zoom amount">Ken Burns zoom effect on each panel. 0% = off, up to 5%.</Feature>
            <Feature label="Zoom origin">Where the Ken Burns zoom originates — random or a fixed grid position.</Feature>
            <Feature label="Default panel size">Default width % for panels that have no custom width set.</Feature>
            <Feature label="Background color">The color shown behind panels and used for the fade-to-black overlay.</Feature>
          </div>
        </Section>

        {/* Comic reader controls */}
        <Section title="Comic reader controls">
          <div className="space-y-2.5">
            <Feature label="Click / →">Advance to the next panel.</Feature>
            <Feature label="← arrow">Go to the previous panel.</Feature>
            <Feature label="Space">Advance to the next panel.</Feature>
            <Feature label="P key">Toggle autoplay pause/play.</Feature>
            <Feature label="⏸ / ▶ button">Toggle autoplay in the bottom controls bar.</Feature>
            <Feature label="Dot indicators">Click any dot to jump directly to that panel (shown when ≤ 30 panels).</Feature>
          </div>
        </Section>

        {/* API routes */}
        <Section title="API routes">
          <p className="text-xs text-gray-400 -mt-1">All admin API routes require the <code className="bg-gray-100 px-1 rounded">admin_session=1</code> cookie (set on login).</p>
          <div className="space-y-3 pt-1">
            <Route method="GET"    path="/api/admin/series"                         description="List all series with panel counts." />
            <Route method="POST"   path="/api/admin/series"                         description="Create a new series." />
            <Route method="PUT"    path="/api/admin/series/[id]"                    description="Update series settings (title, slug, transitions, colors, etc.)." />
            <Route method="DELETE" path="/api/admin/series/[id]"                    description="Delete a series and all its panels." />
            <Route method="GET"    path="/api/admin/series/[id]/panels"             description="List all panels for a series." />
            <Route method="POST"   path="/api/admin/series/[id]/panels"             description="Register uploaded panel images, or create a caption-only panel (pass captionOnly: true)." />
            <Route method="PUT"    path="/api/admin/series/[id]/panels/[panelId]"   description="Update a panel (caption, size, font, color, fade durations)." />
            <Route method="DELETE" path="/api/admin/series/[id]/panels/[panelId]"   description="Delete a panel and remove its image from storage." />
            <Route method="POST"   path="/api/admin/series/[id]/panels/reorder"     description="Reorder panels. Body: { orderedIds: string[] }." />
            <Route method="POST"   path="/api/admin/series/[id]/panels/signed-url"  description="Get signed upload URLs for direct-to-Supabase image uploads." />
            <Route method="GET"    path="/api/admin/gallery"                        description="List all gallery images." />
            <Route method="POST"   path="/api/admin/gallery"                        description="Register uploaded gallery images." />
            <Route method="PUT"    path="/api/admin/gallery/[imageId]"              description="Update a gallery image title." />
            <Route method="DELETE" path="/api/admin/gallery/[imageId]"              description="Delete a gallery image and remove it from storage." />
            <Route method="POST"   path="/api/admin/gallery/signed-url"             description="Get signed upload URLs for gallery image uploads." />
            <Route method="POST"   path="/api/admin/login"                          description="Log in. Body: { password: string }." />
            <Route method="DELETE" path="/api/admin/login"                          description="Log out (clears session cookie)." />
          </div>
        </Section>

        {/* Supabase schema */}
        <Section title="Database tables">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">series</p>
              <code className="block text-[11px] text-gray-600 bg-gray-50 rounded p-3 leading-relaxed whitespace-pre">{`id, title, slug, description
cover_panel_id, autoplay_speed
fade_duration, transition_type
zoom_amount, zoom_origin
background_color, default_panel_width
created_at, updated_at`}</code>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">panels</p>
              <code className="block text-[11px] text-gray-600 bg-gray-50 rounded p-3 leading-relaxed whitespace-pre">{`id, series_id, image_url (nullable)
display_order, custom_width, custom_height
caption, caption_position, caption_font_size
caption_font_family, caption_color
fade_in_duration, fade_out_duration
created_at`}</code>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">gallery_images</p>
              <code className="block text-[11px] text-gray-600 bg-gray-50 rounded p-3 leading-relaxed whitespace-pre">{`id, image_url, title
display_order, created_at`}</code>
            </div>
          </div>
        </Section>

        {/* Storage */}
        <Section title="Storage">
          <div className="space-y-2.5">
            <Feature label="Bucket">All images (panels and gallery) are stored in the <code className="bg-gray-100 px-1 rounded text-xs">panels</code> Supabase storage bucket.</Feature>
            <Feature label="Comic panels">Stored at path: <code className="bg-gray-100 px-1 rounded text-xs">[series-id]/[timestamp]-[random].[ext]</code></Feature>
            <Feature label="Gallery images">Stored at path: <code className="bg-gray-100 px-1 rounded text-xs">gallery/[timestamp]-[random].[ext]</code></Feature>
          </div>
        </Section>

      </div>
    </div>
  );
}
