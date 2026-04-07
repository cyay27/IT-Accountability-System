import { getFirebaseAdminContext, getFirebaseAdminStatus } from "../../_lib/firebaseAdmin.js";
import { nowIso, resolveCollectionName } from "../../_lib/config.js";
import { getRequestId, readJsonBody, sendError, sendJson, verifyAdminRequest } from "../../_lib/http.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);
  const collectionParam = req.query?.collection || req.query?.["collection"] || req.query?.path?.[0];
  const docId = req.query?.id || req.query?.["id"] || req.query?.path?.[1];
  const collectionName = resolveCollectionName(collectionParam);

  if (!collectionName || !docId) {
    return sendError(res, 400, "invalid-collection-or-id", {
      requestId,
      requestedCollection: collectionParam || "",
      id: docId || ""
    });
  }

  const adminStatus = getFirebaseAdminStatus();
  if (!adminStatus.configured) {
    return sendError(res, 503, "firebase-admin-not-configured", { requestId });
  }

  const authResult = await verifyAdminRequest(req).catch((error) => ({ ok: false, error: error?.message || "unauthorized" }));
  if (!authResult.ok) {
    return sendError(res, authResult.error === "forbidden" ? 403 : 401, authResult.error || "unauthorized", {
      requestId
    });
  }

  try {
    const { db } = getFirebaseAdminContext();
    const documentRef = db.collection(collectionName).doc(docId);

    if (req.method === "PATCH") {
      const payload = await readJsonBody(req);

      await documentRef.set(
        {
          ...payload,
          updatedAt: nowIso(),
          updatedVia: "vercel-api"
        },
        { merge: true }
      );

      return sendJson(res, 200, {
        ok: true,
        requestId,
        timestamp: nowIso(),
        id: docId
      });
    }

    if (req.method === "DELETE") {
      await documentRef.delete();

      return sendJson(res, 200, {
        ok: true,
        requestId,
        timestamp: nowIso(),
        id: docId
      });
    }

    return sendError(res, 405, "method-not-allowed", { requestId });
  } catch (error) {
    return sendError(res, 500, "failed-to-process-request", {
      requestId,
      collectionName,
      id: docId,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
