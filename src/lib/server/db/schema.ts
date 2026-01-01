import { pgTable, integer, text, timestamp, serial } from 'drizzle-orm/pg-core';

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

export const groups = pgTable('groups', {
	id: serial('id').primaryKey(),
	bossName: text('boss_name').notNull(),
	raidTime: timestamp('raid_time', { withTimezone: true, mode: 'string' }).notNull(),
	note: text('note').default(''),
	status: text('status').default('招募中'),
	lastEditedBy: text('last_edited_by'),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow()
});

export const members = pgTable('members', {
	id: serial('id').primaryKey(),
	groupId: integer('group_id').references(() => groups.id).notNull(),
	positionIndex: integer('position_index').notNull(),
	nickname: text('nickname').default(''),
	vocationId: integer('vocation_id'),
	gearScore: integer('gear_score').default(0),
	lastEditedBy: text('last_edited_by'),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow()
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Member = typeof members.$inferSelect;
