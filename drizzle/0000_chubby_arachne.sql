CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"boss_name" text NOT NULL,
	"raid_time" timestamp with time zone NOT NULL,
	"note" text DEFAULT '',
	"status" text DEFAULT '招募中',
	"last_edited_by" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"position_index" integer NOT NULL,
	"nickname" text DEFAULT '',
	"vocation_id" integer,
	"gear_score" integer DEFAULT 0,
	"last_edited_by" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"age" integer,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;