/**
 * Small client-side helpers for admin pages that talk to database-backed APIs.
 * They throw readable (Indonesian) errors instead of silently pretending a
 * request succeeded, so pages can show the real failure to the admin.
 */

async function readErrorReason(res: Response): Promise<string | undefined> {
  const data = await res.json().catch(() => ({}));
  const reason = (data as { error?: unknown }).error;
  return typeof reason === "string" && reason ? reason : undefined;
}

/** Load data (GET). Throws when the server/database could not provide it. */
export async function adminFetchJson<T = unknown>(url: string, label: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new Error(`Gagal menghubungi server saat memuat ${label}. Periksa koneksi internet.`);
  }
  if (!res.ok) {
    const reason = await readErrorReason(res);
    throw new Error(
      reason
        ? `Gagal memuat ${label} dari database: ${reason}`
        : `Gagal memuat ${label} dari database (HTTP ${res.status}).`
    );
  }
  return (await res.json()) as T;
}

/** Write data (POST/PUT/PATCH/DELETE). Throws when the database write failed. */
export async function adminRequestJson<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body: unknown,
  label: string
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Gagal menghubungi server saat menyimpan ${label}. Periksa koneksi internet.`);
  }
  if (!res.ok) {
    const reason = await readErrorReason(res);
    throw new Error(
      reason
        ? `Gagal menyimpan ${label} ke database: ${reason}`
        : `Gagal menyimpan ${label} ke database (HTTP ${res.status}).`
    );
  }
  return (await res.json().catch(() => ({}))) as T;
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
