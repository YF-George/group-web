import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	// 在伺服器端驗證 ID 並傳遞給頁面
	const groupId = params.id ? parseInt(params.id, 10) : null;
	
	return {
		groupId,
		isValidId: groupId && !isNaN(groupId) && groupId > 0
	};
};
