-- Phase completion migration (2026-08-29)
-- Adds: Follow, SavedEvent, Message, Meeting, ExhibitorStaff, org profile fields, whatsapp/push channels

ALTER TYPE "MessageChannel" ADD VALUE IF NOT EXISTS 'whatsapp';
ALTER TYPE "MessageChannel" ADD VALUE IF NOT EXISTS 'push';

CREATE TYPE "MessageStatus" AS ENUM ('queued', 'sent', 'delivered', 'failed', 'bounced');
CREATE TYPE "MeetingStatus" AS ENUM ('requested', 'accepted', 'declined', 'done', 'cancelled');

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "is_public_profile" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "event_id" TEXT,
    "trigger" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "to_address" TEXT NOT NULL,
    "subject" TEXT,
    "body_preview" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'queued',
    "provider" TEXT,
    "provider_id" TEXT,
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "follows" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "saved_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "totp_secrets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "totp_secrets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "meetings" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "from_attendee_id" TEXT NOT NULL,
    "to_attendee_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'requested',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "exhibitor_staff" (
    "id" TEXT NOT NULL,
    "exhibitor_id" TEXT NOT NULL,
    "attendee_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exhibitor_staff_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "networking_profiles" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "networking_profiles" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE "networking_profiles" ADD COLUMN IF NOT EXISTS "goals" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "networking_profiles" ADD COLUMN IF NOT EXISTS "networking_qr_public_id" TEXT;

ALTER TABLE "exhibitors" ADD COLUMN IF NOT EXISTS "passes_used" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "exhibitors" ADD COLUMN IF NOT EXISTS "access_token" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "follows_user_id_org_id_key" ON "follows"("user_id", "org_id");
CREATE UNIQUE INDEX IF NOT EXISTS "saved_events_user_id_event_id_key" ON "saved_events"("user_id", "event_id");
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE UNIQUE INDEX IF NOT EXISTS "totp_secrets_user_id_key" ON "totp_secrets"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "exhibitors_access_token_key" ON "exhibitors"("access_token");
CREATE UNIQUE INDEX IF NOT EXISTS "exhibitor_staff_exhibitor_id_email_key" ON "exhibitor_staff"("exhibitor_id", "email");
