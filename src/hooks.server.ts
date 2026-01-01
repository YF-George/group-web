import type { Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	console.log('[hooks.server] 檢查會話 Cookie');
	console.log('[hooks.server] sessionToken:', sessionToken ? '✓ 存在' : '✗ 缺失');

	if (!sessionToken) {
		console.log('[hooks.server] 無效的會話 Token，設置 user 為 null');
		event.locals.user = null;
		event.locals.session = null;

		return resolve(event);
	}

	console.log('[hooks.server] 開始驗證會話 Token');
	const { session, user } = await auth.validateSessionToken(sessionToken);

	console.log('[hooks.server] 驗證結果:', {
		session: session ? `✓ 有效 (過期時間: ${session.expiresAt.toISOString()})` : '✗ 無效',
		user: user ? `✓ 用戶: ${user.username}` : '✗ 未找到'
	});

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);
};

export const handle: Handle = handleAuth;
