<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { userAccount } from '$lib/userStore';
	import { api, type Group, type Member } from '$lib/api';
	import { supabase } from '$lib/supabaseClient';

	import GroupCard from '$lib/components/GroupCard.svelte';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import NavBar from '$lib/components/NavBar.svelte';

	type GroupWithMembers = Group & { members: Member[] };

	let groups: GroupWithMembers[] = [];
	let loading = true;
	let channel: any;

	// Auto-scale state
	let scale = 1;
	let scaleWrapper: HTMLElement | null = null;
	let scaleWrapperTop: HTMLElement | null = null;
	let ro: ResizeObserver | null = null;

	function computeScaleFor(el: HTMLElement | null) {
		if (typeof window === 'undefined' || !el) return 1;
		const rect = el.getBoundingClientRect();
		const padding = 24; // safe padding
		const hScale = (window.innerHeight - padding) / rect.height;
		const wScale = (window.innerWidth - padding) / rect.width;
		return Math.min(1, hScale, wScale);
	}

	function recomputeScale() {
		// prefer measuring the main panel wrapper; fallback to top wrapper
		if (typeof window === 'undefined') return (scale = 1);
		const target = scaleWrapper || scaleWrapperTop;
		if (!target) return (scale = 1);
		const newScale = computeScaleFor(target);
		scale = Math.max(0.6, Math.min(1, newScale));
	}

	// 訂閱 Store 狀態
	$: user = $userAccount;

	// 當使用者暱稱存在時才啟動資料抓取
	$: if (user.nickname && loading) {
		refreshData();
	}

	onMount(() => {
		// 設定 Realtime 全域監聽：任何團或成員變動都刷新列表
		channel = supabase
			.channel('lobby-changes')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () =>
				refreshData()
			)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () =>
				refreshData()
			)
			.subscribe();

		// set up autoscale
		if (typeof window !== 'undefined') {
			window.addEventListener('resize', recomputeScale);
		}

		if (typeof ResizeObserver !== 'undefined') {
			ro = new ResizeObserver(() => recomputeScale());
			if (scaleWrapper) ro.observe(scaleWrapper);
			if (scaleWrapperTop) ro.observe(scaleWrapperTop);
		}
		// initial compute after a tick
		setTimeout(recomputeScale, 60);
	});

	onDestroy(() => {
		if (channel) supabase.removeChannel(channel);
		if (ro) ro.disconnect();
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', recomputeScale);
		}
	});

	async function refreshData() {
		try {
			const data = await api.fetchGroups();
			groups = data as GroupWithMembers[];
			// 只顯示真實的團隊，不自動創建本地預設團隊
			// 如果需要新團隊，管理員可以點擊「+ 新增團隊」按鈕
		} catch (e) {
			console.error('Fetch error:', e);
		} finally {
			loading = false;
		}
	}

	function paddedGroups(): GroupWithMembers[] {
		// 只返回真實的團隊，不補足佔位符
		return groups;
	}

	async function handleCreateGroup() {
		if (!user.isAdmin) return alert('只有管理員可以開啟新副本');

		loading = true;
		try {
			const formData = new FormData();
			formData.append('boss_name', `團隊 ${groups.length + 1}`);
			const tomorrow = new Date(Date.now() + 86400000);
			formData.append('raid_time', tomorrow.toISOString());
			formData.append('note', '請準時集合，裝備等級要求 1600+');

			console.log('[handleCreateGroup] 提交表單:', {
				boss_name: formData.get('boss_name'),
				raid_time: formData.get('raid_time'),
				note: formData.get('note')
			});

			const response = await fetch('?/createGroup', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});

			console.log('[handleCreateGroup] 回應狀態:', response.status);

			const result = await response.json();
			console.log('[handleCreateGroup] 回應結果:', result);

			// SvelteKit Server Action 失敗時會有 type: 'failure' 或錯誤狀態
			if (result.type === 'failure' || !result.success) {
				const errorMsg = result.data?.message || result.message || '建立失敗';
				throw new Error(errorMsg);
			}

			console.log('[handleCreateGroup] 建立成功!');
			// Success: Realtime will trigger refreshData automatically
		} catch (e: any) {
			console.error('[handleCreateGroup] 捕獲錯誤:', e);
			alert(e.message || '建立失敗，請檢查權限');
		} finally {
			loading = false;
		}
	}
</script>

<main class="h-screen touch-manipulation overflow-hidden scroll-smooth">
	{#if !user.nickname}
		<div
			class="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 via-slate-950 to-blue-900"
			in:fade
		>
			<LoginModal />
		</div>
	{/if}

	{#if user.nickname}
		<!-- NavBar 為獨立區塊（不與下方內容背景連在一起） -->
		<div class="relative z-20 w-full">
			<div class="mx-auto w-full lg:w-4/5">
				<div
					bind:this={scaleWrapperTop}
					class="scale-wrapper-top pointer-events-auto transition-transform duration-150 ease-out will-change-transform"
					style={`transform: scale(${scale}); transform-origin: top center;`}
				>
					<div class="h-3 w-full bg-transparent md:h-4" aria-hidden="true"></div>
					<NavBar liveCount={groups.length} />
				</div>
			</div>
		</div>

		<div class="relative z-10 w-full">
			<div class="mx-auto w-full lg:w-4/5">
				<div
					bind:this={scaleWrapper}
					class="scale-wrapper pointer-events-auto transition-transform duration-150 ease-out will-change-transform"
					style={`transform: scale(${scale}); transform-origin: top center;`}
				>
					<div class="panel h-full overflow-hidden p-4 scheme-dark select-text md:p-6">
						<!-- 標題和建立按鈕 -->
						<div class="flex items-center justify-between mb-6">
							<h1 class="text-2xl font-bold text-white">團隊清單</h1>
							{#if user.isAdmin}
								<button
									on:click={handleCreateGroup}
									class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
									disabled={loading}
								>
									+ 新增團隊
								</button>
							{/if}
						</div>

						{#if loading && groups.length === 0}
							<div
								class="grid h-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5"
							>
								{#each Array(5) as _}
									<div
										class="h-64 animate-pulse rounded-3xl border border-slate-700 bg-slate-900/50"
									></div>
								{/each}
							</div>
						{:else if !loading && groups.length === 0}
							<div class="flex flex-col items-center justify-center py-20 text-center space-y-4">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
								</svg>
								<div>
									<h2 class="text-xl font-bold text-white mb-2">還沒有任何團隊</h2>
									<p class="text-slate-400">管理員可以點擊「+ 新增團隊」來建立新的團隊</p>
								</div>
								{#if user.isAdmin}
									<button
										on:click={handleCreateGroup}
										class="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
										disabled={loading}
									>
										+ 建立第一個團隊
									</button>
								{:else}
									<p class="text-slate-500 text-sm mt-4">請聯繫管理員建立團隊</p>
								{/if}
							</div>
						{:else}
							<div
								class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5"
							>
								{#each paddedGroups() as group, i (group.id)}
									<div
										in:fly={{ y: 20, duration: 400 }}
										class="cursor-pointer snap-start transition-transform duration-200 ease-out will-change-transform hover:scale-105 active:scale-95"
									>
										<GroupCard {group} index={i + 1} />
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</main>

<style>
	/* Panel style to match NavBar appearance and width */
	.panel {
		position: relative;
		z-index: 30; /* keep panel above animated background */
		/* Lighter panel background */
		background: linear-gradient(180deg, rgba(20, 24, 32, 0.88), rgba(14, 18, 24, 0.84));
		border: 1px solid rgba(99, 102, 241, 0.07);
		backdrop-filter: blur(8px) saturate(120%);
		border-radius: 14px;
		box-shadow:
			0 10px 30px rgba(2, 6, 23, 0.55),
			0 2px 8px rgba(99, 102, 241, 0.02) inset;
		transition:
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	/* Panel is intentionally static now; per-card hover highlights handled in GroupCard */
</style>
