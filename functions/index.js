const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const COLLECTIONS = {
  accountability: "accountability_records",
  "accountability-records": "accountability_records",
  assets: "asset_inventory_records",
  "asset-inventory": "asset_inventory_records",
  borrowing: "borrowing_receipt_records",
  "borrowing-receipts": "borrowing_receipt_records",
  disposal: "disposal_records",
  ipad: "ipad_inventory_records",
  "ipad-inventory": "ipad_inventory_records",
  licenses: "license_maintenance_records",
  "license-maintenance": "license_maintenance_records",
  software: "software_inventory_records",
  "software-inventory": "software_inventory_records",
  "returned-assets": "returned_assets_records",
  "returned-assets-records": "returned_assets_records"
};

const json = (response, status, body) => {
  response.status(status);
  response.set("Content-Type", "application/json");
  response.send(JSON.stringify(body));
};

const nowIso = () => new Date().toISOString();

const parsePath = (requestPath = "") => {
  const cleaned = String(requestPath).split("?")[0].replace(/^\/+|\/+$/g, "");

  if (!cleaned) {
    return "";
  }

  if (cleaned.toLowerCase() === "api") {
    return "";
  }

  if (cleaned.toLowerCase().startsWith("api/")) {
    return cleaned.slice(4);
  }

  return cleaned;
};

const parseLimit = (value, fallback = 25, max = 100) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const resolveCollectionName = (rawName = "") => {
  const normalized = String(rawName).trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!normalized) {
    return null;
  }

  if (COLLECTIONS[normalized]) {
    return COLLECTIONS[normalized];
  }

  if (Object.values(COLLECTIONS).includes(normalized)) {
    return normalized;
  }

  return null;
};

const readCollectionSample = async (collectionName, limit = 5) => {
  const snapshot = await db.collection(collectionName).orderBy("updatedAt", "desc").limit(limit).get();
  const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

  return {
    collectionName,
    sampleSize: limit,
    returned: records.length,
    latestUpdatedAt: records[0]?.updatedAt ?? null,
    records
  };
};

const sendError = (response, status, error, details = {}) =>
  json(response, status, {
    ok: false,
    error,
    timestamp: nowIso(),
    ...details
  });

exports.api = onRequest({ region: "asia-southeast1" }, async (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Request-Id");

  const requestId = request.get("X-Request-Id") || globalThis.crypto?.randomUUID?.() || `${Date.now()}`;
  const path = parsePath(request.path || request.url || "");
  const segments = path.split("/").filter(Boolean);

  response.set("X-Request-Id", requestId);

  if (request.method === "OPTIONS") {
    return response.status(204).send("");
  }

  if (request.method === "GET" && (path === "" || path === "health")) {
    return json(response, 200, {
      ok: true,
      service: "it-accountability-api",
      region: "asia-southeast1",
      timestamp: nowIso(),
      requestId,
      endpoints: [
        "GET /api/health",
        "GET /api/debug",
        "GET /api/collections/:collection",
        "POST /api/collections/:collection",
        "PATCH /api/collections/:collection/:id",
        "DELETE /api/collections/:collection/:id"
      ]
    });
  }

  if (request.method === "GET" && path === "debug") {
    try {
      const queryCollection = request.query?.collection;
      const collectionName = queryCollection ? resolveCollectionName(queryCollection) : null;

      if (queryCollection && !collectionName) {
        return sendError(response, 400, "unknown-collection", {
          requestId,
          requestedCollection: queryCollection,
          availableCollections: Object.keys(COLLECTIONS)
        });
      }

      if (collectionName) {
        const sample = await readCollectionSample(collectionName, parseLimit(request.query?.limit, 5, 20));
        return json(response, 200, {
          ok: true,
          service: "it-accountability-api",
          mode: "collection-debug",
          timestamp: nowIso(),
          requestId,
          projectId: admin.app().options.projectId || process.env.GCLOUD_PROJECT || null,
          sample
        });
      }

      const summaries = await Promise.all(
        Object.entries(COLLECTIONS).map(async ([alias, firestoreCollectionName]) => {
          const sample = await readCollectionSample(firestoreCollectionName, 3);
          return {
            alias,
            collectionName: firestoreCollectionName,
            returned: sample.returned,
            latestUpdatedAt: sample.latestUpdatedAt,
            sampleIds: sample.records.map((item) => item.id)
          };
        })
      );

      return json(response, 200, {
        ok: true,
        service: "it-accountability-api",
        mode: "summary",
        timestamp: nowIso(),
        requestId,
        projectId: admin.app().options.projectId || process.env.GCLOUD_PROJECT || null,
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
      logger.error("Failed to build API debug response", error);
      return sendError(response, 500, "failed-to-build-debug-response", { requestId });
    }
  }

  if (segments[0] === "collections") {
    const collectionName = resolveCollectionName(segments[1]);

    if (!collectionName) {
      return sendError(response, 400, "unknown-collection", {
        requestId,
        requestedCollection: segments[1] || ""
      });
    }

    const collectionRef = db.collection(collectionName);

    if (request.method === "GET" && segments.length === 2) {
      try {
        const limit = parseLimit(request.query?.limit, 25, 100);
        const orderField = String(request.query?.orderBy || "updatedAt");
        const orderDirection = String(request.query?.direction || "desc").toLowerCase() === "asc" ? "asc" : "desc";
        const snapshot = await collectionRef.orderBy(orderField, orderDirection).limit(limit).get();

        return json(response, 200, {
          ok: true,
          requestId,
          timestamp: nowIso(),
          collectionName,
          count: snapshot.size,
          records: snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        });
      } catch (error) {
        logger.error(`Failed to fetch records from ${collectionName}`, error);
        return sendError(response, 500, "failed-to-fetch-records", { requestId, collectionName });
      }
    }

    if (request.method === "POST" && segments.length === 2) {
      try {
        const payload = request.body && typeof request.body === "object" ? request.body : {};
        const timestamp = nowIso();
        const createdRecord = {
          ...payload,
          createdAt: payload.createdAt || timestamp,
          updatedAt: timestamp,
          createdVia: "api"
        };
        const docRef = await collectionRef.add(createdRecord);

        return json(response, 201, {
          ok: true,
          requestId,
          timestamp,
          id: docRef.id
        });
      } catch (error) {
        logger.error(`Failed to create record in ${collectionName}`, error);
        return sendError(response, 500, "failed-to-create-record", { requestId, collectionName });
      }
    }

    if (segments.length === 3) {
      const docId = segments[2];

      if (request.method === "PATCH") {
        try {
          const payload = request.body && typeof request.body === "object" ? request.body : {};
          await collectionRef.doc(docId).set(
            {
              ...payload,
              updatedAt: nowIso(),
              updatedVia: "api"
            },
            { merge: true }
          );

          return json(response, 200, {
            ok: true,
            requestId,
            timestamp: nowIso(),
            id: docId
          });
        } catch (error) {
          logger.error(`Failed to update record ${docId} in ${collectionName}`, error);
          return sendError(response, 500, "failed-to-update-record", { requestId, collectionName, id: docId });
        }
      }

      if (request.method === "DELETE") {
        try {
          await collectionRef.doc(docId).delete();

          return json(response, 200, {
            ok: true,
            requestId,
            timestamp: nowIso(),
            id: docId
          });
        } catch (error) {
          logger.error(`Failed to delete record ${docId} from ${collectionName}`, error);
          return sendError(response, 500, "failed-to-delete-record", { requestId, collectionName, id: docId });
        }
      }
    }
  }

  return sendError(response, 404, "not-found", {
    requestId,
    path,
    method: request.method
  });
});
