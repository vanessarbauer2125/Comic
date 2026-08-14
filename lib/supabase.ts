import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

// Browser/server client (uses anon key, subject to RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Series {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_panel_id: string | null;
  autoplay_speed: number;
  fade_duration: number;
  transition_type: string;
  zoom_amount: number;
  zoom_origin: string;
  background_color: string;
  default_panel_width: number;
  created_at: string;
  updated_at: string;
  // joined
  cover_panel?: Panel | null;
  panels?: Panel[];
}

export interface Panel {
  id: string;
  series_id: string;
  image_url: string;
  display_order: number;
  custom_width: number | null;
  custom_height: number | null;
  created_at: string;
}
