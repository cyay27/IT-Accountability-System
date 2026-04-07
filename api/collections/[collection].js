import { getFirebaseAdminContext, getFirebaseAdminStatus } from "../_lib/firebaseAdmin.js";
import { nowIso, parseLimit, resolveCollectionName } from "../_lib/config.js";
import { getRequestId, readJsonBody, sendError, sendJson, verifyAdminRequest } from "../_lib/http.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);
  const collectionParam = req.query?.collection || req.query?.["collection"] || req.query?.path?.[0];
  const collectionName = resolveCollectionName(collectionParam);

  if (!collectionName) {
    return sendError(res, 400, "unknown-collection", {
      requestId,
      requestedCollection: collectionParam || ""
    });
  }

  const adminStatus = getFirebaseAdminStatus();
  if (!adminStatus.configured) {
    return sendError(res, 503, "firebase-admin-not-configured", { requestId });
  }

  const isRead = req.method === "GET";
  const authResult = isRead ? null : await verifyAdminRequest(req).catch((error) => ({ ok: false, error: error?.message || "unauthorized" }));

  if (!isRead && !authResult?.ok) {
    return sendError(res, authResult?.error === "forbidden" ? 403 : 401, authResult?.error || "unauthorized", {
      requestId
    });
  }

  try {
    const { db } = getFirebaseAdminContext();
    const collectionRef = db.collection(collectionName);

    if (req.method === "GET") {
      const limit = parseLimit(req.query?.limit, 25, 100);
      const orderField = String(req.query?.orderBy || "updatedAt");
      const orderDirection = String(req.query?.direction || "desc").toLowerCase() === "asc" ? "asc" : "desc";
      const snapshot = await collectionRef.orderBy(orderField, orderDirection).limit(limit).get();

      return sendJson(res, 200, {
        ok: true,
        requestId,
        timestamp: nowIso(),
        collectionName,
        count: snapshot.size,
        records: snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      });
    }

    if (req.method === "POST") {
      const payload = await readJsonBody(req);
      const timestamp = nowIso();
      const createdRecord = {
        ...payload,
        createdAt: payload.createdAt || timestamp,
        updatedAt: timestamp,
        createdVia: "vercel-api"
      };
      const docRef = await collectionRef.add(createdRecord);

      return sendJson(res, 201, {
        ok: true,
        requestId,
        timestamp,
        id: docRef.id
      });
    }

    return sendError(res, 405, "method-not-allowed", { requestId });
  } catch (error) {
    return sendError(res, 500, "failed-to-process-request", {
      requestId,
      collectionName,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
