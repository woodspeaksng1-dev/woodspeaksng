// Loads the starting catalog (src/lib/catalog.ts) into Firestore: products, delivery zones, shop settings.
// Only creates documents that don't exist yet, so it never overwrites what staff changed in admin.
// Pass --force to overwrite anyway. Uses .env.local; set FIRESTORE_EMULATOR_HOST to seed the emulator.
// Usage: node scripts/seed-catalog.mjs [--force]
import nextEnv from "@next/env";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CRAFTING_DAYS, PRODUCTS, SHIPPING_ZONES } from "../src/lib/catalog.ts";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });
const force = process.argv.includes("--force");

let app;
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
} else {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "null");
  if (!sa) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
  app = initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });
}
const db = getFirestore(app);
db.settings({ preferRest: true, ignoreUndefinedProperties: true });

const docs = [
  ...PRODUCTS.map((p, i) => [`products/${p.id}`, { ...p, hidden: false, sortOrder: i }]),
  ...SHIPPING_ZONES.map((z, i) => [`shippingZones/${z.id}`, { ...z, sortOrder: i }]),
  ["settings/shop", { craftingDays: CRAFTING_DAYS }],
];

let created = 0, skipped = 0;
for (const [path, data] of docs) {
  const ref = db.doc(path);
  if (!force && (await ref.get()).exists) { skipped++; continue; }
  await ref.set({ ...data, updatedAt: FieldValue.serverTimestamp() });
  created++;
}
console.log(`${created} written, ${skipped} already there (${process.env.FIRESTORE_EMULATOR_HOST ? "emulator" : app.options.credential ? "live project" : "?"}).`);
