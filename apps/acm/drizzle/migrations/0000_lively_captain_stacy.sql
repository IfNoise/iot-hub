CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"avatar" varchar(500),
	"balance" numeric(10, 2) DEFAULT '0.00',
	"plan" varchar(20) DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp,
	"account_type" varchar(20) DEFAULT 'individual' NOT NULL,
	"organization_id" uuid,
	"groups" jsonb,
	"device_limit" integer DEFAULT 5,
	"current_device_count" integer DEFAULT 0,
	"monthly_data_usage" numeric(15, 2) DEFAULT '0.00',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_user_id_idx" ON "users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_organization_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_plan_idx" ON "users" USING btree ("plan");