<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { fade, scale } from 'svelte/transition';
    import { enhance } from '$app/forms';

    const dispatch = createEventDispatcher();
    
    let boss_name = '';
    let raid_time = '';
    let note = '';
    let isSubmitting = false;
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md" transition:fade>
    <div class="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-8 shadow-2xl" transition:scale>
        <h2 class="text-2xl font-bold text-white mb-6">發起新活動</h2>
        
        <form method="POST" action="?/createGroup" use:enhance={() => {
            isSubmitting = true;
            return async ({ result }) => {
                isSubmitting = false;
                if (result.type === 'success') {
                    dispatch('success');
                    dispatch('close');
                } else {
                    // result may contain errors in result.data
                    // For now, show a simple alert if server returned failure
                    const err = (result as any).data?.message || '建立失敗';
                    alert(err);
                }
            };
        }} class="space-y-5">
            <div>
                <label for="boss" class="block text-sm text-slate-400 mb-1">目標 Boss</label>
                <input id="boss" bind:value={boss_name} placeholder="例如：困難希拉" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
                <label for="time" class="block text-sm text-slate-400 mb-1">出團時間</label>
                <input id="time" type="datetime-local" bind:value={raid_time} class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
                <label for="note" class="block text-sm text-slate-400 mb-1">備註 (選填)</label>
                <textarea id="note" bind:value={note} placeholder="設定裝分門檻或特殊要求..." class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none h-24 resize-none focus:ring-2 focus:ring-blue-500"></textarea>
            </div>

            <div class="flex gap-3 pt-4">
                <button type="button" on:click={() => dispatch('close')} class="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all">取消</button>
                <button type="submit" disabled={isSubmitting} class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                    {isSubmitting ? '創建中...' : '確認發起'}
                </button>
            </div>

        </form>
            </div>
        </div>
