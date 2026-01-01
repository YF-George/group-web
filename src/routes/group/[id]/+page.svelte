<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { fade, fly } from 'svelte/transition';
  import { supabase } from '$lib/supabaseClient';
  import { userAccount } from '$lib/userStore';
  import { api, type Group, type Member } from '$lib/api';
  import { toasts } from '$lib/stores/toastStore';
  import NavBar from '$lib/components/NavBar.svelte';

  // --- 接收伊務器端虐驗證的 groupId ---
  export let data;

  // --- 檢查 ID 是否有效 ---
  $: if (!data?.isValidId && typeof window !== 'undefined') {
    error = `無效的團隊 ID: ${$page.params.id}`;
  }

  // --- 樣式對應表 ---
  const vocationThemes: Record<string, { bg: string, text: string, border: string }> = {
    '1': { bg: '#f97316', text: '#000000', border: '#f97316' }, // 坦克 - 橘
    '2': { bg: '#34d399', text: '#000000', border: '#34d399' }, // 治療 - 綠
    '3': { bg: '#3b82f6', text: '#ffffff', border: '#3b82f6' }, // 輸出 - 藍
    'default': { bg: '#1e293b', text: '#f1f5f9', border: 'rgba(71,85,105,0.5)' }
  };

  $: getTheme = (vid: any) => vocationThemes[String(vid)] || vocationThemes.default;

  // --- 狀態變數 ---
  // groupId 已由伊務器端驗證，直接使用
  let groupId: number = data?.groupId ?? -1;
  
  let group: Group | null = null;
  let raidDate: string | null = null;
  let raidTimeOnly: string | null = null;
  let raidName: string = '';
  let raidLevel: number | null = null;
  let gearLimit: number | null = null;
  let groupStatus: Group['status'] = '招募中';
  let groupSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let members: Member[] = [];
  let loading = true;
  let error: string | null = null;
  let channel: any;
  let savingIndex: number | null = null;
  // Presence state
  let presenceChannel: any = null;
  let onlineUsers: Record<string, any> = {};
  let dbSubscription: any = null;

  // --- 自動縮放邏輯 (保留) ---
  let scale = 1;
  let scaleWrapper: HTMLElement | null = null;
  let scaleWrapperTop: HTMLElement | null = null;
  let ro: ResizeObserver | null = null;

  function recomputeScale() {
    if (typeof window === 'undefined') return (scale = 1);
    const target = scaleWrapper || scaleWrapperTop;
    if (!target) return (scale = 1);
    const rect = target.getBoundingClientRect();
    const padding = 24;
    const hScale = (window.innerHeight - padding) / rect.height;
    const wScale = (window.innerWidth - padding) / rect.width;
    scale = Math.max(0.6, Math.min(1, Math.min(hScale, wScale)));
  }

  // --- 資料抶取與儲存 ---
  async function fetchGroupData() {
    try {
      console.debug('[fetchGroupData] requested groupId:', groupId);
      
      // 透過伺服器端 API 而非直接 Supabase 查詢，確保 ID 驗證
      const response = await fetch(`/api/group/${groupId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `無法取得團隊資料 (HTTP ${response.status})`);
      }

      const groupData = await response.json();
      
      console.debug('[fetchGroupData] api response:', groupData);

      if (!groupData) throw new Error(`找不到該團隊 (id=${groupId})`);

      group = groupData;
      raidName = groupData.boss_name || '';
      groupStatus = groupData.status || '招募中';

      if (groupData.raid_time) {
        const dt = new Date(groupData.raid_time);
        raidDate = dt.toISOString().slice(0, 10);
        raidTimeOnly = dt.toTimeString().slice(0,5);
      }

      const rawMembers = groupData.members || [];
      members = Array.from({ length: 10 }, (_, i) => {
        const pos = i + 1;
        const found = rawMembers.find((m: any) => m.position_index === pos);
        const base = found || { 
          group_id: groupId, 
          position_index: pos, 
          nickname: '', 
          gear_score: 0, 
          vocation_id: null 
        };
        return { ...base, vocation_id: base.vocation_id != null ? String(base.vocation_id) : '' };
      });
    } catch (e: any) {
      error = e.message || '無法取得團隊資料';
    } finally {
      loading = false;
    }
  }

  function memberKey(m: Member) {
    // use persisted id if available, otherwise use position index as fallback
    return m.id != null ? `m:${m.id}` : `p:${m.position_index}`;
  }

  function getLockerNicknameFor(member: Member) {
    const keyToMatch = memberKey(member);
    for (const k in onlineUsers) {
      const metas = onlineUsers[k];
      if (!Array.isArray(metas) || metas.length === 0) continue;
      // metas is an array of presence metas for this key; check all entries
      for (const meta of metas) {
        if (!meta) continue;
        // compare sessionId to ensure same-nickname different-tabs don't conflict
        if (meta.editingKey === keyToMatch && meta.sessionId !== $userAccount.sessionId) {
          return meta.nickname;
        }
      }
    }
    return null;
  }

  // 如果 user nickname 之後出現，確保自動啟動 presence
  $: if (group && $userAccount?.nickname && !presenceChannel) {
    startPresence();
  }

  async function startPresence() {
    if (!group) return;
    if (!($userAccount?.nickname)) return;
    if (presenceChannel) return;

    const presKey = `${$userAccount.nickname || 'anon'}-${$userAccount.sessionId || String(Math.random())}`;
    presenceChannel = supabase.channel(`presence-group-${groupId}`, {
      config: { presence: { key: presKey } }
    });

    presenceChannel.on('presence', { event: 'sync' }, () => {
      try {
        onlineUsers = presenceChannel.presenceState();
      } catch (e) { }
    });

    presenceChannel.subscribe(async (status: any) => {
      if (status === 'SUBSCRIBED') {
        try {
          await presenceChannel.track({ nickname: $userAccount.nickname, sessionId: $userAccount.sessionId, editingKey: null });
          onlineUsers = presenceChannel.presenceState();
        } catch (e) {
          console.error('presence track error', e);
        }
      }
    });
  }

  async function stopPresence() {
    if (!presenceChannel) return;
    try {
      // attempt to untrack and unsubscribe
      await presenceChannel.unsubscribe();
    } catch (e) { }
    try {
      await supabase.removeChannel(presenceChannel);
    } catch (e) { }
    presenceChannel = null;
    onlineUsers = {};
  }

  function updateMyPresenceFor(member: Member | null) {
    if (!presenceChannel) return;
    const key = member ? memberKey(member) : null;
    try {
      presenceChannel.track({ nickname: $userAccount.nickname, sessionId: $userAccount.sessionId, editingKey: key });
    } catch (e) {
      console.error('track failed', e);
    }
  }

  function updateMemberField(index: number, patch: Partial<Member>) {
    members = members.map((m, i) => i === index ? { ...m, ...patch } : m);
    try {
      console.log('[members] updated index', index, 'patch', patch);
    } catch (e) {}
  }

  async function saveMember(index: number) {
    const m = members[index];
    savingIndex = index;

    try {
      // Ensure gear_score is a valid number
      if (m.gear_score === null || m.gear_score === undefined || isNaN(Number(m.gear_score))) {
        m.gear_score = 0;
      }
      
      console.log('[saveMember] Sending request:', { groupId, member: m });
      
      const response = await fetch(`/api/group/${groupId}/member`, {
        method: 'POST',
        body: JSON.stringify(m),
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('[saveMember] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[saveMember] HTTP error:', response.status, errorText);
        
        if (response.status === 401) {
          error = '未授權：請先登入';
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[saveMember] Result:', result);

      if (!result.success) {
        toasts.error(result.message || '儲存失敗');
        // Refresh if slot taken or data sync issue
        fetchGroupData();
        return;
      }

      // Show success message
      toasts.success('儲存成功');

      // If created (new member with no ID originally), update local ID
      if (!m.id && result.id) {
        updateMemberField(index, { id: result.id } as Partial<Member>);
      }

    } catch (e: any) {
      console.error('[saveMember] Caught error:', e);
      error = e.message || '儲存時發生未知的錯誤';
      toasts.error(`儲存失敗: ${error}`);
    } finally {
      savingIndex = null;
    }
  }

  async function saveGroup() {
    if (!group) return;
    if (groupSaveTimer) clearTimeout(groupSaveTimer);
    groupSaveTimer = setTimeout(async () => {
      try {
        let newRaidTime = group!.raid_time;
        if (raidDate && raidTimeOnly) {
          newRaidTime = new Date(`${raidDate}T${raidTimeOnly}:00`).toISOString();
        }
        
        console.log('[saveGroup] Updating group:', group!.id);
        const response = await fetch(`/api/group/${group!.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            boss_name: raidName,
            raid_time: newRaidTime,
            status: groupStatus,
            note: group!.note
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          console.error('[saveGroup] HTTP error:', response.status, await response.text());
          if (response.status === 401) {
            error = '未授權：請先登入';
          }
        } else {
          console.log('[saveGroup] Success');
        }
      } catch (e: any) {
        console.error('[saveGroup] Error:', e);
        error = `團隊更新失敗: ${e.message}`;
      }
    }, 600);
  }

  onMount(() => {
    // 只有在 ID 有效時才執行初始化
    if (!data?.isValidId) {
      loading = false;
      return;
    }

    fetchGroupData();
    startPresence();
    // 訂閱 members 表的變動，僅限本團隊
    dbSubscription = supabase
      .channel('db-members-' + groupId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `group_id=eq.${groupId}` },
        (payload: any) => {
          const ev = payload.eventType || payload.type;
          if (ev === 'UPDATE') {
            const updatedMember = payload.new as Member;
            // 若不是其他人正在編輯，才套用變更
            if (getLockerNicknameFor(updatedMember) === null) {
              const idx = members.findIndex(m => m.id === updatedMember.id);
              if (idx !== -1) {
                updateMemberField(idx, (({
                  ...updatedMember,
                  vocation_id: updatedMember.vocation_id != null ? String(updatedMember.vocation_id) : ''
                }) as unknown) as Partial<Member>);
              }
            }
          }
        }
      )
      .subscribe();
    window.addEventListener('resize', recomputeScale);
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => recomputeScale());
      if (scaleWrapper) ro.observe(scaleWrapper);
    }
    setTimeout(recomputeScale, 100);
  });

  onDestroy(() => {
    if (ro) ro.disconnect();
    stopPresence();
    if (dbSubscription) {
      try { dbSubscription.unsubscribe(); } catch (e) {}
      try { supabase.removeChannel(dbSubscription); } catch (e) {}
      dbSubscription = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', recomputeScale);
    }
  });
</script>

<main class="text-slate-100 min-h-screen bg-slate-950">
  <div class="circuit-wrapper">
    <div class="circuit-background"></div>
    
    <div class="w-full relative z-20">
      <div class="w-full lg:w-4/5 mx-auto">
        <div bind:this={scaleWrapperTop} style="transform: scale({scale}); transform-origin: top center;">
          <div class="w-full h-4"></div>
          <NavBar />
        </div>
      </div>
    </div>

    <div class="w-full relative z-10">
      <div class="w-full lg:w-4/5 mx-auto">
        <div bind:this={scaleWrapper} style="transform: scale({scale}); transform-origin: top center;">
          <div class="panel p-4 md:p-6 text-base">
            
            <nav class="mb-8">
              <a href="/group" class="text-slate-200 hover:text-white flex items-center gap-2 font-bold text-base transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                返回總覽
              </a>
            </nav>

            {#if loading}
              <div class="flex justify-center py-20 animate-pulse text-lg" role="status" aria-live="polite">
                <span class="sr-only">正在載入團隊資料...</span>
                載入中...
              </div>
            {:else if error}
              <div class="bg-red-500/10 border border-red-500/20 p-8 rounded-xl text-center space-y-4" role="alert" aria-live="assertive">
                <div class="text-red-400 text-base">{error}</div>
                <div class="flex gap-4 justify-center">
                  <a 
                    href="/group" 
                    class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                  >
                    返回團隊列表
                  </a>
                </div>
              </div>
            {:else if group}
              <div class="space-y-6">
                
                <div class="flex items-end gap-4 mb-4 flex-nowrap overflow-x-auto pb-2">
                  <div class="p-3 bg-slate-900/20 border border-slate-700 rounded-lg shrink-0">
                    <label for="raid-date" class="text-sm text-slate-500 mb-1 uppercase font-bold block">日期 Date</label>
                    <input 
                      id="raid-date"
                      type="date" 
                      class="scheme-dark bg-transparent border border-slate-700 px-2 py-1 rounded text-base outline-none" 
                      bind:value={raidDate} 
                      on:change={saveGroup}
                      aria-label="團隊出團日期"
                    />
                  </div>
                  <div class="p-3 bg-slate-900/20 border border-slate-700 rounded-lg shrink-0">
                    <label for="raid-time" class="text-sm text-slate-500 mb-1 uppercase font-bold block">時間 Time</label>
                    <input 
                      id="raid-time"
                      type="time" 
                      class="scheme-dark bg-transparent border border-slate-700 px-2 py-1 rounded text-base outline-none" 
                      bind:value={raidTimeOnly} 
                      on:change={saveGroup}
                      aria-label="團隊出團時間"
                    />
                  </div>
                  <div class="p-3 bg-slate-900/20 border border-slate-700 rounded-lg flex-1 min-w-50">
                    <label for="raid-name" class="text-sm text-slate-500 mb-1 uppercase font-bold block">副本名稱 Raid Name</label>
                    <input 
                      id="raid-name"
                      class="w-full bg-transparent border border-slate-700 px-2 py-1 rounded text-base outline-none" 
                      bind:value={raidName} 
                      on:input={saveGroup}
                      aria-label="副本名稱"
                    />
                  </div>
                  <div class="p-3 bg-slate-900/20 border border-slate-700 rounded-lg shrink-0">
                    <label for="group-status" class="text-sm text-slate-500 mb-1 uppercase font-bold block">狀態 Status</label>
                    <select 
                      id="group-status"
                      class="bg-transparent border border-slate-700 px-2 py-1 rounded text-base outline-none cursor-pointer" 
                      bind:value={groupStatus} 
                      on:change={saveGroup}
                      aria-label="團隊狀態"
                    >
                      <option value="招募中">招募中</option>
                      <option value="已準備">已準備</option>
                      <option value="已出團">已出團</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {#each members as member, i}
                    <div 
                      class="p-5 md:p-6 border rounded-lg flex flex-col items-start gap-4 w-full min-h-40 md:min-h-44 transition-all duration-300 relative"
                      style="border-color: {getTheme(member.vocation_id).border}; background-color: {getTheme(member.vocation_id).border}12;"
                    >
                      <div class="text-slate-500 font-mono text-lg font-semibold">{member.position_index}</div>

                      <label class="w-full" for="member-{i}-vocation">
                        <div class="text-sm text-slate-500 mb-1 uppercase font-bold">职業</div>
                        <div class="relative">
                          <select
                            id="member-{i}-vocation"
                            class="w-full cursor-pointer px-2 py-1.5 rounded font-black text-sm transition-colors duration-200 outline-none pr-8"
                            style="background-color: {getTheme(member.vocation_id).bg}; color: {getTheme(member.vocation_id).text}; -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: none;"
                            bind:value={member.vocation_id}
                            on:change={() => saveMember(i)}
                            on:focus={() => updateMyPresenceFor(member)}
                            on:blur={() => updateMyPresenceFor(null)}
                            disabled={!!getLockerNicknameFor(member)}
                            aria-label="成員 {i + 1} 职業"
                            aria-busy={savingIndex === i}
                          >
                            <option value="1" style="background-color: {vocationThemes['1'].bg}; color: {vocationThemes['1'].text};">坦克</option>
                            <option value="2" style="background-color: {vocationThemes['2'].bg}; color: {vocationThemes['2'].text};">治療</option>
                            <option value="3" style="background-color: {vocationThemes['3'].bg}; color: {vocationThemes['3'].text};">輸出</option>
                          </select>
                          <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" style="color: {getTheme(member.vocation_id).text}">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                          </div>
                        </div>
                      </label>

                      <label class="w-full" for="member-{i}-nickname">
                        <div class="text-sm text-slate-500 mb-1 uppercase font-bold">
                          暱稱
                          {#if getLockerNicknameFor(member)}
                            <span class="text-amber-500 ml-2 animate-pulse">🔒 {getLockerNicknameFor(member)}</span>
                          {/if}
                        </div>
                        <input
                          id="member-{i}-nickname"
                          type="text"
                          class="w-full bg-slate-950/40 border border-slate-700/50 px-2 py-1.5 rounded text-base text-slate-200 outline-none focus:border-slate-500{getLockerNicknameFor(member) ? ' ring-2 ring-amber-500/50' : ''}"
                          bind:value={member.nickname}
                          on:focus={() => updateMyPresenceFor(member)}
                          on:blur={() => { updateMyPresenceFor(null); if (member.nickname.trim()) saveMember(i); }}
                          disabled={!!getLockerNicknameFor(member)}
                          placeholder={getLockerNicknameFor(member) ? '有人正在輸入...' : '角色名'}
                          maxlength="12"
                          aria-label="成員 {i + 1} 暱稱"
                          aria-busy={savingIndex === i}
                          aria-disabled={!!getLockerNicknameFor(member)}
                        />
                      </label>

                      <label class="w-full" for="member-{i}-gear">
                        <div class="text-sm text-slate-500 mb-1 uppercase font-bold">
                          裝分
                          {#if getLockerNicknameFor(member)}
                            <span class="text-amber-500 ml-2 animate-pulse">🔒 {getLockerNicknameFor(member)}</span>
                          {/if}
                        </div>
                        <input
                          id="member-{i}-gear"
                          type="number"
                          class="w-full bg-slate-950/40 border border-slate-700/50 px-2 py-1.5 rounded text-base text-cyan-400 text-left font-mono outline-none{getLockerNicknameFor(member) ? ' ring-2 ring-amber-500/50' : ''}"
                          bind:value={member.gear_score}
                          on:focus={() => updateMyPresenceFor(member)}
                          on:blur={() => { updateMyPresenceFor(null); if (member.gear_score !== null && member.gear_score !== undefined) saveMember(i); }}
                          disabled={!!getLockerNicknameFor(member)}
                          placeholder={getLockerNicknameFor(member) ? '有人正在輸入...' : '0'}
                          min="0"
                          aria-label="成員 {i + 1} 裝備分數"
                          aria-busy={savingIndex === i}
                          aria-disabled={!!getLockerNicknameFor(member)}
                        />
                      </label>

                      {#if savingIndex === i}
                        <div class="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
                      {/if}
                      {#if getLockerNicknameFor(member)}
                        <div class="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold animate-bounce shadow-lg">
                          🔒 {getLockerNicknameFor(member)}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  .panel {
    background: linear-gradient(180deg, rgba(26,30,38,0.9), rgba(16,19,26,0.86));
    border: 1px solid rgba(99,102,241,0.1);
    backdrop-filter: blur(8px);
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }

  /* 隱藏數字箭頭 */
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* 下拉選單 Option 背景修正 */
  option {
    background-color: #0f172a;
    color: white;
  }

  .scheme-dark::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }
</style>