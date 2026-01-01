import { createClient } from '@supabase/supabase-js';

// 你可以將這兩個值放在 .env 並用 import.meta.env 讀取
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Supabase 連線資訊未正確設定，請檢查 .env 檔案');
}

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
