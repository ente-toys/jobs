import { Fragment, useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";

import { createAdminJob, getAdminBootstrap, updateAdminJob } from "../lib/api";
import type {
  AdminBootstrapResponse,
  AdminCreateJobInput,
  AdminJobRecord,
  AdminSubmissionRecord,
  AdminUpdateJobInput,
  JobQuestion,
} from "../lib/types";

type AdminViewState = "locked" | "loading" | "ready" | "error";

const blankQuestion: JobQuestion = {
  id: "",
  prompt: "",
  helper: "",
  placeholder: "",
  type: "text",
  required: true,
};

interface DraftQuestion extends JobQuestion {
  clientId: string;
}

interface AdminDraft extends Omit<AdminUpdateJobInput, "questions"> {
  questions: DraftQuestion[];
}

function createQuestionClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `question-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createDraftQuestion(question: Partial<JobQuestion> = {}): DraftQuestion {
  return {
    id: question.id ?? "",
    prompt: question.prompt ?? "",
    helper: question.helper ?? "",
    placeholder: question.placeholder ?? "",
    type: question.type ?? "text",
    required: question.required ?? true,
    clientId: createQuestionClientId(),
  };
}

function serializeDraftQuestions(questions: DraftQuestion[]): JobQuestion[] {
  return questions.map(({ clientId: _clientId, ...question }) => ({
    id: question.id,
    prompt: question.prompt,
    helper: question.helper,
    placeholder: question.placeholder,
    type: question.type,
    required: question.required,
  }));
}

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
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);

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

  const canDownloadCsv = filteredSubmissions.length > 0;

  function hydrateDraft(job: AdminJobRecord): AdminDraft {
    return {
      team: job.team,
      title: job.title,
      cardDescription: job.cardDescription,
      introEyebrow: job.introEyebrow,
      introTitle: job.introTitle,
      introDescription: job.introDescription,
      questions: job.questions.map((question) => createDraftQuestion(question)),
      isActive: job.isActive,
      sortOrder: job.sortOrder,
    };
  }

  function createBlankDraft(): AdminDraft {
    return {
      team: "",
      title: "",
      cardDescription: "",
      introEyebrow: "",
      introTitle: "",
      introDescription: "",
      questions: [createDraftQuestion()],
      isActive: true,
      sortOrder: (data?.jobs.at(-1)?.sortOrder ?? -1) + 1,
    };
  }

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
      setDraggedQuestionId(null);
      setDragTargetIndex(null);
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
    setError(null);
  };

  const handleCreateNew = () => {
    const freshDraft = createBlankDraft();
    setSelectedJobSlug(null);
    setDraft(freshDraft);
    setDraftSlug("");
    setIsCreating(true);
    setError(null);
    setDraggedQuestionId(null);
    setDragTargetIndex(null);
  };

  const handleQuestionChange = (
    questionId: string,
    field: keyof JobQuestion,
    value: string | boolean,
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const questions = current.questions.map((question) =>
        question.clientId === questionId ? { ...question, [field]: value } : question,
      );

      return {
        ...current,
        questions,
      };
    });
  };

  const insertQuestionAt = (targetIndex: number) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const questions = [...current.questions];
      questions.splice(targetIndex, 0, createDraftQuestion());

      return {
        ...current,
        questions,
      };
    });
  };

  const moveQuestion = (questionId: string, targetIndex: number) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

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
    setDraggedQuestionId(null);
    setDragTargetIndex(null);
  };

  const handleQuestionDragEnd = () => {
    setDraggedQuestionId(null);
    setDragTargetIndex(null);
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

  const handleDownloadCsv = () => {
    if (filteredSubmissions.length === 0) {
      return;
    }

    const answerKeys = Array.from(
      new Set(filteredSubmissions.flatMap((submission) => Object.keys(submission.answers))),
    ).sort((left, right) => left.localeCompare(right));

    const headers = ["submission_id", "job_slug", "job_title", "submitted_at", ...answerKeys];
    const rows = filteredSubmissions.map((submission) => [
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
    const fileSuffix = selectedJobSlug ?? "all";

    anchor.href = url;
    anchor.download = `ente-job-responses-${fileSuffix}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  if (viewState === "locked") {
    return (
      <main className="admin-shell">
        <section className="admin-login-card">
          <span className="eyebrow">Admin</span>
          <h1>Unlock the jobs console</h1>
          <p>Enter the shared admin key to edit postings and inspect submissions.</p>
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
            {data.jobs.map((job) => (
              <button
                key={job.slug}
                className={`admin-job-item ${selectedJobSlug === job.slug ? "is-selected" : ""}`}
                onClick={() => handleSelectJob(job)}
                type="button"
              >
                <strong>{job.title}</strong>
                <span>{job.team}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="admin-main">
          {draft ? (
            <>
              <div className="admin-panel">
                <div className="admin-panel-header">
                  <div>
                    <span className="eyebrow">{isCreating ? "Creating" : "Editing"}</span>
                    <h2>{isCreating ? "New posting" : (selectedJob?.title ?? "Posting")}</h2>
                  </div>
                  <button
                    className="primary-button"
                    disabled={isSaving}
                    onClick={() => void handleSave()}
                    type="button"
                  >
                    {isSaving ? "Saving..." : isCreating ? "Create posting" : "Save posting"}
                  </button>
                </div>

                <div className="admin-form-grid">
                  <LabeledField
                    label="Team"
                    value={draft.team}
                    onChange={(value) => setDraft({ ...draft, team: value })}
                  />
                  <LabeledField
                    label="Title"
                    value={draft.title}
                    onChange={(value) => setDraft({ ...draft, title: value })}
                  />
                  <LabeledField
                    label="Slug"
                    value={draftSlug}
                    onChange={setDraftSlug}
                    disabled={!isCreating}
                  />
                  <LabeledField
                    label="Sort order"
                    value={String(draft.sortOrder)}
                    onChange={(value) =>
                      setDraft({ ...draft, sortOrder: Number.parseInt(value || "0", 10) || 0 })
                    }
                  />
                  <LabeledField
                    label="Card description"
                    value={draft.cardDescription}
                    onChange={(value) => setDraft({ ...draft, cardDescription: value })}
                    textarea
                  />
                  <LabeledField
                    label="Intro eyebrow"
                    value={draft.introEyebrow}
                    onChange={(value) => setDraft({ ...draft, introEyebrow: value })}
                  />
                  <LabeledField
                    label="Intro title"
                    value={draft.introTitle}
                    onChange={(value) => setDraft({ ...draft, introTitle: value })}
                    textarea
                  />
                  <LabeledField
                    label="Intro description"
                    value={draft.introDescription}
                    onChange={(value) => setDraft({ ...draft, introDescription: value })}
                    textarea
                  />
                </div>

                <label className="admin-checkbox">
                  <input
                    checked={draft.isActive}
                    onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                    type="checkbox"
                  />
                  <span>Posting is active</span>
                </label>

                <div className="admin-questions">
                  <div className="admin-questions-header">
                    <span className="eyebrow">Questions</span>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          questions: [...draft.questions, createDraftQuestion()],
                        })
                      }
                      type="button"
                    >
                      Add question
                    </button>
                  </div>
                  <div className="admin-question-list">
                    {draft.questions.map((question, index) => (
                      <Fragment key={question.clientId}>
                        <div
                          className={`admin-question-slot ${
                            index === 0 ? "is-edge" : ""
                          } ${
                            draggedQuestionId ? "is-dragging" : ""
                          } ${
                            dragTargetIndex === index ? "is-active" : ""
                          }`}
                          onDragOver={(event) => handleQuestionDragOver(event, index)}
                          onDrop={(event) => handleQuestionDrop(event, index)}
                        >
                          <span>Drop question here</span>
                          {index > 0 ? (
                            <button
                              className="admin-insert-question"
                              onClick={() => insertQuestionAt(index)}
                              type="button"
                            >
                              +
                            </button>
                          ) : null}
                        </div>
                        <div
                          className={`admin-question-card ${
                            draggedQuestionId === question.clientId ? "is-dragging" : ""
                          }`}
                        >
                          <div className="admin-question-header">
                            <div className="admin-question-heading">
                              <strong>Question {index + 1}</strong>
                              <span>
                                {question.prompt || question.id || "Drag to reorder"}
                              </span>
                            </div>
                            <button
                              aria-label={`Drag to reorder question ${index + 1}`}
                              className="admin-drag-handle"
                              draggable
                              onDragEnd={handleQuestionDragEnd}
                              onDragStart={(event) =>
                                handleQuestionDragStart(event, question.clientId)
                              }
                              type="button"
                            >
                              <span aria-hidden="true">::</span>
                            </button>
                          </div>
                          <div className="admin-form-grid compact">
                            <LabeledField
                              label="ID"
                              value={question.id}
                              onChange={(value) =>
                                handleQuestionChange(question.clientId, "id", value)
                              }
                            />
                            <LabeledField
                              label="Question"
                              value={question.prompt}
                              onChange={(value) =>
                                handleQuestionChange(question.clientId, "prompt", value)
                              }
                              textarea
                            />
                            <LabeledField
                              label="Description"
                              value={question.helper}
                              onChange={(value) =>
                                handleQuestionChange(question.clientId, "helper", value)
                              }
                              textarea
                            />
                            <LabeledField
                              label="Placeholder"
                              value={question.placeholder}
                              onChange={(value) =>
                                handleQuestionChange(question.clientId, "placeholder", value)
                              }
                              textarea
                            />
                            <label className="admin-field">
                              <span>Type</span>
                              <select
                                className="admin-input"
                                onChange={(event) =>
                                  handleQuestionChange(
                                    question.clientId,
                                    "type",
                                    event.target.value,
                                  )
                                }
                                value={question.type}
                              >
                                <option value="text">Text</option>
                                <option value="textarea">Textarea</option>
                                <option value="url">URL</option>
                                <option value="currency">Currency</option>
                              </select>
                            </label>
                          </div>
                          <div className="admin-question-actions">
                            <label className="admin-checkbox">
                              <input
                                checked={question.required}
                                onChange={(event) =>
                                  handleQuestionChange(
                                    question.clientId,
                                    "required",
                                    event.target.checked,
                                  )
                                }
                                type="checkbox"
                              />
                              <span>Required</span>
                            </label>
                            <button
                              className="ghost-button danger"
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  questions: draft.questions.filter(
                                    (draftQuestion) =>
                                      draftQuestion.clientId !== question.clientId,
                                  ),
                                })
                              }
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </Fragment>
                    ))}
                    <div
                      aria-hidden="true"
                      className={`admin-question-slot is-edge ${
                        draggedQuestionId ? "is-dragging" : ""
                      } ${
                        dragTargetIndex === draft.questions.length ? "is-active" : ""
                      }`}
                      onDragOver={(event) =>
                        handleQuestionDragOver(event, draft.questions.length)
                      }
                      onDrop={(event) =>
                        handleQuestionDrop(event, draft.questions.length)
                      }
                    >
                      <span>Drop question here</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-panel">
                <div className="admin-panel-header">
                  <div>
                    <span className="eyebrow">Submissions</span>
                    <h2>{filteredSubmissions.length} responses</h2>
                  </div>
                  <button
                    className="ghost-button"
                    disabled={!canDownloadCsv}
                    onClick={handleDownloadCsv}
                    type="button"
                  >
                    Download CSV
                  </button>
                </div>
                <div className="admin-submission-list">
                  {filteredSubmissions.map((submission) => (
                    <article className="admin-submission-card" key={submission.id}>
                      <div className="admin-submission-meta">
                        <strong>{submission.jobTitle}</strong>
                        <span>{new Date(submission.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="admin-answer-list">
                        {Object.entries(submission.answers).map(([key, value]) => (
                          <div className="admin-answer-row" key={key}>
                            <span>{key}</span>
                            <p>{value || "No answer"}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                  {filteredSubmissions.length === 0 ? (
                    <div className="empty-state">
                      <h3>No submissions yet.</h3>
                      <p>New responses for this role will show up here.</p>
                    </div>
                  ) : null}
                </div>
              </div>
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

function LabeledField({
  label,
  value,
  onChange,
  textarea = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {textarea ? (
        <textarea
          className="admin-input admin-textarea"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          value={value}
        />
      ) : (
        <input
          className="admin-input"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      )}
    </label>
  );
}
