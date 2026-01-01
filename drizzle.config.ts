import { defineConfig } from 'drizzle-kit';

// 在構建時 DATABASE_URL 可能不可用，所以我們使用一個虛擬值
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://placeholder:password@localhost/placeholder';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: DATABASE_URL },
	verbose: true,
	strict: true
});
