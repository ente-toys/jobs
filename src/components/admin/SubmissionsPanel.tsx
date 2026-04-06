import type { AdminSubmissionRecord } from "../../lib/types";

interface SubmissionsPanelProps {
  submissions: AdminSubmissionRecord[];
  canDownloadCsv: boolean;
  onDownloadCsv: () => void;
}

export function SubmissionsPanel({
  submissions,
  canDownloadCsv,
  onDownloadCsv,
}: SubmissionsPanelProps) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <span className="eyebrow">Submissions</span>
          <h2>{submissions.length} responses</h2>
        </div>
        <button
          className="ghost-button"
          disabled={!canDownloadCsv}
          onClick={onDownloadCsv}
          type="button"
        >
          Download CSV
        </button>
      </div>
      <div className="admin-submission-list">
        {submissions.map((submission) => (
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
        {submissions.length === 0 ? (
          <div className="empty-state">
            <h3>No submissions yet.</h3>
            <p>New responses for this role will show up here.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
