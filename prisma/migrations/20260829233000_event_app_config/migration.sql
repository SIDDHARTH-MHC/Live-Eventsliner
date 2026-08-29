-- CreateEnum
CREATE TYPE "event_app_mode" AS ENUM ('universal', 'white_label');

-- CreateEnum
CREATE TYPE "event_app_build_status" AS ENUM ('draft', 'queued', 'building', 'ready', 'failed');

-- CreateTable
CREATE TABLE "event_app_configs" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "event_app_mode" NOT NULL DEFAULT 'universal',
    "display_name" TEXT,
    "primary_color" TEXT,
    "icon_media_id" TEXT,
    "splash_media_id" TEXT,
    "tabs" JSONB NOT NULL DEFAULT '["home","pass","schedule","more"]',
    "ios_bundle_id" TEXT,
    "android_package" TEXT,
    "build_status" "event_app_build_status" NOT NULL DEFAULT 'draft',
    "last_build_at" TIMESTAMP(3),
    "last_build_url" TEXT,
    "store_listing_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_app_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_app_configs_event_id_key" ON "event_app_configs"("event_id");

-- AddForeignKey
ALTER TABLE "event_app_configs" ADD CONSTRAINT "event_app_configs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
