<script lang="ts">
  import { userAccount } from '$lib/userStore';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  let password = '';
  let loading = false;

  async function handleLogin() {
    loading = true;
    const success = await userAccount.verifyAdmin(password);
    loading = false;
    if (success) dispatch('close');
  }
</script>

<div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
  <div class="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-80 shadow-2xl">
    <h3 class="text-xl font-bold text-white mb-4 text-center">管理員身分驗證</h3>
    <input 
      type="password" 
      bind:value={password}
      placeholder="請輸入您的管理密碼"
      class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white mb-4 outline-none focus:ring-2 focus:ring-blue-500"
    />
    <div class="flex gap-2">
      <button on:click={() => dispatch('close')} class="flex-1 py-2 text-slate-400 hover:bg-slate-800 rounded-lg">取消</button>
      <button on:click={handleLogin} class="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg disabled:opacity-50">
        {loading ? '驗證中...' : '登入'}
      </button>
    </div>
  </div>
</div>
