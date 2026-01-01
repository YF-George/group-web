import { pgTable, integer, text, timestamp, serial, pgEnum } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// Vocations table
export const vocations = pgTable('vocations', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique()
});

// Groups table
export const groups = pgTable('groups', {
	id: serial('id').primaryKey(),
	bossName: text('boss_name').notNull(),
	raidTime: timestamp('raid_time', { withTimezone: true, mode: 'string' }).notNull(),
	note: text('note').default(''),
	status: text('status').default('招募中'),
	lastEditedBy: text('last_edited_by'),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow()
});

// Members table
export const members = pgTable('members', {
	id: serial('id').primaryKey(),
	groupId: integer('group_id').references(() => groups.id).notNull(),
	positionIndex: integer('position_index').notNull(),
	nickname: text('nickname').default(''),
	vocationId: integer('vocation_id').references(() => vocations.id),
	gearScore: integer('gear_score').default(0),
	lastEditedBy: text('last_edited_by'),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow()
});

// Admin users table
export const adminUsers = pgTable('admin_users', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow()
});

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
	id: serial('id').primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	action: text('action').notNull(),
	tableName: text('table_name').notNull(),
	recordId: integer('record_id'),
	changes: text('changes'),
	timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).defaultNow()
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Vocation = typeof vocations.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
