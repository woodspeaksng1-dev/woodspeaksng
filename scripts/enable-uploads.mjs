// Run once after the Blaze plan is on: publishes storage.rules (deny all browser access) and lets the shop's
// own pages send files to the bucket (CORS), using the service account in .env.local.
// Usage: node scripts/enable-uploads.mjs [extra origin …]
// Then set UPLOADS_ENABLED=1 in Vercel (Production) and redeploy.
import { readFileSync } from "node:fs";
import nextEnv from "@next/env";
import { cert, initializeApp } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";
import { getStorage } from "firebase-admin/storage";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "null");
if (!sa) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
if (!bucketName) throw new Error("No bucket: set FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.");

const origins = ["https://www.woodspeaks.ng", "https://woodspeaks.ng", "https://woodspeaks.vercel.app", ...process.argv.slice(2)];
const app = initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });

const bucket = getStorage(app).bucket(bucketName);
const [exists] = await bucket.exists();
if (!exists) throw new Error(`Bucket ${bucketName} doesn't exist yet. Open Storage in the Firebase console once Blaze is on, then run this again.`);

const released = await getSecurityRules(app).releaseStorageRulesetFromSource(readFileSync("storage.rules", "utf8"), bucketName);
console.log(`Storage rules published (${released.name.split("/").pop()}).`);

await bucket.setCorsConfiguration([
  { origin: origins, method: ["PUT", "GET"], responseHeader: ["Content-Type", "Content-Range", "Range"], maxAgeSeconds: 3600 },
]);
console.log(`Uploads allowed from: ${origins.join(", ")}`);
