const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const json = (response, status, body) => {
  response.status(status);
  response.set("Content-Type", "application/json");
  response.send(JSON.stringify(body));
};

const parsePath = (requestPath = "") => requestPath.replace(/^\/+/, "");

exports.api = onRequest({ region: "asia-southeast1" }, async (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (request.method === "OPTIONS") {
    return response.status(204).send("");
  }

  const path = parsePath(request.path || request.url || "");

  if (request.method === "GET" && (path === "" || path === "health")) {
    return json(response, 200, {
      ok: true,
      service: "it-accountability-api",
      timestamp: new Date().toISOString()
    });
  }

  if (request.method === "GET" && path === "accountability") {
    try {
      const snapshot = await db.collection("it-accountability-records").orderBy("updatedAt", "desc").limit(100).get();
      const records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return json(response, 200, { ok: true, count: records.length, records });
    } catch (error) {
      logger.error("Failed to fetch accountability records", error);
      return json(response, 500, {
        ok: false,
        error: "failed-to-fetch-accountability-records"
      });
    }
  }

  if (request.method === "POST" && path === "accountability") {
    try {
      const payload = request.body && typeof request.body === "object" ? request.body : {};
      const now = new Date().toISOString();
      const docRef = await db.collection("it-accountability-records").add({
        ...payload,
        createdAt: payload.createdAt || now,
        updatedAt: now,
        createdVia: "api"
      });
      return json(response, 201, { ok: true, id: docRef.id });
    } catch (error) {
      logger.error("Failed to create accountability record", error);
      return json(response, 500, {
        ok: false,
        error: "failed-to-create-accountability-record"
      });
    }
  }

  return json(response, 404, {
    ok: false,
    error: "not-found",
    path,
    method: request.method
  });
});
