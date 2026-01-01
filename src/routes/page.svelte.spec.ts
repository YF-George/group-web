import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render login modal with heading', async () => {
		render(Page);

		// 現在頁面顯示的是登入模態框，使用 h2 標題 "身分驗證"
		const heading = page.getByRole('heading', { level: 2, name: '身分驗證' });
		await expect.element(heading).toBeInTheDocument();
	});
});
