import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Creates and returns an S3Client instance configured for Cloudflare R2.
 * Returns null if the required environment variables are not set.
 */
export function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    accountId === "your-cloudflare-account-id" ||
    accessKeyId === "your-r2-access-key-id"
  ) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Uploads a file buffer to Cloudflare R2 bucket.
 */
export async function uploadToR2(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string,
  folder: string = "products"
): Promise<{ url: string; key: string }> {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME || "matapanda-images";

  if (!client) {
    throw new Error("Cloudflare R2 credentials are not configured");
  }

  const cleanFileName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "-")
    .replace(/-+/g, "-");
  const key = `${folder}/${Date.now()}-${cleanFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await client.send(command);

  // Use custom public domain if configured, or default R2 dev URL
  const publicUrlBase = process.env.R2_PUBLIC_URL
    ? process.env.R2_PUBLIC_URL.replace(/\/$/, "")
    : `https://${bucketName}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const url = `${publicUrlBase}/${key}`;
  return { url, key };
}
