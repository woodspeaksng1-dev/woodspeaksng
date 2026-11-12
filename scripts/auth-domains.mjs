// Lists the domains Firebase Auth accepts sign-in from (Google sign-in and emailed links), and adds any
// given. A domain the site answers on must be listed or staff and customers can't sign in there.
// Uses the service account in .env.local.
// Usage: node scripts/auth-domains.mjs [domain ...]
import nextEnv from "@next/env";
import { cert } from "firebase-admin/app";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "null");
if (!sa) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
const add = process.argv.slice(2).map((d) => d.trim().toLowerCase());
for (const d of add) if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) throw new Error(`Not a domain: ${d}`);

const { access_token: token } = await cert(sa).getAccessToken();
const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${sa.project_id}/config`;
const call = async (method, body) => {
  const res = await fetch(method === "PATCH" ? `${url}?updateMask=authorizedDomains` : url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`Firebase answered ${res.status}: ${(await res.json().catch(() => ({})))?.error?.message ?? ""}`);
    process.exit(1);
  }
  return res.json();
};

const current = (await call("GET")).authorizedDomains ?? [];
const missing = add.filter((d) => !current.includes(d));
const list = missing.length ? (await call("PATCH", { authorizedDomains: [...current, ...missing] })).authorizedDomains : current;
if (missing.length) console.log(`Added: ${missing.join(", ")}`);
console.log(`Authorized domains: ${list.join(", ")}`);
