import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { members, groups } from '$lib/server/db/schema';
import { sql, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { isRateLimited } from '$lib/server/rateLimit';

export const POST: RequestHandler = async ({ request, locals, params, getClientAddress }) => {
	if (!locals.user) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	// Rate limiting: 30 requests per minute per user
	const identifier = `member-edit:${locals.user.id}`;
	if (isRateLimited({ identifier, max: 30, windowMs: 60 * 1000 })) {
		return json({ success: false, message: 'Too many requests' }, { status: 429 });
	}

	try {
		const body = await request.json();
		const { id, nickname, vocation_id, gear_score, group_id, position_index } = body;
		const editor = locals.user.username;

		// Validate nickname length
		const trimmedNickname = (nickname || '').trim();
		if (trimmedNickname && trimmedNickname.length > 12) {
			return json({ success: false, message: '暱稱不可超過 12 字' }, { status: 400 });
		}

		// Use empty string for unassigned slots (not '待定')
		const finalNickname = trimmedNickname || '';

		// Verify user has permission to edit this group
		const groupIdNum = Number(params.id);
		if (isNaN(groupIdNum)) {
			return json({ success: false, message: 'Invalid group ID' }, { status: 400 });
		}

		// Verify group exists and user has access (optional: add ownership check)
		const [groupExists] = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, groupIdNum)).limit(1);
		if (!groupExists) {
			return json({ success: false, message: '找不到該團隊' }, { status: 404 });
		}

		// UPDATE existing member
		if (id) {
			// Call the atomic RPC with all 5 parameters (including gear_score)
			// This matches the SQL signature: (p_member_id, p_new_nickname, p_vocation_id, p_gear_score, p_editor_nickname)
			const rpcResult = await db.execute(sql`
				SELECT * FROM atomic_save_member(
					${id},
					${finalNickname},
					${vocation_id},
					${gear_score || 0},
					${editor}
				)
			`);

			const resultRow = rpcResult[0] as any;
			
			if (resultRow && resultRow.success === false) {
				return json({ success: false, message: resultRow.message || 'Slot taken' });
			}

			return json({ success: true, message: 'Saved' });
		} 
		// CREATE new member (if the slot row is missing)
		else {
			if (!group_id || !position_index) {
				return json({ success: false, message: 'Missing group_id or position_index' }, { status: 400 });
			}
			
			const [newMember] = await db.insert(members).values({
				groupId: group_id,
				positionIndex: position_index,
				nickname: finalNickname,
				vocationId: vocation_id,
				gearScore: gear_score || 0,
				lastEditedBy: editor
			}).returning();

			return json({ success: true, message: 'Created', id: newMember.id });
		}

	} catch (err) {
		console.error('API /group/member error:', err);
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
};
