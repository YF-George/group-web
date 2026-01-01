<script lang="ts">
  import { toasts } from '$lib/stores/toastStore';
  import { fade, fly } from 'svelte/transition';

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  const styles = {
    success: 'bg-emerald-500/90 text-white border-emerald-400',
    error: 'bg-red-500/90 text-white border-red-400',
    info: 'bg-blue-500/90 text-white border-blue-400',
    warning: 'bg-amber-500/90 text-black border-amber-400'
  };
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" role="region" aria-live="polite" aria-label="通知訊息">
  {#each $toasts as toast (toast.id)}
    <div
      in:fly={{ x: 100, duration: 200 }}
      out:fade={{ duration: 150 }}
      class="pointer-events-auto min-w-72 max-w-md px-4 py-3 rounded-lg border-2 shadow-xl backdrop-blur-sm flex items-center gap-3 {styles[toast.type]}"
      role="alert"
    >
      <span class="text-xl font-bold shrink-0">{icons[toast.type]}</span>
      <span class="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        on:click={() => toasts.dismiss(toast.id)}
        class="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
        aria-label="關閉通知"
      >
        ✕
      </button>
    </div>
  {/each}
</div>
