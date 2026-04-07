import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { stripRichText } from "../../lib/plainText";
import type { AdminJobRecord, AdminSubmissionRecord } from "../../lib/types";

type SubmissionScope = "selected" | "all";
type SortDirection = "asc" | "desc";

interface SubmissionsPanelProps {
  isOpen: boolean;
  jobs: AdminJobRecord[];
  selectedJob: AdminJobRecord | null;
  submissions: AdminSubmissionRecord[];
  onClose: () => void;
  onDownloadCsv: (scope: SubmissionScope) => void;
}

interface SubmissionTableColumn {
  id: string;
  label: string;
  variant?: "meta" | "answer";
  getSortValue: (submission: AdminSubmissionRecord) => number | string;
  render: (submission: AdminSubmissionRecord) => ReactNode;
}

export function SubmissionsPanel({
  isOpen,
  jobs,
  selectedJob,
  submissions,
  onClose,
  onDownloadCsv,
}: SubmissionsPanelProps) {
  const titleId = useId();
  const [scope, setScope] = useState<SubmissionScope>(selectedJob ? "selected" : "all");
  const [sortColumnId, setSortColumnId] = useState("submitted");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setScope(selectedJob ? "selected" : "all");
    setSortColumnId("submitted");
    setSortDirection("desc");
  }, [isOpen, selectedJob]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const answerLabels = createAnswerLabelMap(jobs);
  const visibleSubmissions =
    scope === "selected" && selectedJob
      ? submissions.filter((submission) => submission.jobSlug === selectedJob.slug)
      : submissions;
  const answerKeys = getAnswerKeys({
    jobs,
    scope,
    selectedJob,
    submissions: visibleSubmissions,
  });

  const columns: SubmissionTableColumn[] = [
    {
      id: "submitted",
      label: "Submitted",
      variant: "meta",
      getSortValue: (submission) => Date.parse(submission.createdAt),
      render: (submission) => (
        <span className="admin-table-date">{formatSubmissionDate(submission.createdAt)}</span>
      ),
    },
  ];

  if (scope === "all") {
    columns.push({
      id: "posting",
      label: "Posting",
      variant: "meta",
      getSortValue: (submission) => submission.jobTitle.toLowerCase(),
      render: (submission) => (
        <div className="admin-table-posting">
          <strong>{submission.jobTitle}</strong>
          <span>{submission.jobSlug}</span>
        </div>
      ),
    });
  }

  answerKeys.forEach((key) => {
    columns.push({
      id: `answer:${key}`,
      label: answerLabels.get(key) ?? humanizeAnswerKey(key),
      variant: "answer",
      getSortValue: (submission) => normalizeSortText(submission.answers[key] ?? ""),
      render: (submission) => {
        const value = submission.answers[key]?.trim() ?? "";

        return value ? (
          <p className="admin-answer-cell" title={value}>
            {value}
          </p>
        ) : (
          <span className="admin-table-empty">No answer</span>
        );
      },
    });
  });

  const activeColumn = columns.find((column) => column.id === sortColumnId) ?? columns[0];
  const sortedSubmissions = [...visibleSubmissions].sort((left, right) =>
    compareSortValues(
      activeColumn.getSortValue(left),
      activeColumn.getSortValue(right),
      sortDirection,
    ),
  );

  const scopeLabel =
    scope === "selected" && selectedJob ? selectedJob.title : "All postings";
  const summaryText =
    scope === "selected" && selectedJob
      ? `${visibleSubmissions.length} ${pluralize("response", visibleSubmissions.length)} for ${selectedJob.title}`
      : `${visibleSubmissions.length} total ${pluralize("response", visibleSubmissions.length)} across ${jobs.length} ${pluralize("posting", jobs.length)}`;

  const handleSort = (columnId: string) => {
    if (columnId === sortColumnId) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumnId(columnId);
    setSortDirection(columnId === "submitted" ? "desc" : "asc");
  };

  const getSortState = (columnId: string) => {
    if (columnId !== sortColumnId) {
      return "none";
    }

    return sortDirection === "asc" ? "asc" : "desc";
  };

  return createPortal(
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="admin-modal-backdrop"
      onClick={onClose}
      role="dialog"
    >
      <section
        className="admin-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div className="admin-modal-copy">
            <span className="eyebrow">Submissions</span>
            <h2 id={titleId}>{scopeLabel}</h2>
            <p>{summaryText}</p>
          </div>

          <div className="admin-modal-actions">
            <div className="admin-scope-toggle" role="tablist" aria-label="Submission scope">
              {selectedJob ? (
                <button
                  aria-selected={scope === "selected"}
                  className={`admin-scope-button ${scope === "selected" ? "is-active" : ""}`}
                  onClick={() => setScope("selected")}
                  role="tab"
                  type="button"
                >
                  This posting
                </button>
              ) : null}
              <button
                aria-selected={scope === "all"}
                className={`admin-scope-button ${scope === "all" ? "is-active" : ""}`}
                onClick={() => setScope("all")}
                role="tab"
                type="button"
              >
                View all responses
              </button>
            </div>

            <button
              className="ghost-button"
              disabled={visibleSubmissions.length === 0}
              onClick={() => onDownloadCsv(scope)}
              type="button"
            >
              Download CSV
            </button>

            <button
              aria-label="Close submissions"
              className="admin-icon-button"
              onClick={onClose}
              type="button"
            >
              <span className="admin-close-icon" aria-hidden="true">
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>

        <div className="admin-table-shell">
          {sortedSubmissions.length > 0 ? (
            <div className="admin-table-scroll">
              <table className="admin-submissions-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        aria-sort={
                          column.id === sortColumnId
                            ? sortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className={column.variant === "answer" ? "is-answer" : "is-meta"}
                        key={column.id}
                        scope="col"
                      >
                        <button
                          className="admin-table-sort"
                          onClick={() => handleSort(column.id)}
                          type="button"
                        >
                          <span>{column.label}</span>
                          <span
                            aria-hidden="true"
                            className={`admin-table-sort-indicator is-${getSortState(column.id)}`}
                          >
                            <span className="is-up" />
                            <span className="is-down" />
                          </span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedSubmissions.map((submission) => (
                    <tr key={submission.id}>
                      {columns.map((column) => (
                        <td
                          className={column.variant === "answer" ? "is-answer" : "is-meta"}
                          key={column.id}
                        >
                          {column.render(submission)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state admin-modal-empty-state">
              <h3>No submissions yet.</h3>
              <p>
                {scope === "selected" && selectedJob
                  ? `Responses for ${selectedJob.title} will show up here once people apply.`
                  : "Responses from every posting will show up here once people apply."}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

function createAnswerLabelMap(jobs: AdminJobRecord[]) {
  const answerLabels = new Map<string, string>();

  jobs.forEach((job) => {
    job.questions.forEach((question) => {
      if (answerLabels.has(question.id)) {
        return;
      }

      answerLabels.set(question.id, getQuestionLabel(question.prompt, question.id));
    });
  });

  return answerLabels;
}

function getAnswerKeys({
  jobs,
  scope,
  selectedJob,
  submissions,
}: {
  jobs: AdminJobRecord[];
  scope: SubmissionScope;
  selectedJob: AdminJobRecord | null;
  submissions: AdminSubmissionRecord[];
}) {
  const orderedKeys: string[] = [];
  const seen = new Set<string>();

  const addKey = (key: string) => {
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    orderedKeys.push(key);
  };

  if (scope === "selected" && selectedJob) {
    selectedJob.questions.forEach((question) => addKey(question.id));
  } else {
    jobs.forEach((job) => {
      job.questions.forEach((question) => addKey(question.id));
    });
  }

  submissions.forEach((submission) => {
    Object.keys(submission.answers).forEach((key) => addKey(key));
  });

  return orderedKeys;
}

function getQuestionLabel(prompt: string, fallback: string) {
  const plainTextPrompt = stripRichText(prompt)
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return plainTextPrompt || humanizeAnswerKey(fallback);
}

function humanizeAnswerKey(key: string) {
  return key
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeSortText(value: string) {
  return value.trim().toLocaleLowerCase();
}

function compareSortValues(
  left: number | string,
  right: number | string,
  direction: SortDirection,
) {
  const leftValue = typeof left === "number" ? left : left.trim();
  const rightValue = typeof right === "number" ? right : right.trim();

  const leftEmpty = leftValue === "" || Number.isNaN(leftValue);
  const rightEmpty = rightValue === "" || Number.isNaN(rightValue);

  if (leftEmpty && rightEmpty) {
    return 0;
  }

  if (leftEmpty) {
    return 1;
  }

  if (rightEmpty) {
    return -1;
  }

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
  }

  const comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
    numeric: true,
    sensitivity: "base",
  });

  return direction === "asc" ? comparison : comparison * -1;
}

function formatSubmissionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function pluralize(word: string, count: number) {
  return count === 1 ? word : `${word}s`;
}
