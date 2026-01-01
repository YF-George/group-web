<script lang="ts">
  import { userAccount } from '$lib/userStore';
  import { api } from '$lib/api';
  import { fade, fly, slide } from 'svelte/transition';

  let inputName = "";
  let inputPassword = "";
  let showAdminFields = false;
  let isError = false;
  let errorMessage = "";
  let isVerifying = false;

  async function handleLogin() {
    if (inputName.trim().length < 2) {
      triggerError("暱稱至少需要 2 個字");
      return;
    } 

    if (showAdminFields) {
      isVerifying = true;
      try {
        const isAdmin = await api.verifyAdmin(inputName.trim(), inputPassword);
        if (isAdmin) {
          userAccount.setNickname(inputName.trim());
          userAccount.setAdmin(true);
        } else {
          triggerError("密碼錯誤或無權限");
        }
      } catch (e) {
        triggerError("伺服器連線失敗");
      } finally {
        isVerifying = false;
      }
    } else {
      userAccount.setNickname(inputName.trim());
      userAccount.setAdmin(false);
    }
  }

  function triggerError(msg: string) {
    errorMessage = msg;
    isError = true;
    setTimeout(() => (isError = false), 500);
  }
</script>

<div class="min-h-screen flex items-center justify-center p-4" in:fade>
  <div 
    class="relative w-full max-w-md p-px rounded-[2.5rem] bg-linear-to-b from-blue-500/40 to-emerald-500/40 shadow-2xl transition-all duration-500"
    class:animate-shake={isError}
  >
    <div class="bg-slate-900/95 backdrop-blur-2xl p-8 rounded-[2.4rem] text-center border border-white/5">
      
      <div class="relative inline-block mb-6">
        <div 
          class="absolute inset-0 blur-2xl opacity-20 transition-colors duration-500" 
          class:bg-emerald-500={showAdminFields} 
          class:bg-blue-500={!showAdminFields}
          class:animate-pulse={!isVerifying}
          class:animate-ping={isVerifying}
        ></div>
        <div class="relative bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 transition-colors duration-500" class:text-emerald-400={showAdminFields} class:text-blue-400={!showAdminFields} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {#if showAdminFields}
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            {:else}
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            {/if}
          </svg>
        </div>
      </div>

      <h2 class="text-2xl font-black mb-2 text-white tracking-tight">身分驗證</h2>
      <p class="text-slate-400 text-sm mb-8">
        {showAdminFields ? '進入管理系統' : '輸入暱稱以加入團隊'}
      </p>

      <div class="space-y-5 text-left bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 shadow-inner">
        <div class="space-y-2">
          <label for="nickname-input" class="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nickname / 暱稱</label>
          <input 
            id="nickname-input"
            type="text"
            bind:value={inputName}
            placeholder="例如：千羽夜"
            class="w-full bg-slate-900/50 border-2 {isError ? 'border-red-500/50' : 'border-slate-700'} focus:border-blue-500 rounded-xl px-4 py-3.5 text-white outline-none transition-all placeholder:text-slate-600 font-medium shadow-sm"
            on:keydown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {#if showAdminFields}
          <div transition:slide={{ duration: 300 }} class="space-y-2">
            <label for="admin-password-input" class="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Admin Password / 密碼</label>
            <input
              id="admin-password-input"
              type="password"
              bind:value={inputPassword}
              placeholder="••••••••"
              class="w-full bg-slate-900/50 border-2 {isError ? 'border-red-500/50' : 'border-emerald-500/50'} focus:border-emerald-500 rounded-xl px-4 py-3.5 text-white outline-none transition-all shadow-sm"
              on:keydown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
        {/if}

        {#if isError}
          <p class="text-xs text-red-500 font-bold animate-pulse" in:fly={{ y: -5 }}>{errorMessage}</p>
        {/if}

        <button 
          on:click={handleLogin}
          disabled={isVerifying}
          class="group relative w-full overflow-hidden rounded-xl py-4 font-black text-white transition-all active:scale-95 shadow-xl disabled:opacity-50 mt-2
          {showAdminFields ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'}"
        >
          <span class="relative z-10">{isVerifying ? '驗證中...' : (showAdminFields ? '管理員權限登入' : '確認進入')}</span>
          <div class="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-[-15deg]"></div>
        </button>

        <button 
          type="button"
          on:click={() => { showAdminFields = !showAdminFields; isError = false; }}
          class="w-full text-center text-[11px] text-slate-400 hover:text-blue-400 transition-colors font-bold uppercase tracking-widest"
        >
          {showAdminFields ? '← 返回一般成員' : '我是管理員 / ADMIN'}
        </button>
      </div>

      <p class="mt-8 text-[9px] text-slate-700 uppercase tracking-[0.3em] font-black">
        Raid Helper Security Protocol v2.0
      </p>
    </div>
  </div>
</div>

<style>
  :global(.animate-shake) {
    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
  }
  @keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
    40%, 60% { transform: translate3d(3px, 0, 0); }
  }
</style>