<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
  <div class="max-w-md w-full text-center space-y-6">
    <!-- Error Code -->
    <div class="text-8xl font-black text-red-500 animate-pulse">
      {$page.status || 500}
    </div>
    
    <!-- Error Message -->
    <h1 class="text-2xl font-bold text-slate-200">
      {#if $page.status === 404}
        找不到頁面
      {:else if $page.status === 403}
        無權限訪問
      {:else if $page.status === 401}
        未授權
      {:else}
        發生錯誤
      {/if}
    </h1>
    
    <p class="text-lg text-slate-400">
      {$page.error?.message || '發生未預期的錯誤，請稍後再試'}
    </p>
    
    <!-- Actions -->
    <div class="flex gap-4 justify-center pt-4">
      <a
        href="/"
        class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
      >
        返回首頁
      </a>
      
      <button
        on:click={() => window.history.back()}
        class="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
      >
        返回上一頁
      </button>
    </div>
    
    <!-- Debug Info (dev only) -->
    {#if import.meta.env.DEV && $page.error}
      <details class="mt-8 text-left bg-slate-900 p-4 rounded-lg border border-slate-700">
        <summary class="cursor-pointer text-sm text-slate-400 hover:text-slate-300">
          開發者資訊
        </summary>
        <pre class="mt-2 text-xs text-red-400 overflow-auto">{JSON.stringify($page.error, null, 2)}</pre>
      </details>
    {/if}
  </div>
</div>
