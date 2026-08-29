import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function getS3Client(): S3Client | null {
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) return null;
  return new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? "ap-south-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minioadmin",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin",
    },
    forcePathStyle: true,
  });
}

export async function ensureBucket(): Promise<void> {
  const client = getS3Client();
  const bucket = process.env.S3_BUCKET;
  if (!client || !bucket) return;
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export function validateMediaUpload(mimeType: string, sizeBytes: number): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("INVALID_MIME_TYPE");
  }
  if (sizeBytes > MAX_SIZE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
}

export async function createPresignedUpload(params: {
  orgId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById?: string;
}) {
  validateMediaUpload(params.mimeType, params.sizeBytes);
  const ext = params.filename.split(".").pop() ?? "bin";
  const storageKey = `${params.orgId}/${randomUUID()}.${ext}`;

  const media = await db.media.create({
    data: {
      orgId: params.orgId,
      filename: params.filename,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      storageKey,
      uploadedById: params.uploadedById,
      status: "pending",
    },
  });

  const client = getS3Client();
  const bucket = process.env.S3_BUCKET;
  if (!client || !bucket) {
    return {
      mediaId: media.id,
      uploadUrl: null as string | null,
      storageKey,
      devMode: true,
    };
  }

  await ensureBucket();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: params.mimeType,
    ContentLength: params.sizeBytes,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

  return { mediaId: media.id, uploadUrl, storageKey, devMode: false };
}

export function getPublicMediaUrl(storageKey: string): string | null {
  const base = process.env.S3_PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${storageKey}`;
}
