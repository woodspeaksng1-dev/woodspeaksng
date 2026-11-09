// Publishes firestore.rules to the live project with the service account in .env.local
// (no `firebase login` needed). Usage: node scripts/deploy-rules.mjs
import { readFileSync } from "node:fs";
import nextEnv from "@next/env";
import { cert, initializeApp } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "null");
if (!sa) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
const app = initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });
const rules = getSecurityRules(app);
const released = await rules.releaseFirestoreRulesetFromSource(readFileSync("firestore.rules", "utf8"));
const live = await rules.getFirestoreRuleset();
console.log(`Published ruleset ${released.name.split("/").pop()} to ${sa.project_id}; live ruleset matches: ${live.name === released.name}`);
