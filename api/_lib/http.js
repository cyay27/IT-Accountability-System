import { nowIso } from "./config.js";
import { getFirebaseAdminContext, getFirebaseAdminStatus } from "./firebaseAdmin.js";

export const sendJson = (res, status, body) => {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};

export const sendError = (res, status, error, details = {}) =>
  sendJson(res, status, {
    ok: false,
    error,
    timestamp: nowIso(),
    ...details
  });

export const getRequestId = (req) => req.headers["x-request-id"] || globalThis.crypto?.randomUUID?.() || `${Date.now()}`;

export const readJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
};

export const verifyAdminRequest = async (req) => {
  const adminStatus = getFirebaseAdminStatus();
  if (!adminStatus.configured) {
    return { ok: false, error: "firebase-admin-not-configured" };
  }

  const authHeader = String(req.headers.authorization || "").trim();
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return { ok: false, error: "missing-token" };
  }

  const { auth } = getFirebaseAdminContext();
  const decoded = await auth.verifyIdToken(token);
  const configuredAdminUid = process.env.FIREBASE_ADMIN_UID?.trim();

  if (configuredAdminUid && decoded.uid !== configuredAdminUid) {
    return { ok: false, error: "forbidden", uid: decoded.uid };
  }

  return { ok: true, uid: decoded.uid, email: decoded.email || null };
};
