import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";

import { createAdminJob, getAdminBootstrap, updateAdminJob } from "../lib/api";
import type {
  AdminBootstrapResponse,
  AdminCreateJobInput,
  AdminJobRecord,
  AdminSubmissionRecord,
  JobQuestion,
} from "../lib/types";
import { JobEditorPanel } from "./admin/JobEditorPanel";
import { SubmissionsPanel } from "./admin/SubmissionsPanel";
import {
  type AdminDraft,
  createBlankDraft,
  createDraftQuestion,
  hydrateDraft,
  serializeDraftQuestions,
} from "./admin/shared";

type AdminViewState = "locked" | "loading" | "ready" | "error";

export function AdminPage() {
  const [viewState, setViewState] = useState<AdminViewState>("locked");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminBootstrapResponse | null>(null);
  const [selectedJobSlug, setSelectedJobSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminDraft | null>(null);
  const [draftSlug, setDraftSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [isReorderingJobs, setIsReorderingJobs] = useState(false);

  useEffect(() => {
    const existing = window.localStorage.getItem("ente-jobs-admin-key");
    if (existing) {
      void loadAdminData();
    }
  }, []);

  const selectedJob = useMemo(
    () => data?.jobs.find((job) => job.slug === selectedJobSlug) ?? null,
    [data, selectedJobSlug],
  );

  const filteredSubmissions = useMemo<AdminSubmissionRecord[]>(() => {
    if (!data) {
      return [];
    }

    if (!selectedJobSlug) {
      return data.submissions;
    }

    return data.submissions.filter((submission) => submission.jobSlug === selectedJobSlug);
  }, [data, selectedJobSlug]);

  const replaceDraft = (nextDraft: AdminDraft) => {
    setDraft(nextDraft);
  };

  const updateDraft = (
    updater: (current: AdminDraft) => AdminDraft,
  ) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const resetQuestionDrag = () => {
    setDraggedQuestionId(null);
    setDragTargetIndex(null);
  };

  async function loadAdminData(preferredSlug?: string | null) {
    setViewState("loading");
    setError(null);

    try {
      const bootstrap = await getAdminBootstrap();
      setData(bootstrap);
      const nextSlug = preferredSlug ?? selectedJobSlug ?? bootstrap.jobs[0]?.slug ?? null;
      setSelectedJobSlug(nextSlug);

      const currentJob =
        bootstrap.jobs.find((job) => job.slug === nextSlug) ?? bootstrap.jobs[0] ?? null;
      setDraft(currentJob ? hydrateDraft(currentJob) : null);
      setDraftSlug(currentJob?.slug ?? "");
      setIsCreating(false);
      setIsSubmissionsOpen(false);
      resetQuestionDrag();
      setViewState("ready");
    } catch (loadError) {
      setViewState("error");
      setError(
        loadError instanceof Error ? loadError.message : "Could not load the admin data.",
      );
    }
  }

  const handleUnlock = async () => {
    window.localStorage.setItem("ente-jobs-admin-key", password.trim());
    await loadAdminData();
  };

  const resetAdminAccess = () => {
    window.localStorage.removeItem("ente-jobs-admin-key");
    setPassword("");
    setError(null);
    setViewState("locked");
  };

  const handleSelectJob = (job: AdminJobRecord) => {
    setSelectedJobSlug(job.slug);
    setDraft(hydrateDraft(job));
    setDraftSlug(job.slug);
    setIsCreating(false);
    setIsSubmissionsOpen(false);
    setError(null);
    resetQuestionDrag();
  };

  const handleCreateNew = () => {
    const freshDraft = createBlankDraft((data?.jobs.at(-1)?.sortOrder ?? -1) + 1);
    setSelectedJobSlug(null);
    setDraft(freshDraft);
    setDraftSlug("");
    setIsCreating(true);
    setIsSubmissionsOpen(false);
    setError(null);
    resetQuestionDrag();
  };

  const handleQuestionChange = (
    questionId: string,
    field: keyof JobQuestion,
    value: string | boolean,
  ) => {
    updateDraft((current) => {
      const questions = current.questions.map((question) =>
        question.clientId === questionId ? { ...question, [field]: value } : question,
      );

      return {
        ...current,
        questions,
      };
    });
  };

  const handleAddQuestion = () => {
    updateDraft((current) => ({
      ...current,
      questions: [...current.questions, createDraftQuestion()],
    }));
  };

  const insertQuestionAt = (targetIndex: number) => {
    updateDraft((current) => {
      const questions = [...current.questions];
      questions.splice(targetIndex, 0, createDraftQuestion());

      return {
        ...current,
        questions,
      };
    });
  };

  const moveQuestion = (questionId: string, targetIndex: number) => {
    updateDraft((current) => {
      const currentIndex = current.questions.findIndex(
        (question) => question.clientId === questionId,
      );

      if (currentIndex === -1) {
        return current;
      }

      const boundedTargetIndex = Math.max(0, Math.min(targetIndex, current.questions.length));
      const adjustedTargetIndex =
        currentIndex < boundedTargetIndex ? boundedTargetIndex - 1 : boundedTargetIndex;

      if (adjustedTargetIndex === currentIndex) {
        return current;
      }

      const questions = [...current.questions];
      const [movedQuestion] = questions.splice(currentIndex, 1);
      questions.splice(adjustedTargetIndex, 0, movedQuestion);

      return {
        ...current,
        questions,
      };
    });
  };

  const removeQuestion = (questionId: string) => {
    updateDraft((current) => ({
      ...current,
      questions: current.questions.filter((question) => question.clientId !== questionId),
    }));
  };

  const handleQuestionDragStart = (
    event: DragEvent<HTMLElement>,
    questionId: string,
  ) => {
    setDraggedQuestionId(questionId);
    setDragTargetIndex(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", questionId);
  };

  const handleQuestionDragOver = (
    event: DragEvent<HTMLDivElement>,
    targetIndex: number,
  ) => {
    if (!draggedQuestionId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (dragTargetIndex !== targetIndex) {
      setDragTargetIndex(targetIndex);
    }
  };

  const handleQuestionDrop = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault();

    const questionId = draggedQuestionId || event.dataTransfer.getData("text/plain");
    if (!questionId) {
      return;
    }

    moveQuestion(questionId, targetIndex);
    resetQuestionDrag();
  };

  const handleQuestionDragEnd = () => {
    resetQuestionDrag();
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isCreating) {
        const payload: AdminCreateJobInput = {
          ...draft,
          questions: serializeDraftQuestions(draft.questions),
          slug: draftSlug.trim(),
        };
        const result = await createAdminJob(payload);
        setSelectedJobSlug(result.slug);
        await loadAdminData(result.slug);
      } else {
        if (!selectedJobSlug) {
          throw new Error("Missing job slug.");
        }
        await updateAdminJob(selectedJobSlug, {
          ...draft,
          questions: serializeDraftQuestions(draft.questions),
        });
        await loadAdminData(selectedJobSlug);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const persistJobOrder = async (jobSlug: string, direction: -1 | 1) => {
    if (!data || isReorderingJobs) {
      return;
    }

    const currentIndex = data.jobs.findIndex((job) => job.slug === jobSlug);
    const targetIndex = currentIndex + direction;

    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= data.jobs.length) {
      return;
    }

    const reorderedJobs = [...data.jobs];
    const [movedJob] = reorderedJobs.splice(currentIndex, 1);
    reorderedJobs.splice(targetIndex, 0, movedJob);

    const nextJobs = reorderedJobs.map((job, index) => ({
      ...job,
      sortOrder: index,
    }));
    const changedJobs = nextJobs.filter((job, index) => job.sortOrder !== data.jobs[index]?.sortOrder
      || job.slug !== data.jobs[index]?.slug);

    if (changedJobs.length === 0) {
      return;
    }

    setIsReorderingJobs(true);
    setError(null);

    try {
      await Promise.all(
        changedJobs.map((job) =>
          updateAdminJob(job.slug, {
            team: job.team,
            title: job.title,
            cardDescription: job.cardDescription,
            introEyebrow: job.introEyebrow,
            introTitle: job.introTitle,
            introDescription: job.introDescription,
            questions: job.questions,
            isActive: job.isActive,
            sortOrder: job.sortOrder,
          }),
        ),
      );

      setData((current) => (current ? { ...current, jobs: nextJobs } : current));
      setDraft((current) => {
        if (!current || isCreating || !selectedJobSlug) {
          return current;
        }

        const updatedSelectedJob = nextJobs.find((job) => job.slug === selectedJobSlug);
        if (!updatedSelectedJob) {
          return current;
        }

        return {
          ...current,
          sortOrder: updatedSelectedJob.sortOrder,
        };
      });
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Could not reorder roles.");
    } finally {
      setIsReorderingJobs(false);
    }
  };

  const handleDownloadCsv = (scope: "selected" | "all") => {
    const exportSubmissions = scope === "all" ? data?.submissions ?? [] : filteredSubmissions;

    if (exportSubmissions.length === 0) {
      return;
    }

    const answerKeys = Array.from(
      new Set(exportSubmissions.flatMap((submission) => Object.keys(submission.answers))),
    ).sort((left, right) => left.localeCompare(right));

    const headers = ["submission_id", "job_slug", "job_title", "submitted_at", ...answerKeys];
    const rows = exportSubmissions.map((submission) => [
      submission.id,
      submission.jobSlug,
      submission.jobTitle,
      submission.createdAt,
      ...answerKeys.map((key) => submission.answers[key] ?? ""),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const fileSuffix = scope === "all" ? "all" : selectedJobSlug ?? "all";

    anchor.href = url;
    anchor.download = `ente-job-responses-${fileSuffix}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  if (viewState === "locked") {
    return (
      <main className="admin-shell">
        <section className="admin-login-card">
          <h1>Unlock the jobs console</h1>
          <div className="admin-login-row">
            <input
              className="admin-input"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Admin key"
              type="password"
              value={password}
            />
            <button className="primary-button" onClick={() => void handleUnlock()} type="button">
              Enter
            </button>
          </div>
          {error ? <p className="submission-error">{error}</p> : null}
        </section>
      </main>
    );
  }

  if (viewState === "loading") {
    return (
      <main className="admin-shell">
        <section className="admin-login-card">
          <h1>Loading admin data...</h1>
        </section>
      </main>
    );
  }

  if (viewState === "error" || !data) {
    return (
      <main className="admin-shell">
        <section className="admin-login-card">
          <h1>Admin data unavailable</h1>
          <p>{error}</p>
          <div className="admin-login-row">
            <button className="ghost-button" onClick={resetAdminAccess} type="button">
              Change key
            </button>
            <button className="primary-button" onClick={() => void loadAdminData()} type="button">
              Retry
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <span className="eyebrow">Postings</span>
            <h2>{data.jobs.length} roles</h2>
            <button className="ghost-button" onClick={handleCreateNew} type="button">
              New posting
            </button>
          </div>
          <div className="admin-job-list">
            {data.jobs.map((job, index) => (
              <div
                key={job.slug}
                className={`admin-job-item ${selectedJobSlug === job.slug ? "is-selected" : ""}`}
              >
                <button
                  className="admin-job-select"
                  onClick={() => handleSelectJob(job)}
                  type="button"
                >
                  <strong>{job.title}</strong>
                  <span>{job.team}</span>
                </button>
                <div className="admin-job-order-actions">
                  <button
                    aria-label={`Move ${job.title} up`}
                    className="admin-order-button"
                    disabled={isReorderingJobs || index === 0}
                    onClick={() => {
                      void persistJobOrder(job.slug, -1);
                    }}
                    type="button"
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Move ${job.title} down`}
                    className="admin-order-button"
                    disabled={isReorderingJobs || index === data.jobs.length - 1}
                    onClick={() => {
                      void persistJobOrder(job.slug, 1);
                    }}
                    type="button"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="admin-main">
          {draft ? (
            <>
              <JobEditorPanel
                draft={draft}
                draftSlug={draftSlug}
                headingTitle={isCreating ? "New posting" : (selectedJob?.title ?? "Posting")}
                isCreating={isCreating}
                isSaving={isSaving}
                canViewSubmissions={Boolean(selectedJob)}
                submissionCount={selectedJob ? filteredSubmissions.length : 0}
                draggedQuestionId={draggedQuestionId}
                dragTargetIndex={dragTargetIndex}
                onSave={() => {
                  void handleSave();
                }}
                onViewSubmissions={() => setIsSubmissionsOpen(true)}
                onDraftChange={replaceDraft}
                onDraftSlugChange={setDraftSlug}
                onQuestionChange={handleQuestionChange}
                onAddQuestion={handleAddQuestion}
                onInsertQuestion={insertQuestionAt}
                onRemoveQuestion={removeQuestion}
                onQuestionDragStart={handleQuestionDragStart}
                onQuestionDragOver={handleQuestionDragOver}
                onQuestionDrop={handleQuestionDrop}
                onQuestionDragEnd={handleQuestionDragEnd}
              />
              <SubmissionsPanel
                isOpen={isSubmissionsOpen}
                jobs={data.jobs}
                selectedJob={selectedJob}
                submissions={data.submissions}
                onClose={() => setIsSubmissionsOpen(false)}
                onDownloadCsv={handleDownloadCsv}
              />
            </>
          ) : null}
          {error ? <p className="submission-error">{error}</p> : null}
        </section>
      </section>
    </main>
  );
}

function escapeCsvValue(value: string) {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const escaped = normalized.replace(/"/g, "\"\"");

  return `"${escaped}"`;
}
