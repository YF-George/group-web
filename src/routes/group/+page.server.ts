import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { groups, members } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  console.log('[page-load] locals.user:', locals.user);
  return {
    user: locals.user
  };
};

export const actions: Actions = {
  createGroup: async ({ request, locals }) => {
    console.log('[createGroup-action] 開始執行');
    console.log('[createGroup-action] locals.user:', locals.user);

    if (!locals.user) {
      console.log('[createGroup-action] 用戶未登入');
      return fail(401, { message: '請先登入' });
    }

    const formData = await request.formData();
    const boss_name = String(formData.get('boss_name') || '');
    const raid_time = String(formData.get('raid_time') || '');
    const note = String(formData.get('note') || '');

    if (!boss_name || !raid_time) {
      console.log('[createGroup-action] 缺少必要欄位');
      return fail(400, { message: '缺少必要欄位' });
    }

    try {
      const editor = locals.user.username;

      console.log('[createGroup-action] 開始建立團隊:', { boss_name, raid_time, editor });

      // 1. Create Group
      const insertResult = await db.insert(groups).values({
        bossName: boss_name,
        raidTime: raid_time,
        note: note,
        status: '招募中',
        lastEditedBy: editor
      }).returning();

      console.log('[createGroup-action] 插入結果:', insertResult);

      if (!insertResult || insertResult.length === 0) {
        throw new Error('Failed to create group - no result returned');
      }

      const newGroup = insertResult[0];
      console.log('[createGroup-action] 新建團隊:', newGroup);

      // 2. Create Default Members
      const defaultMembers = Array.from({ length: 10 }, (_, i) => ({
        groupId: newGroup.id,
        positionIndex: i + 1,
        nickname: '',
        vocationId: i === 0 ? 1 : (i === 1 || i === 2 ? 2 : 3),
        lastEditedBy: editor
      }));

      console.log('[createGroup-action] 準備插入成員:', defaultMembers.length, '個位置');

      const membersResult = await db.insert(members).values(defaultMembers);
      
      console.log('[createGroup-action] 成員插入成功');

      return { success: true, group: newGroup };
    } catch (err: any) {
      console.error('[createGroup-action] 錯誤:', err);
      const errorMessage = err?.message || String(err) || '未知錯誤';
      console.error('[createGroup-action] 詳細錯誤:', errorMessage);
      return fail(500, { message: `資料庫寫入失敗: ${errorMessage}` });
    }
  }
};
