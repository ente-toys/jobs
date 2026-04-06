import type { DragEvent } from "react";

import type { JobQuestion } from "../../lib/types";
import { JobQuestionsEditor } from "./JobQuestionsEditor";
import { LabeledField } from "./LabeledField";
import type { AdminDraft } from "./shared";

interface JobEditorPanelProps {
  draft: AdminDraft;
  draftSlug: string;
  headingTitle: string;
  isCreating: boolean;
  isSaving: boolean;
  draggedQuestionId: string | null;
  dragTargetIndex: number | null;
  onSave: () => void;
  onDraftChange: (draft: AdminDraft) => void;
  onDraftSlugChange: (slug: string) => void;
  onQuestionChange: (
    questionId: string,
    field: keyof JobQuestion,
    value: string | boolean,
  ) => void;
  onAddQuestion: () => void;
  onInsertQuestion: (targetIndex: number) => void;
  onRemoveQuestion: (questionId: string) => void;
  onQuestionDragStart: (event: DragEvent<HTMLElement>, questionId: string) => void;
  onQuestionDragOver: (event: DragEvent<HTMLDivElement>, targetIndex: number) => void;
  onQuestionDrop: (event: DragEvent<HTMLDivElement>, targetIndex: number) => void;
  onQuestionDragEnd: () => void;
}

export function JobEditorPanel({
  draft,
  draftSlug,
  headingTitle,
  isCreating,
  isSaving,
  draggedQuestionId,
  dragTargetIndex,
  onSave,
  onDraftChange,
  onDraftSlugChange,
  onQuestionChange,
  onAddQuestion,
  onInsertQuestion,
  onRemoveQuestion,
  onQuestionDragStart,
  onQuestionDragOver,
  onQuestionDrop,
  onQuestionDragEnd,
}: JobEditorPanelProps) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <span className="eyebrow">{isCreating ? "Creating" : "Editing"}</span>
          <h2>{headingTitle}</h2>
        </div>
        <button
          className="primary-button"
          disabled={isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? "Saving..." : isCreating ? "Create posting" : "Save posting"}
        </button>
      </div>

      <div className="admin-form-grid">
        <LabeledField
          label="Team"
          value={draft.team}
          onChange={(value) => onDraftChange({ ...draft, team: value })}
        />
        <LabeledField
          label="Title"
          value={draft.title}
          onChange={(value) => onDraftChange({ ...draft, title: value })}
        />
        <LabeledField
          label="Slug"
          value={draftSlug}
          onChange={onDraftSlugChange}
          disabled={!isCreating}
        />
        <LabeledField
          label="Sort order"
          value={String(draft.sortOrder)}
          onChange={(value) =>
            onDraftChange({
              ...draft,
              sortOrder: Number.parseInt(value || "0", 10) || 0,
            })
          }
        />
        <LabeledField
          label="Card description"
          value={draft.cardDescription}
          onChange={(value) => onDraftChange({ ...draft, cardDescription: value })}
          textarea
        />
        <LabeledField
          label="Intro eyebrow"
          value={draft.introEyebrow}
          onChange={(value) => onDraftChange({ ...draft, introEyebrow: value })}
        />
        <LabeledField
          label="Intro title"
          value={draft.introTitle}
          onChange={(value) => onDraftChange({ ...draft, introTitle: value })}
          textarea
        />
        <LabeledField
          label="Intro description"
          value={draft.introDescription}
          onChange={(value) => onDraftChange({ ...draft, introDescription: value })}
          textarea
        />
      </div>

      <label className="admin-checkbox">
        <input
          checked={draft.isActive}
          onChange={(event) => onDraftChange({ ...draft, isActive: event.target.checked })}
          type="checkbox"
        />
        <span>Posting is active</span>
      </label>

      <JobQuestionsEditor
        questions={draft.questions}
        draggedQuestionId={draggedQuestionId}
        dragTargetIndex={dragTargetIndex}
        onAddQuestion={onAddQuestion}
        onInsertQuestion={onInsertQuestion}
        onQuestionChange={onQuestionChange}
        onRemoveQuestion={onRemoveQuestion}
        onQuestionDragStart={onQuestionDragStart}
        onQuestionDragOver={onQuestionDragOver}
        onQuestionDrop={onQuestionDrop}
        onQuestionDragEnd={onQuestionDragEnd}
      />
    </div>
  );
}
