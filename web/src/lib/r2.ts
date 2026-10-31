import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

let client: S3Client | null = null;

export function r2Client() {
  if (!env.r2AccountId || !env.r2AccessKey || !env.r2SecretKey) throw new Error("Cloudflare R2 is not configured.");
  if (!client) client = new S3Client({
    region: "auto",
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.r2AccessKey, secretAccessKey: env.r2SecretKey }
  });
  return client;
}

export function signedUploadUrl(key: string, contentType: string) {
  return getSignedUrl(r2Client(), new PutObjectCommand({ Bucket: env.r2Bucket, Key: key, ContentType: contentType }), { expiresIn: 600 });
}

export function signedDownloadUrl(key: string, fileName: string) {
  return getSignedUrl(r2Client(), new GetObjectCommand({ Bucket: env.r2Bucket, Key: key, ResponseContentDisposition: `attachment; filename="${fileName.replace(/["\r\n]/g, "")}"` }), { expiresIn: 300 });
}

export function headObject(key: string) {
  return r2Client().send(new HeadObjectCommand({ Bucket: env.r2Bucket, Key: key }));
}
