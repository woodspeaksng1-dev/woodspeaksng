import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, setDoc, deleteDoc } from "firebase/firestore";

// Runs against the Firestore emulator (npm run test:rules). Browsers must never read or write Firestore:
// not anonymous visitors, not signed-in customers, not staff. Everything goes through our server.

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-woodspeaks",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "products/scroll"), { name: "Love Scroll", price: 15590 });
    await setDoc(doc(db, "orders/WS-TEST01"), { customerUid: "alice", total: 1559000 });
  });
});

const users = {
  anonymous: () => env.unauthenticatedContext().firestore(),
  customer: () => env.authenticatedContext("alice", { email: "alice@example.com" }).firestore(),
  staff: () => env.authenticatedContext("staff1", { email: "staff@example.com", admin: true }).firestore(),
};

for (const [who, firestore] of Object.entries(users)) {
  describe(`${who} in the browser`, () => {
    it("can't read products", () => assertFails(getDoc(doc(firestore(), "products/scroll"))));
    it("can't list products", () => assertFails(getDocs(collection(firestore(), "products"))));
    it("can't change a price", () => assertFails(setDoc(doc(firestore(), "products/scroll"), { price: 1 })));
    it("can't read an order, even their own", () => assertFails(getDoc(doc(firestore(), "orders/WS-TEST01"))));
    it("can't create an order", () => assertFails(setDoc(doc(firestore(), "orders/WS-FAKE"), { status: "paid" })));
    it("can't mark an order paid", () => assertFails(setDoc(doc(firestore(), "orders/WS-TEST01"), { status: "paid" }, { merge: true })));
    it("can't delete an order", () => assertFails(deleteDoc(doc(firestore(), "orders/WS-TEST01"))));
    it("can't write to a new collection", () => assertFails(setDoc(doc(firestore(), "anything/x"), { a: 1 })));
  });
}
