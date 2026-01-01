// import { supabase } from './supabaseClient';
// import { supabase } from './supabaseClient';
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface UserProfile {
    nickname: string;
    isAdmin: boolean;
    lastLogin: number;
    avatarUrl?: string;
    sessionId?: string;
}

const STORAGE_KEY = 'raid_user_profile_v1';

// 產生或取得 sessionId（每個分頁/視窗一個）
function getOrCreateSessionId() {
    if (typeof window === 'undefined') return String(Math.random());
    const KEY = 'raid_session_id';
    try {
        const existing = sessionStorage.getItem(KEY);
        if (existing) return existing;
        const arr = new Uint8Array(12);
        crypto.getRandomValues(arr);
        const id = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem(KEY, id);
        return id;
    } catch (e) {
        const fallback = String(Math.random()).slice(2);
        try { sessionStorage.setItem(KEY, fallback); } catch (_) {}
        return fallback;
    }
}

// 初始化邏輯
const createInitialValue = (): UserProfile => {
    // 每次都強制回傳空暱稱，不讀 localStorage
    return { nickname: '', isAdmin: false, lastLogin: 0, sessionId: getOrCreateSessionId() };
};

const userProfileStore = writable<UserProfile>(createInitialValue());

// 當 Store 變化時同步 LocalStorage
if (browser) {
    userProfileStore.subscribe(value => {
        try {
            // 不要把 sessionId 寫入 localStorage（sessionId 為分頁級別識別）
            const copy = { ...value } as any;
            delete copy.sessionId;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
        } catch (e) {}
    });

    // 跨分頁同步
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY && event.newValue) {
            try {
                const parsed = JSON.parse(event.newValue);
                // 保留本地的 sessionId（分頁識別不應被其他分頁覆蓋）
                const current = userProfileStore && (get(userProfileStore) as any);
                const merged = { ...(parsed || {}), sessionId: current?.sessionId || getOrCreateSessionId() } as UserProfile;
                userProfileStore.set(merged);
            } catch (e) {}
        }
    });
}

/**
 * 封裝的 Account 服務
 */
export const userAccount = {
    subscribe: userProfileStore.subscribe,

    // 1. 設定暱稱（含 UI 層防呆）
    setNickname: (name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) throw new Error("暱稱不可為空");
        if (trimmedName.length > 12) throw new Error("暱稱不可超過 12 字");
        
        userProfileStore.update(p => ({ 
            ...p, 
            nickname: trimmedName, 
            lastLogin: Date.now() 
        }));
    },

    // 2. 設定管理員權限 (修正 Error 2339)
    setAdmin: (status: boolean) => {
        userProfileStore.update(p => ({ ...p, isAdmin: status }));
    },

    // 3. 驗證管理員（呼叫資料庫）
    verifyAdmin: async (password: string): Promise<boolean> => {
        const current = get(userProfileStore);
        if (!current.nickname) return false;

        try {
            // 直接引用 api 模組（避免循環引用）
            const { api } = await import('./api');
            const success = await api.verifyAdmin(current.nickname, password);
            
            if (success) {
                userAccount.setAdmin(true);
                return true;
            }
            return false;
        } catch (err) {
            console.error("管理員驗證失敗", err);
            return false;
        }
    },

    // 4. 登出
    logout: () => {
        userProfileStore.set({ nickname: '', isAdmin: false, lastLogin: 0 });
        if (browser) localStorage.removeItem(STORAGE_KEY);
    },

    // 輔助方法：獲取當前狀態快照
    getSnapshot: () => get(userProfileStore),
    // 取得目前 sessionId
    getSessionId: () => {
        const s = (get(userProfileStore) as any)?.sessionId;
        if (s) return s;
        const generated = getOrCreateSessionId();
        userProfileStore.update(p => ({ ...p, sessionId: generated }));
        return generated;
    }
};