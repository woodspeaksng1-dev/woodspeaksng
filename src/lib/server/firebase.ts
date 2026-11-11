import "server-only";
import { generateKeyPairSync } from "node:crypto";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, initializeFirestore, type Firestore } from "firebase-admin/firestore";

/*
 * Firebase Admin, server only. It reads and writes Firestore on behalf of our API routes and server
 * actions (Firestore rules don't apply to it, so every caller checks its input and who is asking).
 * Credentials come from FIREBASE_SERVICE_ACCOUNT_JSON (.env.local, Vercel). With FIRESTORE_EMULATOR_HOST
 * set (tests, local emulator) it talks to the emulator and needs no credentials.
 *
 * Next bundles server code into several chunks that share one firebase-admin, so the app and Firestore
 * are set up once, when the app is first created; later callers just get them.
 */

function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  let created: App;
  if (emulator) {
    // The emulator's project comes from GCLOUD_PROJECT (set by `firebase emulators:*`), not NEXT_PUBLIC_…,
    // which the build bakes in as the live project.
    // A throwaway certificate: the emulator ignores it, but without one Google's library goes looking for
    // cloud metadata over the network, which Next flags as uncached work during prerendering. With it,
    // local runs behave like production, where the real service account key is used.
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const projectId = process.env.GCLOUD_PROJECT || "demo-woodspeaks";
    created = initializeApp({ projectId, credential: cert({ projectId, clientEmail: `emulator@${projectId}.iam.gserviceaccount.com`, privateKey }) });
  } else {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
    const sa = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
    created = initializeApp({
      credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }),
      projectId: sa.project_id,
    });
  }
  // Live, Firestore goes over REST (faster cold starts on serverless than gRPC); the emulator needs gRPC.
  initializeFirestore(created, { preferRest: !emulator });
  return created;
}

export const db = (): Firestore => getFirestore(app());

/** Admin Auth, loaded only when used (sign-in, staff claims): it pulls in a large token library. */
export const adminAuth = async () => (await import("firebase-admin/auth")).getAuth(app());

/**
 * The private bucket for customer files (needs the Blaze plan). FIREBASE_STORAGE_BUCKET if set, else the
 * web config's bucket. Loaded only when used: it pulls in Google's storage library.
 */
export const storageBucket = async () => {
  const { getStorage } = await import("firebase-admin/storage");
  const name =
    process.env.FIREBASE_STORAGE_BUCKET ||
    (process.env.FIREBASE_STORAGE_EMULATOR_HOST ? `${app().options.projectId}.appspot.com` : process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  if (!name) throw new Error("No storage bucket is set (FIREBASE_STORAGE_BUCKET).");
  return getStorage(app()).bucket(name);
};
