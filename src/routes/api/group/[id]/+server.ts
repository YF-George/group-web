import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { groups, members } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const groupId = parseInt(params.id);
		if (isNaN(groupId) || groupId <= 0) {
			return json({ error: '無效的團隊 ID' }, { status: 400 });
		}

		const [groupData] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
		if (!groupData) {
			return json({ error: '找不到該團隊' }, { status: 404 });
		}

		// Fetch members for this group
		const memberList = await db.select().from(members).where(eq(members.groupId, groupId));

		return json({
			id: groupData.id,
			boss_name: groupData.bossName,
			raid_time: groupData.raidTime,
			note: groupData.note,
			status: groupData.status,
			last_edited_by: groupData.lastEditedBy,
			members: memberList.map(m => ({
				id: m.id,
				group_id: m.groupId,
				position_index: m.positionIndex,
				nickname: m.nickname,
				vocation_id: m.vocationId,
				gear_score: m.gearScore,
				last_edited_by: m.lastEditedBy
			}))
		});
	} catch (err) {
		console.error('API /group GET error:', err);
		return json({ error: 'Server error' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	const groupId = parseInt(params.id);
	if (isNaN(groupId)) {
		return json({ success: false, message: 'Invalid Group ID' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const { boss_name, raid_time, status, note } = body;
		const editor = locals.user.username;

		await db.update(groups)
			.set({
				bossName: boss_name,
				raidTime: raid_time,
				status: status,
				note: note,
				lastEditedBy: editor
			})
			.where(eq(groups.id, groupId));

		return json({ success: true });

	} catch (err) {
		console.error('API /group update error:', err);
		return json({ success: false, message: 'Update failed' }, { status: 500 });
	}
};
