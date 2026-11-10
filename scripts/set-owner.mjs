// Makes one email the admin owner (the only person who can add or remove staff). Anyone who was owner
// before becomes staff. Uses .env.local; set FIRESTORE_EMULATOR_HOST to use the emulator.
// Usage: node scripts/set-owner.mjs owner@example.com
import nextEnv from "@next/env";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });
const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: node scripts/set-owner.mjs owner@example.com");
  process.exit(1);
}

let app;
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-woodspeaks" });
} else {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "null");
  if (!sa) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
  app = initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });
}
const db = getFirestore(app);
db.settings({ preferRest: !process.env.FIRESTORE_EMULATOR_HOST });

const owners = await db.collection("staff").where("role", "==", "owner").get();
const batch = db.batch();
for (const d of owners.docs) if (d.id !== email) batch.update(d.ref, { role: "staff" });
batch.set(db.doc(`staff/${email}`), { email, role: "owner", name: null, addedBy: "setup", addedAt: new Date().toISOString() }, { merge: true });
batch.set(db.collection("auditLog").doc(), { at: new Date().toISOString(), by: "setup", action: "set owner", target: email });
await batch.commit();
console.log(`${email} is now the owner${owners.size ? ` (was: ${owners.docs.map((d) => d.id).join(", ")})` : ""}.`);
