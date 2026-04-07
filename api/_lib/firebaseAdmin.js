import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let cachedContext = null;

const readServiceAccount = () => {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (rawServiceAccount) {
    try {
      return JSON.parse(rawServiceAccount);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey
    };
  }

  return null;
};

export const getFirebaseAdminStatus = () => {
  const serviceAccount = readServiceAccount();
  return {
    configured: Boolean(serviceAccount),
    projectId: serviceAccount?.projectId || process.env.FIREBASE_PROJECT_ID || null
  };
};

export const getFirebaseAdminContext = () => {
  if (cachedContext) {
    return cachedContext;
  }

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId || process.env.FIREBASE_PROJECT_ID
      });

  cachedContext = {
    app,
    db: getFirestore(app),
    auth: getAuth(app),
    projectId: app.options.projectId || serviceAccount.projectId || process.env.FIREBASE_PROJECT_ID || null
  };

  return cachedContext;
};
