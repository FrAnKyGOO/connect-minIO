import "server-only";
import * as Minio from "minio";

const endpoint = process.env.MINIO_ENDPOINT;
const accessKey = process.env.MINIO_ROOT_USER;
const secretKey = process.env.MINIO_ROOT_PASSWORD;
const bucket = process.env.MINIO_BUCKET;
const useSSL = process.env.MINIO_USE_SSL === "true";

if (!endpoint || !accessKey || !secretKey || !bucket) {
  throw new Error("MinIO environment variables are not configured");
}

export const minioBucket = bucket;

export const minio = new Minio.Client({
  endPoint: endpoint,
  port: Number(process.env.MINIO_PORT || (useSSL ? 443 : 9000)),
  useSSL,
  accessKey,
  secretKey,
});

let ensureBucketPromise: Promise<void> | undefined;

export function ensureMinioBucket() {
  ensureBucketPromise ??= (async () => {
    if (!(await minio.bucketExists(minioBucket))) {
      await minio.makeBucket(minioBucket, "us-east-1");
    }
  })().catch((error: unknown) => {
    ensureBucketPromise = undefined;
    throw error;
  });

  return ensureBucketPromise;
}
