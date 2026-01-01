<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { userAccount } from '$lib/userStore';
	import Toast from '$lib/components/Toast.svelte';

	let { data, children } = $props();

	// 當伺服器端提供的 user 變化時，同步到前端的 user store
	$effect(() => {
		if (data?.user) {
			// 假設 user 有 username 欄位
			userAccount.setNickname(data.user.username || '');
			// 若需要管理員角色，可在此設定
			// userAccount.setAdmin(!!data.user.isAdmin);
		} else {
			// 清除前端使用者狀態（視需求可改為保留或不同行為）
			// userAccount.logout?.();
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Toast />
<div class="min-h-screen bg-slate-900 text-slate-100 selection:bg-blue-500/30 overflow-hidden">
	{@render children()}
</div>
