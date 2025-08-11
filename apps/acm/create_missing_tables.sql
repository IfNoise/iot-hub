-- Create missing tables for ACM service

-- Organizations table (needs to be created first due to FK references)
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "keycloak_id" varchar(255) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "display_name" varchar(255),
  "description" text,
  "domain" varchar(255),
  "plan" varchar(20) DEFAULT 'free' NOT NULL,
  "plan_expires_at" timestamp,
  "max_users" integer DEFAULT 100,
  "max_devices" integer DEFAULT 50,
  "max_monthly_data_mb" numeric(15, 2) DEFAULT '1000.00',
  "billing_email" varchar(255),
  "billing_address" jsonb,
  "contact_info" jsonb,
  "settings" jsonb DEFAULT '{}',
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

-- Groups table
CREATE TABLE IF NOT EXISTS "groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "keycloak_id" varchar(255) NOT NULL UNIQUE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "parent_group_id" uuid,
  "name" varchar(255) NOT NULL,
  "description" text,
  "max_users" integer,
  "max_devices" integer,
  "permissions" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

-- User Groups relationship table
CREATE TABLE IF NOT EXISTS "user_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "group_id" uuid NOT NULL REFERENCES "groups"("id"),
  "role" varchar(50) DEFAULT 'member' NOT NULL,
  "added_at" timestamp DEFAULT now() NOT NULL,
  "added_by" uuid NOT NULL
);

-- Billing Events table
CREATE TABLE IF NOT EXISTS "billing_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_type" varchar(50) NOT NULL,
  "entity_type" varchar(20) NOT NULL,
  "entity_id" uuid NOT NULL,
  "event_data" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Data Usage table  
CREATE TABLE IF NOT EXISTS "data_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "organization_id" uuid REFERENCES "organizations"("id"),
  "device_id" uuid,
  "data_transferred_mb" numeric(15, 2) NOT NULL,
  "message_count" integer DEFAULT 0,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "billable_amount" numeric(10, 2),
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_keycloak_id_idx" ON "organizations"("keycloak_id");
CREATE INDEX IF NOT EXISTS "organizations_plan_idx" ON "organizations"("plan");
CREATE INDEX IF NOT EXISTS "organizations_domain_idx" ON "organizations"("domain");

CREATE UNIQUE INDEX IF NOT EXISTS "groups_keycloak_id_idx" ON "groups"("keycloak_id");
CREATE INDEX IF NOT EXISTS "groups_organization_idx" ON "groups"("organization_id");
CREATE INDEX IF NOT EXISTS "groups_parent_group_idx" ON "groups"("parent_group_id");
CREATE INDEX IF NOT EXISTS "groups_name_org_idx" ON "groups"("name", "organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "user_groups_user_group_idx" ON "user_groups"("user_id", "group_id");
CREATE INDEX IF NOT EXISTS "user_groups_user_idx" ON "user_groups"("user_id");
CREATE INDEX IF NOT EXISTS "user_groups_group_idx" ON "user_groups"("group_id");

CREATE INDEX IF NOT EXISTS "billing_events_event_type_idx" ON "billing_events"("event_type");
CREATE INDEX IF NOT EXISTS "billing_events_entity_idx" ON "billing_events"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "billing_events_created_at_idx" ON "billing_events"("created_at");

CREATE INDEX IF NOT EXISTS "data_usage_user_period_idx" ON "data_usage"("user_id", "period_start");
CREATE INDEX IF NOT EXISTS "data_usage_org_period_idx" ON "data_usage"("organization_id", "period_start");
CREATE INDEX IF NOT EXISTS "data_usage_device_period_idx" ON "data_usage"("device_id", "period_start");

-- Update organizations foreign key in users table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_organization_id_organizations_id_fk'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" 
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Add self-reference FK for groups parent_group_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'groups_parent_group_id_groups_id_fk'
    ) THEN
        ALTER TABLE "groups" ADD CONSTRAINT "groups_parent_group_id_groups_id_fk" 
        FOREIGN KEY ("parent_group_id") REFERENCES "groups"("id") ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON TABLE "organizations" IS 'Organizations/companies in the system';
COMMENT ON TABLE "groups" IS 'Hierarchical groups within organizations';
COMMENT ON TABLE "user_groups" IS 'Many-to-many relationship between users and groups';
COMMENT ON TABLE "billing_events" IS 'Billing and usage events';
COMMENT ON TABLE "data_usage" IS 'Data usage tracking for billing';
