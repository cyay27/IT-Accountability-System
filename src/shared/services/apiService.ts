export type ApiStatusTone = "ok" | "warning";

import { auth } from "../firebase/firebase";

export const isApiConfigured = Boolean(import.meta.env.VITE_API_BASE_URL?.trim());

export interface ApiHealthResponse {
  ok: boolean;
  service: string;
  provider?: string;
  region?: string;
  timestamp: string;
  requestId?: string;
  endpoints?: string[];
  firebaseAdminConfigured?: boolean;
  projectId?: string | null;
  error?: string;
  message?: string;
}

export interface ApiDebugCollectionSummary {
  alias: string;
  collectionName: string;
  returned: number;
  latestUpdatedAt: string | null;
  sampleIds: string[];
}

export interface ApiDebugResponse {
  ok: boolean;
  service: string;
  mode: string;
  timestamp: string;
  requestId?: string;
  projectId?: string | null;
  endpoints?: string[];
  collections?: ApiDebugCollectionSummary[];
  sample?: {
    collectionName: string;
    sampleSize: number;
    returned: number;
    latestUpdatedAt: string | null;
    records: Array<Record<string, unknown> & { id: string }>;
  };
  error?: string;
}

export interface ApiCollectionRecordsResponse<T> {
  ok: boolean;
  requestId?: string;
  timestamp: string;
  collectionName: string;
  count: number;
  records: Array<T & { id: string }>;
  error?: string;
}

export interface ApiMutationResponse {
  ok: boolean;
  requestId?: string;
  timestamp: string;
  id?: string;
  error?: string;
}

const getBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }

  return "/api";
};

const buildUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBaseUrl()}${normalizedPath}`;
};

const readJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) {
    throw new Error("Empty response from API.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON returned by API.");
  }
};

const getAuthToken = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return "";
  }

  try {
    return await currentUser.getIdToken();
  } catch {
    return "";
  }
};

const requestJson = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const token = await getAuthToken();
    const response = await fetch(buildUrl(path), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {})
      },
      signal: controller.signal
    });

    const body = await readJson<Record<string, unknown>>(response);

    if (!response.ok || body.ok === false) {
      const message =
        typeof body.error === "string"
          ? body.error
          : typeof body.message === "string"
            ? body.message
            : `Request failed with status ${response.status}.`;
      throw new Error(message);
    }

    return body as T;
  } finally {
    window.clearTimeout(timeout);
  }
};

export const getApiBaseUrl = getBaseUrl;

export const getApiHealth = () => requestJson<ApiHealthResponse>("/health");

export const getApiDebug = (collection?: string, limit?: number) => {
  const query = new URLSearchParams();
  if (collection) {
    query.set("collection", collection);
  }
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson<ApiDebugResponse>(`/debug${suffix}`);
};

export const getApiCollectionRecords = <T>(collectionName: string, options: { limit?: number; orderBy?: string; direction?: "asc" | "desc" } = {}) => {
  const query = new URLSearchParams();

  if (typeof options.limit === "number") {
    query.set("limit", String(options.limit));
  }

  if (options.orderBy) {
    query.set("orderBy", options.orderBy);
  }

  if (options.direction) {
    query.set("direction", options.direction);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson<ApiCollectionRecordsResponse<T>>(`/collections/${collectionName}${suffix}`);
};

export const createApiCollectionRecord = <T>(collectionName: string, payload: T) =>
  requestJson<ApiMutationResponse>(`/collections/${collectionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

export const updateApiCollectionRecord = <T>(collectionName: string, id: string, payload: T) =>
  requestJson<ApiMutationResponse>(`/collections/${collectionName}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

export const deleteApiCollectionRecord = (collectionName: string, id: string) =>
  requestJson<ApiMutationResponse>(`/collections/${collectionName}/${id}`, {
    method: "DELETE"
  });
