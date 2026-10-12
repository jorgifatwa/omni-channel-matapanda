/**
 * newsletter-store.ts
 *
 * Storage for newsletter subscribers.
 * Saves to prisma.newsletterSubscriber when DB is available,
 * with fallback to data/newsletter.json.
 */

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

const DATA_DIR = path.join(process.cwd(), "data");
const NEWSLETTER_FILE = path.join(DATA_DIR, "newsletter.json");

export interface NewsletterSubscriberEntry {
  id: string;
  email: string;
  createdAt: string;
}

const INITIAL_SUBSCRIBERS_FALLBACK: NewsletterSubscriberEntry[] = [
  {
    id: "sub-init-1",
    email: "sarah.williams@gmail.com",
    createdAt: "2026-10-01T10:25:00.000Z",
  },
  {
    id: "sub-init-2",
    email: "dimas.pratama@yahoo.com",
    createdAt: "2026-10-02T14:12:00.000Z",
  },
  {
    id: "sub-init-3",
    email: "clara.tan@outlook.com",
    createdAt: "2026-10-03T09:45:00.000Z",
  },
  {
    id: "sub-init-4",
    email: "nadia.putri@gmail.com",
    createdAt: "2026-10-04T16:30:00.000Z",
  },
  {
    id: "sub-init-5",
    email: "kevin.alexander@gmail.com",
    createdAt: "2026-10-05T11:20:00.000Z",
  },
];

function ensureFileExists(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(NEWSLETTER_FILE)) {
      fs.writeFileSync(
        NEWSLETTER_FILE,
        JSON.stringify(INITIAL_SUBSCRIBERS_FALLBACK, null, 2),
        "utf-8"
      );
    }
  } catch (err) {
    console.warn("[NewsletterStore] Failed to ensure newsletter file:", err);
  }
}

export function getAllSubscribers(): NewsletterSubscriberEntry[] {
  ensureFileExists();
  try {
    const raw = fs.readFileSync(NEWSLETTER_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : INITIAL_SUBSCRIBERS_FALLBACK;
  } catch {
    return INITIAL_SUBSCRIBERS_FALLBACK;
  }
}

export async function getSubscribersAsync(): Promise<NewsletterSubscriberEntry[]> {
  try {
    const fromDb = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
    });
    if (fromDb && fromDb.length > 0) {
      return fromDb.map((s) => ({
        id: s.id,
        email: s.email,
        createdAt: s.createdAt.toISOString(),
      }));
    }
  } catch {
    // Fall back to JSON file
  }
  return getAllSubscribers();
}

export async function addSubscriber(
  rawEmail: string
): Promise<{ success: boolean; message: string; subscriber?: NewsletterSubscriberEntry; alreadySubscribed?: boolean }> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { success: false, message: "Format email tidak valid." };
  }

  // 1. Try Prisma if available
  let createdId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let createdAtStr = new Date().toISOString();

  try {
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });
    if (existing) {
      return {
        success: true,
        message: "Email Anda sudah terdaftar di newsletter kami!",
        alreadySubscribed: true,
        subscriber: {
          id: existing.id,
          email: existing.email,
          createdAt: existing.createdAt.toISOString(),
        },
      };
    }
    const created = await prisma.newsletterSubscriber.create({
      data: { email },
    });
    createdId = created.id;
    createdAtStr = created.createdAt.toISOString();
  } catch {
    // DB offline, fall through to JSON file
  }

  // 2. Also record in data/newsletter.json
  ensureFileExists();
  const all = getAllSubscribers();
  const found = all.find((s) => s.email === email);
  if (found) {
    return {
      success: true,
      message: "Email Anda sudah terdaftar di newsletter kami!",
      alreadySubscribed: true,
      subscriber: found,
    };
  }

  const newEntry: NewsletterSubscriberEntry = {
    id: createdId,
    email,
    createdAt: createdAtStr,
  };

  all.unshift(newEntry);
  try {
    fs.writeFileSync(NEWSLETTER_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("[NewsletterStore] Failed to write newsletter.json:", err);
  }

  return {
    success: true,
    message: "Terima kasih! Anda telah berhasil berlangganan newsletter it'smatapanda.",
    subscriber: newEntry,
  };
}

export async function deleteSubscriber(
  idOrEmail: string
): Promise<{ success: boolean; message: string }> {
  // 1. Try Prisma
  try {
    await prisma.newsletterSubscriber.deleteMany({
      where: {
        OR: [{ id: idOrEmail }, { email: idOrEmail.toLowerCase() }],
      },
    });
  } catch {
    // ignore DB offline
  }

  // 2. Delete from JSON file
  ensureFileExists();
  const all = getAllSubscribers();
  const filtered = all.filter(
    (s) => s.id !== idOrEmail && s.email.toLowerCase() !== idOrEmail.toLowerCase()
  );

  try {
    fs.writeFileSync(NEWSLETTER_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  } catch (err) {
    console.error("[NewsletterStore] Failed to update newsletter.json after delete:", err);
  }

  return { success: true, message: "Subscriber berhasil dihapus." };
}
