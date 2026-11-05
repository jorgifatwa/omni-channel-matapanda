/**
 * newsletter-store.ts
 *
 * Storage for newsletter subscribers, backed purely by PostgreSQL
 * (prisma.newsletterSubscriber). No JSON file and no sample subscribers:
 * database errors are thrown so API routes can respond with an error status.
 */

import { prisma } from "@/lib/prisma";

export interface NewsletterSubscriberEntry {
  id: string;
  email: string;
  createdAt: string;
}

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/** All subscribers, newest first. Throws on database error. */
export async function getSubscribersAsync(): Promise<NewsletterSubscriberEntry[]> {
  const rows = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map((s) => ({
    id: s.id,
    email: s.email,
    createdAt: s.createdAt.toISOString(),
  }));
}

/**
 * Subscribe an email. Returns success: false only for invalid input.
 * Throws on database error.
 */
export async function addSubscriber(
  rawEmail: string
): Promise<{ success: boolean; message: string; subscriber?: NewsletterSubscriberEntry; alreadySubscribed?: boolean }> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { success: false, message: "Format email tidak valid." };
  }

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

  return {
    success: true,
    message: "Terima kasih! Anda telah berhasil berlangganan newsletter it'smatapanda.",
    subscriber: {
      id: created.id,
      email: created.email,
      createdAt: created.createdAt.toISOString(),
    },
  };
}

/** Delete a subscriber by id or email. Throws on database error. */
export async function deleteSubscriber(
  idOrEmail: string
): Promise<{ success: boolean; message: string }> {
  const email = idOrEmail.trim().toLowerCase();
  const result = await prisma.newsletterSubscriber.deleteMany({
    where: isUuid(idOrEmail)
      ? { OR: [{ id: idOrEmail }, { email }] }
      : { email },
  });

  if (result.count === 0) {
    return { success: false, message: "Subscriber tidak ditemukan." };
  }
  return { success: true, message: "Subscriber berhasil dihapus." };
}
