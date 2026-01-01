<script lang="ts">
  import { userAccount } from '$lib/userStore';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';
  export let liveCount: number = 0;

  function handleGroups() {
    goto('/group');
  }

  function handleRecords() {
    goto('/records');
  }

  function handleLogout() {
    userAccount.logout();
    goto('/group');
  }

  $: profile = get(userAccount);
</script>

<nav class="w-full relative z-30">
  <div class="w-full flex items-center justify-between gap-4 p-2 md:p-3 bg-[rgba(33,35,41,0.65)] border border-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-xl shadow-[0_6px_30px_rgba(2,6,23,0.6)] mb-4 md:mb-6">
      <div class="flex items-center gap-4">
      <button on:click={handleGroups} class="text-slate-200 font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-3">
        <span>表單</span>
        <span class="text-[#7dd3fc] text-xs font-mono bg-slate-800/40 px-2 py-1 rounded">LIVE {liveCount}</span>
      </button>
      <button on:click={handleRecords} class="text-slate-100 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition">紀錄</button>
    </div>

    <div class="flex items-center gap-4">
      {#if profile?.nickname}
        <div class="text-slate-300 text-sm">{profile.nickname}</div>
        {#if profile.isAdmin}
          <div class="text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-900/20 rounded">ADMIN</div>
        {/if}
        <button on:click={handleLogout} class="text-slate-400 hover:text-red-400 transition">登出</button>
      {/if}
    </div>
  </div>
</nav>

<!-- Styles migrated to Tailwind classes on the elements above -->
