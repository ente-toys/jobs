import type {
  AdminBootstrapResponse,
  AdminCreateJobInput,
  AdminJobRecord,
  AdminSubmissionRecord,
  AdminUpdateJobInput,
  ApplicationSubmissionInput,
  JobCard,
  JobDefinition,
  JobQuestion,
  SubmissionResponse,
} from "../src/lib/types";
import { hasRichTextContent, stripRichText } from "../src/lib/plainText";

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_API_KEY?: string;
}

interface DatabaseJobRow {
  slug: string;
  team: string;
  title: string;
  card_description: string;
  intro_eyebrow: string;
  intro_title: string;
  intro_description: string;
  questions_json: string;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface DatabaseSubmissionRow {
  id: string;
  job_slug: string;
  title: string;
  answers_json: string;
  created_at: string;
}

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/jobs") {
        return await handleGetJobs(env);
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
        const slug = decodeURIComponent(url.pathname.replace("/api/jobs/", ""));
        return await handleGetJob(env, slug);
      }

      if (request.method === "POST" && url.pathname === "/api/applications") {
        return await handleCreateApplication(request, env);
      }

      if (request.method === "GET" && url.pathname === "/api/admin/bootstrap") {
        assertAdmin(request, env);
        return await handleAdminBootstrap(env);
      }

      if (request.method === "POST" && url.pathname === "/api/admin/jobs") {
        assertAdmin(request, env);
        return await handleAdminCreateJob(request, env);
      }

      if (request.method === "PUT" && url.pathname.startsWith("/api/admin/jobs/")) {
        assertAdmin(request, env);
        const slug = decodeURIComponent(url.pathname.replace("/api/admin/jobs/", ""));
        return await handleAdminUpdateJob(request, env, slug);
      }

      if (!url.pathname.startsWith("/api/")) {
        return env.ASSETS.fetch(request);
      }

      return Response.json({ error: "Not found." }, { status: 404, headers: jsonHeaders });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }

      const message = error instanceof Error ? error.message : "Unexpected server error.";
      const friendlyMessage = message.includes("no such table")
        ? "D1 is connected, but the schema is not initialized yet. Run the migrations first."
        : message;

      return Response.json(
        { error: friendlyMessage },
        {
          status: 500,
          headers: jsonHeaders,
        },
      );
    }
  },
} satisfies ExportedHandler<Env>;

async function handleGetJobs(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT slug, team, title, card_description
     FROM jobs
     WHERE is_active = 1
     ORDER BY sort_order ASC, created_at ASC`,
  ).all<Pick<DatabaseJobRow, "slug" | "team" | "title" | "card_description">>();

  const jobs: JobCard[] = (results ?? []).map((job) => ({
    slug: job.slug,
    team: job.team,
    title: job.title,
    cardDescription: job.card_description,
  }));

  return Response.json(jobs, { headers: jsonHeaders });
}

async function handleGetJob(env: Env, slug: string) {
  if (!slug) {
    return Response.json({ error: "Missing job slug." }, { status: 400, headers: jsonHeaders });
  }

  const row = await env.DB.prepare(
    `SELECT slug, team, title, card_description, intro_eyebrow, intro_title,
            intro_description, questions_json, is_active, sort_order, created_at, updated_at
     FROM jobs
     WHERE slug = ?1
     LIMIT 1`,
  )
    .bind(slug)
    .first<DatabaseJobRow>();

  if (!row) {
    return Response.json({ error: "Role not found." }, { status: 404, headers: jsonHeaders });
  }

  return Response.json(hydrateJob(row), { headers: jsonHeaders });
}

async function handleCreateApplication(request: Request, env: Env) {
  const payload = await safeJson(request);

  if (!payload) {
    return Response.json(
      { error: "Expected a JSON payload." },
      { status: 400, headers: jsonHeaders },
    );
  }

  const parsedPayload = payload as Partial<ApplicationSubmissionInput>;

  if (!parsedPayload.jobSlug || typeof parsedPayload.jobSlug !== "string") {
    return Response.json(
      { error: "A valid job slug is required." },
      { status: 400, headers: jsonHeaders },
    );
  }

  if (!parsedPayload.answers || typeof parsedPayload.answers !== "object") {
    return Response.json(
      { error: "Application answers are required." },
      { status: 400, headers: jsonHeaders },
    );
  }

  const row = await env.DB.prepare(
    `SELECT slug, team, title, card_description, intro_eyebrow, intro_title,
            intro_description, questions_json, is_active, sort_order, created_at, updated_at
     FROM jobs
     WHERE slug = ?1 AND is_active = 1
     LIMIT 1`,
  )
    .bind(parsedPayload.jobSlug)
    .first<DatabaseJobRow>();

  if (!row) {
    return Response.json(
      { error: "This role is no longer accepting applications." },
      { status: 404, headers: jsonHeaders },
    );
  }

  const job = hydrateJob(row);
  const normalizedAnswers = validateAnswers(job.questions, parsedPayload.answers);
  const submissionId = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO applications (id, job_slug, answers_json)
     VALUES (?1, ?2, ?3)`,
  )
    .bind(submissionId, job.slug, JSON.stringify(normalizedAnswers))
    .run();

  const response: SubmissionResponse = {
    ok: true,
    submissionId,
  };

  return Response.json(response, {
    status: 201,
    headers: jsonHeaders,
  });
}

async function handleAdminBootstrap(env: Env) {
  const jobsResult = await env.DB.prepare(
    `SELECT slug, team, title, card_description, intro_eyebrow, intro_title,
            intro_description, questions_json, is_active, sort_order, created_at, updated_at
     FROM jobs
     ORDER BY sort_order ASC, created_at ASC`,
  ).all<DatabaseJobRow>();

  const submissionsResult = await env.DB.prepare(
    `SELECT applications.id, applications.job_slug, jobs.title, applications.answers_json,
            applications.created_at
     FROM applications
     INNER JOIN jobs ON jobs.slug = applications.job_slug
     ORDER BY applications.created_at DESC`,
  ).all<DatabaseSubmissionRow>();

  const payload: AdminBootstrapResponse = {
    jobs: (jobsResult.results ?? []).map((row) => hydrateAdminJob(row)),
    submissions: (submissionsResult.results ?? []).map((row) => ({
      id: row.id,
      jobSlug: row.job_slug,
      jobTitle: row.title,
      answers: JSON.parse(row.answers_json) as Record<string, string>,
      createdAt: row.created_at,
    })),
  };

  return Response.json(payload, { headers: jsonHeaders });
}

async function handleAdminUpdateJob(request: Request, env: Env, slug: string) {
  if (!slug) {
    return Response.json({ error: "Missing job slug." }, { status: 400, headers: jsonHeaders });
  }

  const payload = await safeJson(request);
  if (!payload) {
    return Response.json(
      { error: "Expected a JSON payload." },
      { status: 400, headers: jsonHeaders },
    );
  }

  const body = payload as Partial<AdminUpdateJobInput>;
  validateAdminJobInput(body);

  await env.DB.prepare(
    `UPDATE jobs
     SET team = ?2,
         title = ?3,
         card_description = ?4,
         intro_eyebrow = ?5,
         intro_title = ?6,
         intro_description = ?7,
         questions_json = ?8,
         is_active = ?9,
         sort_order = ?10,
         updated_at = CURRENT_TIMESTAMP
     WHERE slug = ?1`,
  )
    .bind(
      slug,
      body.team,
      body.title,
      body.cardDescription,
      body.introEyebrow,
      body.introTitle,
      body.introDescription,
      JSON.stringify(body.questions),
      body.isActive ? 1 : 0,
      body.sortOrder,
    )
    .run();

  return Response.json({ ok: true }, { headers: jsonHeaders });
}

async function handleAdminCreateJob(request: Request, env: Env) {
  const payload = await safeJson(request);
  if (!payload) {
    return Response.json(
      { error: "Expected a JSON payload." },
      { status: 400, headers: jsonHeaders },
    );
  }

  const body = payload as Partial<AdminCreateJobInput>;
  validateAdminCreateJobInput(body);

  const existing = await env.DB.prepare(`SELECT slug FROM jobs WHERE slug = ?1 LIMIT 1`)
    .bind(body.slug)
    .first<{ slug: string }>();

  if (existing) {
    return Response.json(
      { error: "A posting with this slug already exists." },
      { status: 409, headers: jsonHeaders },
    );
  }

  await env.DB.prepare(
    `INSERT INTO jobs (
      slug,
      team,
      title,
      card_description,
      intro_eyebrow,
      intro_title,
      intro_description,
      questions_json,
      is_active,
      sort_order
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
  )
    .bind(
      body.slug,
      body.team,
      body.title,
      body.cardDescription,
      body.introEyebrow,
      body.introTitle,
      body.introDescription,
      JSON.stringify(body.questions),
      body.isActive ? 1 : 0,
      body.sortOrder,
    )
    .run();

  return Response.json({ ok: true, slug: body.slug }, { status: 201, headers: jsonHeaders });
}

function hydrateJob(row: DatabaseJobRow): JobDefinition {
  const questions = JSON.parse(row.questions_json) as JobQuestion[];

  return {
    slug: row.slug,
    team: row.team,
    title: row.title,
    cardDescription: row.card_description,
    introEyebrow: row.intro_eyebrow,
    introTitle: row.intro_title,
    introDescription: row.intro_description,
    questions,
  };
}

function hydrateAdminJob(row: DatabaseJobRow): AdminJobRecord {
  return {
    ...hydrateJob(row),
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateAnswers(
  questions: JobQuestion[],
  answers: Record<string, string>,
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const question of questions) {
    const rawValue = answers[question.id];
    const value = typeof rawValue === "string" ? rawValue.trim() : "";

    if (question.required && !value) {
      const questionTitle = stripRichText(question.prompt).split("\n")[0]?.trim() || question.id;
      throw new Error(`Please answer "${questionTitle}" before submitting.`);
    }

    normalized[question.id] = value;
  }

  return normalized;
}

function validateAdminJobInput(
  payload: Partial<AdminUpdateJobInput>,
): asserts payload is AdminUpdateJobInput {
  if (!payload.team?.trim() || !payload.title?.trim() || !hasRichTextContent(payload.cardDescription ?? "")) {
    throw new Error("Team, title, and card description are required.");
  }

  if (
    !payload.introEyebrow?.trim() ||
    !hasRichTextContent(payload.introTitle ?? "") ||
    !hasRichTextContent(payload.introDescription ?? "")
  ) {
    throw new Error("Intro copy is required.");
  }

  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    throw new Error("At least one question is required.");
  }

  for (const question of payload.questions) {
    if (
      !question.id?.trim() ||
      !hasRichTextContent(question.prompt ?? "") ||
      !hasRichTextContent(question.helper ?? "") ||
      !question.placeholder?.trim()
    ) {
      throw new Error("Every question must include complete copy.");
    }
  }

  if (typeof payload.isActive !== "boolean") {
    throw new Error("isActive must be a boolean.");
  }

  if (typeof payload.sortOrder !== "number") {
    throw new Error("sortOrder must be a number.");
  }
}

function validateAdminCreateJobInput(
  payload: Partial<AdminCreateJobInput>,
): asserts payload is AdminCreateJobInput {
  if (!payload.slug) {
    throw new Error("Slug is required.");
  }

  const normalizedSlug = payload.slug.trim();

  if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
    throw new Error("Slug can only contain lowercase letters, numbers, and hyphens.");
  }

  validateAdminJobInput(payload);
}

function assertAdmin(request: Request, env: Env) {
  const configuredKey = env.ADMIN_API_KEY;

  if (!configuredKey) {
    throw new Error("ADMIN_API_KEY is not configured for this Worker.");
  }

  const providedKey = request.headers.get("x-admin-key");

  if (!providedKey || providedKey !== configuredKey) {
    throw new Response(JSON.stringify({ error: "Unauthorized admin request." }), {
      status: 401,
      headers: jsonHeaders,
    });
  }
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
