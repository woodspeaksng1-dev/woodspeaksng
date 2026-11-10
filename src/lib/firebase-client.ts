"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence, type Auth } from "firebase/auth";

/*
 * Firebase in the browser, for signing in only (staff now, customers later). It proves who someone is
 * and hands our server an ID token; the server then sets its own session cookie. Nothing is kept in the
 * browser (in-memory persistence), and the browser never reads or writes Firestore.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let auth: Promise<Auth> | null = null;

export function firebaseAuth(): Promise<Auth> {
  auth ??= (async () => {
    const app = getApps().length ? getApp() : initializeApp(config);
    const a = getAuth(app);
    await setPersistence(a, inMemoryPersistence);
    return a;
  })();
  return auth;
}
