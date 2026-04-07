import { getFirebaseAdminContext, getFirebaseAdminStatus } from "./_lib/firebaseAdmin.js";
import { COLLECTIONS, nowIso, parseLimit, resolveCollectionName } from "./_lib/config.js";
import { getRequestId, sendError, sendJson, verifyAdminRequest } from "./_lib/http.js";

const readCollectionSample = async (db, collectionName, limit = 5) => {
  const snapshot = await db.collection(collectionName).orderBy("updatedAt", "desc").limit(limit).get();
  const records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    collectionName,
    sampleSize: limit,
    returned: records.length,
    latestUpdatedAt: records[0]?.updatedAt ?? null,
    records
  };
};

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  if (req.method !== "GET") {
    return sendError(res, 405, "method-not-allowed", { requestId });
  }

  const authResult = await verifyAdminRequest(req).catch((error) => ({
    ok: false,
    error: error?.message || "unauthorized"
  }));

  if (!authResult.ok) {
    return sendError(res, authResult.error === "forbidden" ? 403 : 401, authResult.error || "unauthorized", {
      requestId
    });
  }

  const adminStatus = getFirebaseAdminStatus();
  if (!adminStatus.configured) {
    return sendError(res, 503, "firebase-admin-not-configured", {
      requestId,
      configured: false
    });
  }

  const collectionQuery = req.query?.collection;

  try {
    const { db, projectId } = getFirebaseAdminContext();

    if (collectionQuery) {
      const collectionName = resolveCollectionName(collectionQuery);
      if (!collectionName) {
        return sendError(res, 400, "unknown-collection", {
          requestId,
          requestedCollection: collectionQuery,
          availableCollections: Object.keys(COLLECTIONS)
        });
      }

      const sample = await readCollectionSample(db, collectionName, parseLimit(req.query?.limit, 5, 20));

      return sendJson(res, 200, {
        ok: true,
        service: "it-accountability-api",
        provider: "vercel",
        mode: "collection-debug",
        timestamp: nowIso(),
        requestId,
        projectId,
        sample
      });
    }

    const summaries = await Promise.all(
      Object.entries(COLLECTIONS).map(async ([alias, firestoreCollectionName]) => {
        const sample = await readCollectionSample(db, firestoreCollectionName, 3);
        return {
          alias,
          collectionName: firestoreCollectionName,
          returned: sample.returned,
          latestUpdatedAt: sample.latestUpdatedAt,
          sampleIds: sample.records.map((item) => item.id)
        };
      })
    );

    return sendJson(res, 200, {
      ok: true,
      service: "it-accountability-api",
      provider: "vercel",
      mode: "summary",
      timestamp: nowIso(),
      requestId,
      projectId,
      collections: summaries,
      endpoints: [
        "GET /api/health",
        "GET /api/debug",
        "GET /api/debug?collection=accountability",
        "GET /api/collections/:collection",
        "POST /api/collections/:collection",
        "PATCH /api/collections/:collection/:id",
        "DELETE /api/collections/:collection/:id"
      ]
    });
  } catch (error) {
    return sendError(res, 500, "failed-to-build-debug-response", {
      requestId,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
