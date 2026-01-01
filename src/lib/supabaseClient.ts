import { createClient } from '@supabase/supabase-js';

// 使用動態環境變數避免編譯時錯誤
const PUBLIC_SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL || '';
const PUBLIC_SUPABASE_ANON_KEY = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase 連線資訊未正確設定，請檢查環境變數設定');
  // 不拋出錯誤，讓構建能繼續進行
}

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
