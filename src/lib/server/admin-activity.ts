import "server-only";
import { db } from "./firebase";

export interface AuditEntry {
  at: string;
  by: string;
  action: string;
  target: string;
}

/** The most recent changes (payments, order moves, product and delivery edits, team changes). */
export async function recentActivity(limit = 150): Promise<AuditEntry[]> {
  const snap = await db().collection("auditLog").orderBy("at", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as AuditEntry);
}

export async function logActivity(by: string, action: string, target: string) {
  await db().collection("auditLog").add({ at: new Date().toISOString(), by, action, target });
}
