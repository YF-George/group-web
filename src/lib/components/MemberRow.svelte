<script lang="ts">
  import { api } from '$lib/api';
  import { fade, scale } from 'svelte/transition';
  import memberStore, { saveMember as storeSaveMember, updateNicknameDebounced } from '$lib/stores/memberStore';
  import { onDestroy } from 'svelte';

  interface Vocation {
    id: number | null;
    name: string;
    color_code: string;
  }
  
  interface Member {
    id: number;
    vocation_id: number | null;
    nickname: string;
    gear_score: number | null;
    last_edited_by?: string | null;
    updated_at?: string | null;
  }

  export let member: Member | undefined = undefined;
  export let memberId: number | undefined = undefined;
  export let vocations: Vocation[] = [];

  let isSaving = false;
  let saveSuccess = false;
  let prevState: Partial<Member> | null = null;
  let saveTimer: ReturnType<typeof setTimeout>;
  let unsubscribeMember: (() => void) | null = null;
  let localMember: Member | undefined = member;
  let conflictError: string | null = null;
  let flash = false;

  import { onMount } from 'svelte';

  // support subscribing by id (preferred) or using passed member prop
  onMount(() => {
    if (memberId != null) {
      if (unsubscribeMember) unsubscribeMember();
      unsubscribeMember = memberStore.subscribe(list => {
        const m = list.find(x => x.id === memberId);
        localMember = m as Member | undefined;
      });
    } else {
      localMember = member;
    }

    return () => {
      if (unsubscribeMember) unsubscribeMember();
    };
  });

  $: activeVocation = vocations.find(v => v.id === (localMember?.vocation_id ?? null)) || null;
  $: currentColor = activeVocation?.color_code || '#64748b'; // Default slate-500

  function textColor(hex: string) {
    if (!hex) return '#000';
    const h = hex.replace('#', '');
    if (h.length !== 6) return '#000';
    const r = parseInt(h.slice(0,2),16) / 255;
    const g = parseInt(h.slice(2,4),16) / 255;
    const b = parseInt(h.slice(4,6),16) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.6 ? '#000' : '#fff';
  }

  function debouncedUpdate() {
    if (!localMember) return;
    // update local store and debounce save via memberStore helper
    updateNicknameDebounced(localMember.id, localMember.nickname);
  }

  async function handleUpdate() {
    if (!localMember) return;
    if (!localMember.nickname || localMember.nickname.trim() === '') return;

    prevState = { nickname: localMember.nickname, vocation_id: localMember.vocation_id, gear_score: localMember.gear_score };
    isSaving = true;
    conflictError = null;

    try {
      await storeSaveMember(localMember.id, localMember.nickname, localMember.vocation_id ?? null);
      saveSuccess = true;
      setTimeout(() => (saveSuccess = false), 2000);
    } catch (err) {
      // conflict or other save error
      console.error('saveMember conflict/error', err);
      conflictError = (err as any)?.message || '儲存失敗或衝突';
      // rollback to prevState if exists
      if (prevState) {
        if (localMember) {
          localMember.nickname = prevState.nickname!;
          localMember.vocation_id = prevState.vocation_id!;
          localMember.gear_score = prevState.gear_score!;
        }
      }
      // clear error after 3s
      setTimeout(() => (conflictError = null), 3000);
    } finally {
      isSaving = false;
      prevState = null;
    }
  }

  // reactively flash when updated_at is recent
  $: if (localMember && localMember.updated_at) {
    try {
      const t = Date.now() - new Date(localMember.updated_at).getTime();
      if (t >= 0 && t <= 5000) {
        flash = true;
        setTimeout(() => (flash = false), 2000);
      }
    } catch (e) { }
  }
</script>

{#if localMember}
<div
  class="grid grid-cols-12 gap-3 items-center p-2 rounded-xl border transition-all duration-300 mb-2 backdrop-blur-md"
  style="border-color: {currentColor}44; background: {currentColor}11;"
  class:ring-2={saveSuccess}
  class:ring-emerald-500={saveSuccess}
  class:border-emerald-500={saveSuccess}
>
  
  <div class="col-span-3 relative group">
    <select
      bind:value={localMember.vocation_id}
      on:change={handleUpdate}
      class="w-full text-[10px] font-black tracking-tighter py-1.5 px-2 rounded-lg cursor-pointer outline-none transition-all border border-transparent group-hover:border-white/20 pr-8"
      style="background-color: {currentColor}; color: {activeVocation ? textColor(activeVocation.color_code) : '#fff'}; -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: none;"
    >
      {#each vocations as v}
        <option value={v.id} style={`background-color: ${v.color_code}; color: ${textColor(v.color_code)};`}>{v.name}</option>
      {/each}
    </select>
    <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
    </div>
  </div>

  <div class="col-span-5 relative">
    <input 
      type="text" 
      bind:value={localMember.nickname} 
      on:input={debouncedUpdate}
      on:blur={handleUpdate}
      placeholder="PLAYER NAME"
      class="w-full bg-slate-950/40 text-sm font-medium px-3 py-1.5 rounded-lg text-white outline-none focus:ring-4 transition-all placeholder:text-slate-600 border-2"
      style="border-color: {currentColor}; --tw-ring-color: {currentColor}66;"
    />
  </div>

  <div class="col-span-3">
    <div class="relative flex items-center">
      <input 
        type="number" 
        bind:value={localMember.gear_score}
        on:input={debouncedUpdate}
        on:blur={handleUpdate}
        class="w-full bg-slate-950/60 text-cyan-400 text-center rounded-lg py-1.5 font-mono text-xs outline-none focus:ring-4 transition-all border-2"
        style="border-color: {currentColor}; --tw-ring-color: {currentColor}66;"
      />
      <span class="absolute -top-2 left-2 text-[8px] font-bold text-slate-500 bg-slate-900 px-1">GS</span>
    </div>
  </div>

  <div class="col-span-1 flex justify-center items-center">
    {#if isSaving}
      <div class="relative w-4 h-4">
        <div class="absolute inset-0 border-2 border-cyan-500/20 rounded-full"></div>
        <div class="absolute inset-0 border-2 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    {:else if saveSuccess}
      <div in:scale={{duration: 200}} class="bg-emerald-500 rounded-full p-0.5">
        <svg class="w-3 h-3 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="4">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
    {/if}
  </div>
</div>

{:else}
  <div class="p-2 text-sm text-slate-500">載入中…</div>
{/if}

<style>
  /* 隱藏數字箭頭 */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  /* 選項背景顏色修復 (部分瀏覽器支援) */
  option {
    background-color: #0f172a;
    color: white;
  }
</style>