import { createClient } from '@supabase/supabase-js';

// Mengambil URL dan Key dari file .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Inisialisasi dan export client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);