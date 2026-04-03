import type {
  AdminBootstrapResponse,
  AdminCreateJobInput,
  AdminUpdateJobInput,
  ApiErrorPayload,
  ApplicationSubmissionInput,
  JobCard,
  JobDefinition,
  SubmissionResponse,
} from "./types";

function buildHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  const adminKey = window.localStorage.getItem("ente-jobs-admin-key");

  if (adminKey) {
    headers.set("x-admin-key", adminKey);
  }

  return headers;
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    let message = "Something went wrong.";

    try {
      const payload = (await response.json()) as ApiErrorPayload;
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getJobs() {
  return fetchJson<JobCard[]>("/api/jobs");
}

export function getJob(slug: string) {
  return fetchJson<JobDefinition>(`/api/jobs/${slug}`);
}

export function submitApplication(payload: ApplicationSubmissionInput) {
  return fetchJson<SubmissionResponse>("/api/applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function getAdminBootstrap() {
  return fetchJson<AdminBootstrapResponse>("/api/admin/bootstrap", {
    headers: buildHeaders(),
  });
}

export function updateAdminJob(slug: string, payload: AdminUpdateJobInput) {
  return fetchJson<{ ok: true }>(`/api/admin/jobs/${slug}`, {
    method: "PUT",
    headers: buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });
}

export function createAdminJob(payload: AdminCreateJobInput) {
  return fetchJson<{ ok: true; slug: string }>("/api/admin/jobs", {
    method: "POST",
    headers: buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });
}
