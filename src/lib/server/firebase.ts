import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/*
 * Firebase Admin, server only. It reads and writes Firestore on behalf of our API routes and server
 * actions (Firestore rules don't apply to it, so every caller checks its input and who is asking).
 * Credentials come from FIREBASE_SERVICE_ACCOUNT_JSON (.env.local, Vercel). With FIRESTORE_EMULATOR_HOST
 * set (tests, local emulator) it talks to the emulator and needs no credentials.
 */

function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId });
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
  const sa = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
  return initializeApp({
    credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }),
    projectId: sa.project_id,
  });
}

let firestore: Firestore | null = null;

/** Firestore, over REST: faster cold starts on serverless than the default gRPC connection. */
export function db(): Firestore {
  if (!firestore) {
    firestore = getFirestore(app());
    firestore.settings({ preferRest: true, ignoreUndefinedProperties: true });
  }
  return firestore;
}

export const adminAuth = () => getAuth(app());
