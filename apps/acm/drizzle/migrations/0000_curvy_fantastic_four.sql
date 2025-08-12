CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"keycloak_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"max_users" integer,
	"max_devices" integer,
	"current_users" integer DEFAULT 0,
	"current_devices" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "groups_keycloak_id_unique" UNIQUE("keycloak_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keycloak_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"plan" varchar(20) DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp,
	"max_users" integer DEFAULT 10,
	"max_devices" integer DEFAULT 100,
	"max_data_transfer_mb" numeric(15, 2) DEFAULT '1000.00',
	"current_users" integer DEFAULT 0,
	"current_devices" integer DEFAULT 0,
	"current_data_transfer_mb" numeric(15, 2) DEFAULT '0.00',
	"contact_email" varchar(255),
	"billing_email" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "organizations_keycloak_id_unique" UNIQUE("keycloak_id"),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"avatar" varchar(500),
	"roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"plan" varchar(20) DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp,
	"account_type" varchar(20) DEFAULT 'individual' NOT NULL,
	"organization_id" uuid,
	"groups" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "groups_organization_idx" ON "groups" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_keycloak_id_idx" ON "groups" USING btree ("keycloak_id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_org_slug_idx" ON "groups" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_keycloak_id_idx" ON "organizations" USING btree ("keycloak_id");--> statement-breakpoint
CREATE INDEX "organizations_plan_idx" ON "organizations" USING btree ("plan");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_user_id_idx" ON "users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_organization_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_plan_idx" ON "users" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "users_roles_idx" ON "users" USING btree ("roles");