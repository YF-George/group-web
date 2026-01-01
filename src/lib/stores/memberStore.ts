import { writable, get } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import { userAccount } from '$lib/userStore';
import { api } from '$lib/api';
import type { Member } from '$lib/api';
import { browser } from '$app/environment';

/**
 * Member store
 * - maintains local Member[]
 * - subscribes to Supabase realtime changes on `members` table
 * - provides saveMember RPC wrapper (atomic_save_member)
 * - nickname updates are debounced (1s)
 */

const membersStore = writable<Member[]>([]);

let channel: any = null;
const nicknameTimers = new Map<number | string, ReturnType<typeof setTimeout>>();

function applyUpdateToLocal(updated: Partial<Member> & { id: number }) {
  membersStore.update(list => {
    const idx = list.findIndex(m => m.id === updated.id);
    if (idx === -1) return list;
    const merged = { ...list[idx], ...updated } as Member;
    const copy = list.slice();
    copy[idx] = merged;
    return copy;
  });
}

function applyInsertToLocal(inserted: Member) {
  membersStore.update(list => {
    // if exists replace
    const idx = list.findIndex(m => m.id === inserted.id);
    if (idx !== -1) {
      const copy = list.slice();
      copy[idx] = inserted;
      return copy;
    }
    return [...list, inserted];
  });
}

function applyDeleteToLocal(id: number) {
  membersStore.update(list => list.filter(m => m.id !== id));
}

export async function startMemberRealtime() {
  if (!browser) return;
  if (channel) return;

  channel = supabase
    .channel('realtime-members')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, (payload: any) => {
      const ev = payload.eventType || payload.type;
      if (ev === 'INSERT') {
        applyInsertToLocal(payload.new as Member);
      } else if (ev === 'UPDATE') {
        applyUpdateToLocal(payload.new as Partial<Member> & { id: number });
      } else if (ev === 'DELETE') {
        applyDeleteToLocal((payload.old as any).id as number);
      }
    })
    .subscribe();
}

export async function stopMemberRealtime() {
  if (!browser) return;
  if (!channel) return;
  try {
    await channel.unsubscribe();
  } catch (e) {
    // ignore
  }
  channel = null;
}

export async function loadMembersInitial() {
  const { data, error } = await supabase.from('members').select('*');
  if (error) throw error;
  membersStore.set((data || []) as Member[]);
}

/**
 * Save member via RPC atomic_save_member.
 * Throws when RPC returns success: false or if RPC/error indicates conflict.
 */
export async function saveMember(memberId: number, nickname: string, vocationId: number | null, snapshotBefore?: any) {
  const snapshot = (userAccount as any).getSnapshot ? (userAccount as any).getSnapshot() : null;
  const editor = snapshot?.nickname || '';

  try {
    // get current member to include gear_score
    const local = get(membersStore).find(x => x.id === memberId);
    const gear = (local && (local as any).gear_score) ?? 0;

    const res = await api.atomicSaveMember(memberId, nickname, vocationId ?? 0, gear, editor);

    if (!res || res.success === false) {
      const msg = res?.message || '保存衝突或失敗';
      const err = new Error(msg);
      throw err;
    }

    // On success, ensure local store reflects persisted values (realtime may already update)
    applyUpdateToLocal({ id: memberId, nickname, vocation_id: vocationId } as any);
    return true;
  } catch (err) {
    // rollback optimistic local change if snapshotBefore provided
    try {
      if (snapshotBefore && snapshotBefore.id != null) {
        membersStore.update(list => list.map(m => m.id === snapshotBefore.id ? { ...snapshotBefore } : m));
      }
    } catch (e) {
      console.error('rollback failed', e);
    }
    throw err;
  }
}

/**
 * Update local nickname and debounce RPC save for 1s per-member
 */
export function updateNicknameDebounced(memberId: number, newNickname: string) {
  // capture previous snapshot for potential rollback
  const prev = get(membersStore).find(x => x.id === memberId);
  const prevClone = prev ? { ...prev } : null;

  // update local store immediately (optimistic)
  membersStore.update(list => list.map(m => m.id === memberId ? { ...m, nickname: newNickname } : m));

  // clear existing timer
  const existing = nicknameTimers.get(memberId);
  if (existing) clearTimeout(existing);

  const t = setTimeout(async () => {
    try {
      // find vocational id from local
      const m = get(membersStore).find(x => x.id === memberId);
      const vocation = m?.vocation_id ?? null;
      await saveMember(memberId, newNickname, vocation ?? null, prevClone);
    } catch (e) {
      console.error('saveMember failed in debounce:', e);
      // restore snapshot if needed is handled inside saveMember
    } finally {
      nicknameTimers.delete(memberId);
    }
  }, 1000);

  nicknameTimers.set(memberId, t);
}

export const memberStore = {
  subscribe: membersStore.subscribe,
  start: startMemberRealtime,
  stop: stopMemberRealtime,
  loadInitial: loadMembersInitial,
  saveMember,
  updateNicknameDebounced,
  // helper to perform immediate local update (e.g., vocation change)
  updateLocal(memberId: number, patch: Partial<Member>) {
    membersStore.update(list => list.map(m => m.id === memberId ? { ...m, ...patch } : m));
  }
};

export default memberStore;
