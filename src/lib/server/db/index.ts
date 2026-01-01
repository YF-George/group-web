import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// DATABASE_URL 在運行時必須存在，但在構建時可能缺失
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl && typeof window === 'undefined') {
	// 只在服務器端運行時檢查
	console.warn('DATABASE_URL is not set - database operations will fail at runtime');
}

const client = postgres(databaseUrl || '');

export const db = drizzle(client, { schema });
