import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // locals.user 應由 hooks.server.ts 注入（透過 Lucia 驗證）
  return {
    user: locals.user ?? null
  };
};
