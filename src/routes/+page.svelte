<script context="module" lang="ts">
export type Group = {
  id: number;
  status: '招募中' | '已準備' | '已出團';
  boss_name: string;
  raid_time: string;
  note: string;
  last_edited_by: string;
};

export type Member = {
  id?: number;
  group_id: number;
  position_index: number;
  nickname: string;
  vocation?: string;
  last_edited_by?: string;
};
</script>

<script lang="ts">
import LoginModal from '$lib/components/LoginModal.svelte';
import { userAccount } from '$lib/userStore';
import { onMount } from 'svelte';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';

let showLogin = true;

onMount(() => {
  const unsubscribe = userAccount.subscribe((profile) => {
    const shouldShowLogin = !profile.nickname;
    if (showLogin && !shouldShowLogin) {
      // 登入成功後跳轉到表單頁
      goto('/group');
    }
    showLogin = shouldShowLogin;
  });
  return unsubscribe;
});
</script>

{#if showLogin}
  <LoginModal />
{:else}
  <!-- 這裡放主頁內容 -->
  <div class="p-8 text-center text-2xl">已登入，這裡是主頁內容</div>
{/if}