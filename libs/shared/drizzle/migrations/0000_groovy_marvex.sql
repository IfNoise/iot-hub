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
CREATE TABLE "devices" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"model" varchar(255) DEFAULT '' NOT NULL,
	"public_key" text NOT NULL,
	"firmware_version" varchar(50),
	"owner_id" uuid,
	"owner_type" varchar(10) DEFAULT 'user' NOT NULL,
	"status" varchar(20) DEFAULT 'unbound' NOT NULL,
	"organization_id" uuid,
	"group_id" uuid,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"bound_at" timestamp,
	"binding_token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"device_data" jsonb,
	"deleted_at" timestamp
);
--> statement-breakpoint
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
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serial_number" varchar(255) NOT NULL,
	"common_name" varchar(255) NOT NULL,
	"fingerprint" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"device_id" varchar(255),
	"user_id" uuid,
	"organization_id" uuid,
	"pem_certificate" text NOT NULL,
	"pem_private_key" text,
	"subject" text NOT NULL,
	"issuer" text NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"revoked_at" timestamp,
	"revocation_reason" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_serial_number_unique" UNIQUE("serial_number"),
	CONSTRAINT "certificates_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_user_id_idx" ON "users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_organization_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_plan_idx" ON "users" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "users_roles_idx" ON "users" USING btree ("roles");--> statement-breakpoint
CREATE INDEX "devices_owner_idx" ON "devices" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "devices_organization_idx" ON "devices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "devices_status_idx" ON "devices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "devices_model_idx" ON "devices" USING btree ("model");--> statement-breakpoint
CREATE INDEX "devices_last_seen_idx" ON "devices" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "groups_organization_idx" ON "groups" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_keycloak_id_idx" ON "groups" USING btree ("keycloak_id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_org_slug_idx" ON "groups" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_keycloak_id_idx" ON "organizations" USING btree ("keycloak_id");--> statement-breakpoint
CREATE INDEX "organizations_plan_idx" ON "organizations" USING btree ("plan");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_serial_number_idx" ON "certificates" USING btree ("serial_number");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_fingerprint_idx" ON "certificates" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "certificates_device_id_idx" ON "certificates" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "certificates_user_id_idx" ON "certificates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "certificates_organization_id_idx" ON "certificates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "certificates_status_idx" ON "certificates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "certificates_type_idx" ON "certificates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "certificates_validity_idx" ON "certificates" USING btree ("valid_from","valid_to");