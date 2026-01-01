<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { userAccount } from '$lib/userStore';
  import { formatAuditMessage } from '$lib/utils';
  import { fade } from 'svelte/transition';

  let logs: any[] = [];
  let loading = true;

  onMount(async () => {
    if (!$userAccount.isAdmin) return; // 安全檢查

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(100); // 顯示最近 100 條

    if (!error) logs = data;
    loading = false;
  });
</script>

<main class="min-h-screen bg-slate-950 text-slate-200 p-8">
  <div class="max-w-4xl mx-auto">
    <header class="mb-8 flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-bold text-white">操作日誌</h1>
        <p class="text-slate-500">追蹤全站所有成員與團隊的變更紀錄</p>
      </div>
      <button class="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/20">
        清理 90 天前紀錄
      </button>
    </header>

    {#if loading}
      <div class="animate-pulse space-y-4">
        {#each Array(5) as _}
          <div class="h-16 bg-slate-900 rounded-xl"></div>
        {/each}
      </div>
    {:else}
      <div class="space-y-3">
        {#each logs as log (log.id)}
          <div in:fade class="bg-slate-900 border border-slate-700 p-4 rounded-xl flex items-start gap-4">
            <div class="min-w-30">
              <p class="text-xs text-slate-500">{new Date(log.changed_at).toLocaleTimeString()}</p>
              <p class="font-bold text-blue-400">@{log.changed_by}</p>
            </div>
            
            <div class="flex-1">
              <p class="text-sm">
                <span class="text-slate-500">在 {log.table_name}：</span>
                {formatAuditMessage(log)}
              </p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</main>
