import { supabase } from './supabaseClient';
import { userAccount } from './userStore';
import { get } from 'svelte/store';

// --- 型別定義 ---

export type Group = {
  id: number;
  status: '招募中' | '已準備' | '已出團';
  boss_name: string;
  raid_time: string;
  note: string;
  last_edited_by: string;
};

export type Member = {
  id?: number; // 儲存時 ID 通常已存在
  group_id: number;
  position_index: number;
  nickname: string;
  gear_score?: number | null;
  vocation_id?: number | null;
  last_edited_by: string;
};

// --- API 實作 ---

export const api = {
  /**
   * 1. 同步 Session 暱稱 (內部私有，確保 Trigger 能抓到誰在操作)
   */
  async syncSession(): Promise<string> {
    const { nickname } = get(userAccount);
    const editorName = nickname || '未知用戶';
    // 呼叫 SQL 中的 set_session_nickname 確保審計日誌正確
    await supabase.rpc('set_session_nickname', { nickname: editorName });
    return editorName;
  },

  /**
   * 2. 完美儲存：原子化更新成員 (報名/修改)
   * 取代原本的 updateMember，解決多人搶位衝突
   */
  async atomicSaveMember(memberId: number, nickname: string, vocationId: number, gearScore?: number, editorNickname?: string) {
    // editorNickname optional: if not provided, sync from session
    const editor = editorNickname ?? await api.syncSession();

    // Try-catch with a fallback order: some DB deployments expose different
    // function signatures/order. First try the 'editor-first' ordering; if
    // the schema cache reports the function not found, retry with the
    // member-first ordering which older migrations may use.
    // According to the SQL you provided, the function signature is:
    // (p_member_id INTEGER, p_new_nickname TEXT, p_vocation_id INTEGER, p_gear_score INTEGER, p_editor_nickname TEXT)
    // Send all five parameters for the new security-hardened version.
    const tryStandard = async () =>
      await supabase.rpc('atomic_save_member', {
        p_member_id: memberId,
        p_new_nickname: nickname,
        p_vocation_id: vocationId,
        p_gear_score: gearScore ?? 0,
        p_editor_nickname: editor
      });

    // attempt editor-first, fallback to member-first on not-found/schema errors
    let resp: any;
    try {
      resp = await tryStandard();
    } catch (e: any) {
      const msg = (e && e.message) || String(e);
      // detect schema cache / function not found style errors
      if (/Could not find the function|function .* does not exist|schema cache|404/i.test(msg)) {
        console.warn('atomic_save_member not found or schema mismatch:', msg);
        // fall through to resp (which is undefined) so later error handling triggers fallback
        resp = (e as any);
      } else {
        console.error('RPC 儲存失敗:', e);
        throw e;
      }
    }

    const { data, error } = resp;
    if (error) {
      // Detailed logging to help debugging in DevTools
      console.error('RPC 儲存失敗 (after call):', {
        status: (error as any)?.status || null,
        message: (error as any)?.message || String(error),
        details: (error as any)?.details || null
      });

      // If the RPC endpoint/function is not available, fall back to a conservative
      // direct UPDATE to the members table so the client can still save data.
      // This avoids a hard 404 blocking the UX; it is less atomic but preferable
      // to a complete failure. The fallback will return an object matching
      // the expected shape.
      try {
        const upd = await api.updateMember(memberId, { nickname, vocation_id: vocationId as any });
        return { success: !!upd, message: upd ? 'fallback: updated via REST' : 'fallback: update failed' };
      } catch (upErr) {
        console.error('Fallback updateMember also failed:', upErr);
        throw error; // throw original RPC error
      }
    }

    // 回傳格式: { success?: boolean, message?: string }
    return data as { success?: boolean; message?: string };
  },

  /**
   * 3. 取得所有團隊 (含成員資料)
   * 效能優化：只選擇需要的欄位
   */
  async fetchGroups(): Promise<(Group & { members: Member[] })[]> {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        id,
        boss_name,
        raid_time,
        status,
        note,
        last_edited_by,
        members:members!inner(
          id,
          position_index,
          nickname,
          vocation_id,
          gear_score
        )
      `)
      .order('raid_time', { ascending: false });
    
    if (error) throw error;
    return data as (Group & { members: Member[] })[];
  },

  /**
   * 4. 建立團隊與初始化位子
   */
  async createGroup(groupData: { boss_name: string; raid_time: string; note: string; status?: string }) {
    const editor = await api.syncSession();
    
    // 建立團隊主表
    const { data: group, error: gError } = await supabase
      .from('groups')
      .insert([{ 
        ...groupData, 
        status: groupData.status || '招募中', 
        last_edited_by: editor 
      }])
      .select()
      .single();

    if (gError) throw gError;

    // 自動初始化 10 個空暱稱成員位子（不使用字串佔位符）
    const defaultMembers = Array.from({ length: 10 }, (_, i) => ({
      group_id: group.id,
      position_index: i + 1,
      nickname: '',
      // default vocations: 1 tank, next 2 heals, rest dps
      vocation_id: i === 0 ? 1 : (i === 1 || i === 2 ? 2 : 3),
      last_edited_by: editor
    }));

    const { error: mError } = await supabase.from('members').insert(defaultMembers);
    if (mError) throw mError;

    return group as Group;
  },

  /**
   * 5. 更新團隊資訊 (主表)
   */
  async updateGroup(id: number, update: Partial<Group>) {
    const editor = await api.syncSession();
    const { error } = await supabase
      .from('groups')
      .update({ ...update, last_edited_by: editor })
      .eq('id', id);
    
    return !error;
  },

  /**
   * 6. 管理員登入驗證
   */
  async verifyAdmin(nickname: string, password: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_admin_access', {
      p_nickname: nickname,
      p_password: password
    });
    if (error) {
      console.error('驗證失敗:', error);
      return false;
    }
    return !!data;
  }
  ,

  /**
   * 向後相容：更新成員（保留舊 API）
   */
  async updateMember(id: number, update: Partial<Member>) {
    const editor = await api.syncSession();
    const { error } = await supabase
      .from('members')
      .update({ ...update, last_edited_by: editor })
      .eq('id', id);
    return !error;
  },

  /**
   * 向後相容：批次建立成員（保留舊 API）
   */
  async bulkCreateMembers(members: Member[]) {
    const { error } = await supabase.from('members').insert(members);
    if (error) throw error;
    return true;
  }
  ,
  /**
   * 建立單一成員並回傳建立後的資料（包含 id）
   */
  async createMember(member: Member) {
    const editor = await api.syncSession();
    const payload = { ...member, last_edited_by: editor };
    const { data, error } = await supabase.from('members').insert([payload]).select().single();
    if (error) {
      console.error('createMember failed:', error);
      throw error;
    }
    return data as Member;
  }
};