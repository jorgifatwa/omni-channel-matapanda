import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * S3-compatible object storage (Backblaze B2 by default).
 *
 * The bucket is PRIVATE: files are served to browsers through the
 * `/api/media/[...key]` proxy route, which is cached by the Vercel CDN.
 *
 * Env:
 *   STORAGE_ENDPOINT          e.g. https://s3.us-east-005.backblazeb2.com
 *   STORAGE_REGION            e.g. us-east-005
 *   STORAGE_ACCESS_KEY_ID     B2 keyID
 *   STORAGE_SECRET_ACCESS_KEY B2 applicationKey
 *   STORAGE_BUCKET_NAME       e.g. itsmatapanda-storage
 *   STORAGE_PUBLIC_URL        optional; defaults to "/api/media"
 */

const PLACEHOLDERS = new Set(["", "your-storage-key-id", "your-storage-secret"]);

let cachedClient: S3Client | null = null;

export function getStorageBucket(): string | null {
  const bucket = process.env.STORAGE_BUCKET_NAME?.trim();
  return bucket ? bucket : null;
}

/**
 * Returns a configured S3Client, or null when storage env vars are missing.
 */
export function getStorageClient(): S3Client | null {
  if (cachedClient) return cachedClient;

  const endpoint = process.env.STORAGE_ENDPOINT?.trim();
  const region = process.env.STORAGE_REGION?.trim();
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY?.trim() ?? "";

  if (
    !endpoint ||
    !region ||
    !getStorageBucket() ||
    PLACEHOLDERS.has(accessKeyId) ||
    PLACEHOLDERS.has(secretAccessKey)
  ) {
    return null;
  }

  cachedClient = new S3Client({
    region,
    endpoint: endpoint.startsWith("http") ? endpoint : `https://${endpoint}`,
    credentials: { accessKeyId, secretAccessKey },
    // Backblaze B2 does not accept the default CRC32 checksum headers that
    // newer AWS SDK versions send, so only send checksums when required.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return cachedClient;
}

function publicUrlBase(): string {
  const base = process.env.STORAGE_PUBLIC_URL?.trim() || "/api/media";
  return base.replace(/\/$/, "");
}

/**
 * Uploads a file buffer to the storage bucket and returns its public URL
 * (served via the /api/media proxy unless STORAGE_PUBLIC_URL overrides it).
 */
export async function uploadToStorage(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string,
  folder: string = "products"
): Promise<{ url: string; key: string }> {
  const client = getStorageClient();
  const bucket = getStorageBucket();
  if (!client || !bucket) {
    throw new Error("Object storage credentials are not configured");
  }

  const cleanFolder =
    folder
      .toLowerCase()
      .replace(/[^a-z0-9/-]/g, "-")
      .replace(/\/+/g, "/")
      .replace(/^\/|\/$/g, "") || "products";
  const cleanFileName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "-")
    .replace(/-+/g, "-");
  const key = `${cleanFolder}/${Date.now()}-${cleanFileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  return { url: `${publicUrlBase()}/${key}`, key };
}

/**
 * Fetches an object from the bucket. Returns null if it does not exist.
 */
export async function getStorageObject(key: string) {
  const client = getStorageClient();
  const bucket = getStorageBucket();
  if (!client || !bucket) return null;

  try {
    return await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    const name = (error as { name?: string })?.name;
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;
    if (name === "NoSuchKey" || name === "NotFound" || status === 404) {
      return null;
    }
    throw error;
  }
}
