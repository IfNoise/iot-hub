-- Add deleted_at column to users table for soft delete functionality
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;
