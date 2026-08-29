-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('email', 'sms');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('pending', 'accepted', 'declined');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "custom_subdomain" TEXT,
ADD COLUMN     "sso_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sso_provider" TEXT;

-- AlterTable
ALTER TABLE "attendees" ADD COLUMN     "attendance_mode" "AttendanceMode" NOT NULL DEFAULT 'in_person',
ADD COLUMN     "nfc_uid" TEXT;

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "event_id" TEXT,
    "org_id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL DEFAULT 'email',
    "subject" TEXT,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "attendee_id" TEXT,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_sessions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "track_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "room" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speakers" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "bio" TEXT,
    "photo_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_speakers" (
    "session_id" TEXT NOT NULL,
    "speaker_id" TEXT NOT NULL,

    CONSTRAINT "session_speakers_pkey" PRIMARY KEY ("session_id","speaker_id")
);

-- CreateTable
CREATE TABLE "session_saves" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "attendee_id" TEXT NOT NULL,

    CONSTRAINT "session_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "networking_profiles" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "attendee_id" TEXT NOT NULL,
    "headline" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "connect_code" TEXT NOT NULL,

    CONSTRAINT "networking_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_requests" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "from_attendee_id" TEXT NOT NULL,
    "to_attendee_id" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_tiers" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sponsor_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "tier_id" TEXT,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "website" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibitors" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "booth_number" TEXT,
    "logo_url" TEXT,
    "pass_quota" INTEGER NOT NULL DEFAULT 5,
    "contact_email" TEXT,

    CONSTRAINT "exhibitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "exhibitor_id" TEXT NOT NULL,
    "attendee_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "notes" TEXT,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streams" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "embed_url" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mux',
    "is_live" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_templates" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "layout" JSONB NOT NULL DEFAULT '{}',
    "zpl_template" TEXT,

    CONSTRAINT "badge_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_custom_subdomain_key" ON "organizations"("custom_subdomain");

-- CreateIndex
CREATE INDEX "message_templates_org_id_idx" ON "message_templates"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_event_id_trigger_channel_key" ON "message_templates"("event_id", "trigger", "channel");

-- CreateIndex
CREATE INDEX "survey_responses_event_id_idx" ON "survey_responses"("event_id");

-- CreateIndex
CREATE INDEX "tracks_event_id_idx" ON "tracks"("event_id");

-- CreateIndex
CREATE INDEX "event_sessions_event_id_starts_at_idx" ON "event_sessions"("event_id", "starts_at");

-- CreateIndex
CREATE INDEX "speakers_event_id_idx" ON "speakers"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_saves_session_id_attendee_id_key" ON "session_saves"("session_id", "attendee_id");

-- CreateIndex
CREATE UNIQUE INDEX "networking_profiles_attendee_id_key" ON "networking_profiles"("attendee_id");

-- CreateIndex
CREATE UNIQUE INDEX "networking_profiles_connect_code_key" ON "networking_profiles"("connect_code");

-- CreateIndex
CREATE INDEX "networking_profiles_event_id_visible_idx" ON "networking_profiles"("event_id", "visible");

-- CreateIndex
CREATE UNIQUE INDEX "connection_requests_event_id_from_attendee_id_to_attendee_id_key" ON "connection_requests"("event_id", "from_attendee_id", "to_attendee_id");

-- CreateIndex
CREATE INDEX "sponsor_tiers_event_id_idx" ON "sponsor_tiers"("event_id");

-- CreateIndex
CREATE INDEX "sponsors_event_id_idx" ON "sponsors"("event_id");

-- CreateIndex
CREATE INDEX "exhibitors_event_id_idx" ON "exhibitors"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_exhibitor_id_attendee_id_key" ON "leads"("exhibitor_id", "attendee_id");

-- CreateIndex
CREATE INDEX "leads_exhibitor_id_idx" ON "leads"("exhibitor_id");

-- CreateIndex
CREATE INDEX "streams_event_id_idx" ON "streams"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_org_id_idx" ON "api_keys"("org_id");

-- CreateIndex
CREATE INDEX "webhook_endpoints_org_id_idx" ON "webhook_endpoints"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "badge_templates_event_id_key" ON "badge_templates"("event_id");

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speakers" ADD CONSTRAINT "speakers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_speakers" ADD CONSTRAINT "session_speakers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "event_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_speakers" ADD CONSTRAINT "session_speakers_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "speakers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_saves" ADD CONSTRAINT "session_saves_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "event_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networking_profiles" ADD CONSTRAINT "networking_profiles_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_tiers" ADD CONSTRAINT "sponsor_tiers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "sponsor_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibitors" ADD CONSTRAINT "exhibitors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_exhibitor_id_fkey" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
