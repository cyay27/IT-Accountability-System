import { getFirebaseAdminStatus } from "./_lib/firebaseAdmin.js";
import { nowIso } from "./_lib/config.js";
import { sendJson } from "./_lib/http.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, {
      ok: false,
      error: "method-not-allowed",
      timestamp: nowIso()
    });
  }

  const adminStatus = getFirebaseAdminStatus();

  return sendJson(res, 200, {
    ok: true,
    service: "it-accountability-api",
    provider: "vercel",
    timestamp: nowIso(),
    firebaseAdminConfigured: adminStatus.configured,
    projectId: adminStatus.projectId,
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



