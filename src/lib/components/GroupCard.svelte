<script lang="ts">
  import type { Group, Member } from '$lib/api';
  import { fade } from 'svelte/transition';
  import { goto } from '$app/navigation';

  export let group: Group & { members: Member[] };
  export let index: number | undefined = undefined;

  // 1. 職業顏色映射 (根據你資料庫的 vocation_id)
  const vocationStyles: Record<number, string> = {
    1: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]', // 坦 (Tank)
    2: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]', // 治療 (Healer)
    3: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]',    // 輸出 (DPS)
  };

  // 2. 狀態樣式
  const statusStyles = {
    '招募中': 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5 shadow-[0_0_15px_rgba(34,211,238,0.1)]',
    '已準備': 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
    '已出團': 'text-slate-500 border-slate-700 bg-slate-800/50'
  };

  // 3. 預先排好 10 個位置的資料，優化渲染效能
  $: slots = Array.from({ length: 10 }, (_, i) => {
    return group.members.find(m => m.position_index === i + 1);
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }) + ' ' + 
           d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  function openDetail() {
    // 禁止點擊本地預設群組（ID 為 -1）
    if (group.id <= 0) {
      return;
    }
    goto(`/group/${group.id}`);
  }

  // Determine display name: if backend stored a placeholder like "預設副本" or similar,
  // show a friendly "團隊 {index}" instead when index is provided.
  $: displayName = (() => {
    const name = group?.boss_name || '';
    if (!name) return index ? `團隊 ${index}` : '團隊';
    // If name contains 副本 or 預設 or 新副本, treat as placeholder
    if (/副本|預設|新副本/i.test(name)) {
      return index ? `團隊 ${index}` : '團隊';
    }
    return name;
  })();
</script>

<div
  in:fade
  on:click={openDetail}
  on:keydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetail();
    }
  }}
  class="{group.id > 0 ? 'relative group cursor-pointer' : 'relative group cursor-not-allowed'}"
  role="button"
  tabindex={group.id > 0 ? 0 : -1}
  aria-label={group.id > 0 ? `開啟團隊 ${displayName} 詳細資訊` : `本地預設團隊 ${displayName} (無法編輯)`}
>
  <div class="absolute -inset-0.5 bg-linear-to-r from-blue-500 to-cyan-500 rounded-4xl opacity-0 {group.id > 0 ? 'group-hover:opacity-28' : ''} transition duration-300 blur-xl"></div>

  <div class="relative bg-slate-800/70 border border-white/20 rounded-4xl p-4 md:p-6 backdrop-blur-xl transition-all shadow-2xl overflow-hidden min-h-48 transform duration-200 {group.id > 0 ? 'group-hover:-translate-y-3 group-hover:scale-[1.01] group-hover:shadow-[0_18px_50px_rgba(2,6,23,0.75)] group-hover:border-cyan-400/20 group-focus:-translate-y-3 group-focus:scale-[1.01] group-focus:shadow-[0_18px_50px_rgba(2,6,23,0.75)] group-focus:border-cyan-400/20' : 'opacity-60'}">
    
    <header class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <!-- Operational Mission label removed per design request -->
        <h3 class="text-2xl font-black text-white leading-tight {group.id > 0 ? 'group-hover:text-blue-400' : ''} transition-colors line-clamp-1">
          {displayName}
        </h3>
        {#if group.id <= 0}
          <p class="text-xs font-medium text-red-400 mt-1 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-red-400 fill-red-400" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
            本地暫存（請先建立真實團隊）
          </p>
        {/if}
        <p class="text-xs font-medium text-slate-300 mt-1 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-white stroke-white" fill="none" viewBox="0 0 24 24" stroke="white">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDate(group.raid_time)}
        </p>
      </div>
      
      <span class={`text-[10px] px-2 py-1 rounded-lg border font-black uppercase tracking-tighter ${statusStyles[group.status] || statusStyles['招募中']}`}>
        {group.status}
      </span>
    </header>

        <div class="grid grid-cols-2 grid-rows-5 gap-2 mb-4">
      {#each slots as member, i}
        <div
          title={member && member.nickname && member.nickname.trim() !== '' ? member.nickname : ''}
          class={`relative rounded-md flex items-center justify-center transition-all duration-300 h-8 md:h-10 ${member && member.nickname && member.nickname.trim() !== '' ? (vocationStyles[member.vocation_id || 3]) : 'bg-white/10 border border-white/10 hover:border-white/30'}`}
        >
          {#if member && member.nickname && member.nickname.trim() !== ''}
              <span class="text-xs md:text-sm font-black text-white uppercase truncate leading-tight h-4 md:h-5 flex items-center whitespace-nowrap">
                {member.nickname}
              </span>
            <span class="absolute top-1 right-1 w-1 h-1 bg-white/50 rounded-full"></span>
          {:else}
            <div class="w-1 h-1 bg-white/20 rounded-full"></div>
          {/if}
        </div>
      {/each}
    </div>

    <footer class="pt-3 border-t border-white/6">
      <div class="flex items-center justify-between">
        <p class="text-xs text-slate-300 italic line-clamp-1 flex-1 pr-4">
          {group.note || 'No tactical notes provided...'}
        </p>
        <div class="shrink-0 flex -space-x-2">
           <span class="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-md">
             {group.members.filter(m => m.nickname && m.nickname.trim() !== '').length}/10
           </span>
        </div>
      </div>
    </footer>
  </div>
</div>