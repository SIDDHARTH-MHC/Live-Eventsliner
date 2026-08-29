-- CreateEnum
CREATE TYPE "EventStaffRole" AS ENUM ('checkin', 'registration', 'manager');

-- CreateEnum
CREATE TYPE "CheckInResult" AS ENUM ('ok', 'already', 'invalid', 'revoked', 'wrong_event', 'denied');

-- CreateTable
CREATE TABLE "ticket_tokens" (
    "id" TEXT NOT NULL,
    "attendee_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_staff" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "role" "EventStaffRole" NOT NULL DEFAULT 'checkin',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "event_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "attendee_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'gate',
    "location_id" TEXT,
    "station_id" TEXT,
    "staff_user_id" TEXT,
    "result" "CheckInResult" NOT NULL,
    "offline_id" TEXT,
    "idempotency_key" TEXT,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_tokens_attendee_id_key" ON "ticket_tokens"("attendee_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_tokens_token_key" ON "ticket_tokens"("token");

-- CreateIndex
CREATE INDEX "event_staff_user_id_idx" ON "event_staff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_staff_event_id_phone_key" ON "event_staff"("event_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_offline_id_key" ON "check_ins"("offline_id");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_idempotency_key_key" ON "check_ins"("idempotency_key");

-- CreateIndex
CREATE INDEX "check_ins_event_id_scanned_at_idx" ON "check_ins"("event_id", "scanned_at");

-- CreateIndex
CREATE INDEX "check_ins_attendee_id_idx" ON "check_ins"("attendee_id");

-- CreateIndex
CREATE INDEX "check_ins_credential_id_location_idx" ON "check_ins"("credential_id", "location");

-- AddForeignKey
ALTER TABLE "ticket_tokens" ADD CONSTRAINT "ticket_tokens_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "attendees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "attendees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
