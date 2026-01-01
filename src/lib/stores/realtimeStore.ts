import { writable, get } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import { userAccount } from '$lib/userStore';
import type { FormField } from '$lib/types';
import { browser } from '$app/environment';

/**
 * Realtime store for form fields.
 * - stores FormField[] in a writable store
 * - subscribes to Supabase Realtime on `forms` table
 * - applies remote changes only when remote.version >= local.version
 * - provides lock acquire/release and atomic update helpers via RPC
 */

const formFields = writable<FormField[]>([]);
const isDisconnected = writable<boolean>(false);

let channel: any = null;

function applyRemoteUpdate(remote: Partial<FormField> & { id: string; version?: number } ) {
  formFields.update(list => {
    const idx = list.findIndex(f => f.id === remote.id);
    if (idx === -1) {
      // insert only if remote has a version (avoid inserting empty payloads)
      if (remote.version != null) return [...list, remote as FormField];
      return list;
    }

    const local = list[idx];
    const rVer = remote.version ?? 0;
    const lVer = local.version ?? 0;
    if (rVer >= lVer) {
      const merged: FormField = { ...local, ...remote } as FormField;
      const copy = list.slice();
      copy[idx] = merged;
      return copy;
    }
    return list;
  });
}

function applyRemoteDelete(id: string) {
  formFields.update(list => list.filter(f => f.id !== id));
}

async function startRealtime() {
  if (!browser) return; // only run in browser
  if (channel) return;

  channel = supabase
    .channel('realtime-forms')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'forms' }, (payload: any) => {
      const ev = payload.eventType;
      if (ev === 'INSERT' || ev === 'UPDATE') {
        const remote = payload.new as Partial<FormField> & { id: string };
        applyRemoteUpdate(remote);
      } else if (ev === 'DELETE') {
        const old = payload.old as { id: string };
        applyRemoteDelete(old.id);
      }
    })
    .subscribe();

  // browser-level offline/online detection
  if (browser) {
    window.addEventListener('offline', () => isDisconnected.set(true));
    window.addEventListener('online', () => isDisconnected.set(false));
  }
}

async function stopRealtime() {
  if (!browser) return;
  if (channel) {
    try { await channel.unsubscribe(); } catch (e) { /* ignore */ }
    channel = null;
  }
  window.removeEventListener('offline', () => isDisconnected.set(true));
  window.removeEventListener('online', () => isDisconnected.set(false));
}

/**
 * Attempt to acquire lock for a field. Calls RPC `acquire_lock`.
 * RPC contract assumed: returns { success: boolean, message?: string }
 */
async function acquireLock(fieldId: string): Promise<boolean> {
  const user = (userAccount as any).getSnapshot ? (userAccount as any).getSnapshot() : null;
  const locker = user?.nickname;
  if (!locker) return false;

  const { data, error } = await supabase.rpc('acquire_lock', { p_field_id: fieldId, p_locker: locker });
  if (error) {
    console.error('acquireLock rpc error', error);
    return false;
  }

  // optimistic update local store if success
  if (data?.success) {
    formFields.update(list => list.map(f => f.id === fieldId ? { ...f, locked_by: locker, locked_at: new Date().toISOString() } : f));
    return true;
  }
  return false;
}

/**
 * Release lock via RPC `release_lock`.
 */
async function releaseLock(fieldId: string): Promise<boolean> {
  const user = (userAccount as any).getSnapshot ? (userAccount as any).getSnapshot() : null;
  const locker = user?.nickname;
  if (!locker) return false;

  const { data, error } = await supabase.rpc('release_lock', { p_field_id: fieldId, p_locker: locker });
  if (error) {
    console.error('releaseLock rpc error', error);
    return false;
  }

  if (data?.success) {
    formFields.update(list => list.map(f => f.id === fieldId ? { ...f, locked_by: null, locked_at: null } : f));
    return true;
  }
  return false;
}

/**
 * Atomically update a field's value. Requires the field to be locked by current user.
 * Calls RPC `atomic_update_field` with expected version for optimistic concurrency.
 * RPC contract assumed: returns the updated row on success.
 */
async function updateFieldValue(fieldId: string, newValue: string): Promise<boolean> {
  const user = (userAccount as any).getSnapshot ? (userAccount as any).getSnapshot() : null;
  const locker = user?.nickname;
  if (!locker) throw new Error('no current user');

  const local = get(formFields).find(f => f.id === fieldId);
  if (!local) throw new Error('field not found');
  if (local.locked_by !== locker) throw new Error('field not locked by current user');

  const expectedVersion = local.version ?? 0;
  const { data, error } = await supabase.rpc('atomic_update_field', {
    p_field_id: fieldId,
    p_new_value: newValue,
    p_editor: locker,
    p_expected_version: expectedVersion
  });

  if (error) {
    console.error('atomic_update_field rpc error', error);
    return false;
  }

  // rpc should return updated row
  if (data) {
    applyRemoteUpdate(data as Partial<FormField> & { id: string });
    return true;
  }

  return false;
}

/**
 * When connection is lost, mark disconnected flag so UI can render fields readonly.
 */
function handleDisconnect() {
  isDisconnected.set(true);
}

function handleReconnect() {
  isDisconnected.set(false);
}

export const realtimeStore = {
  subscribe: formFields.subscribe,
  isDisconnected: {
    subscribe: isDisconnected.subscribe
  },
  start: startRealtime,
  stop: stopRealtime,
  acquireLock,
  releaseLock,
  updateFieldValue,
  // helper to load initial snapshot into the store
  async loadInitial() {
    const { data, error } = await supabase.from('forms').select('*');
    if (error) throw error;
    if (Array.isArray(data)) {
      // ensure typed
      formFields.set(data as unknown as FormField[]);
    }
  }
};

export default realtimeStore;
