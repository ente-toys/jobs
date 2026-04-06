import { Fragment } from "react";
import type { DragEvent } from "react";

import { stripRichText } from "../../lib/plainText";
import type { JobQuestion } from "../../lib/types";
import { LabeledField } from "./LabeledField";
import type { DraftQuestion } from "./shared";

interface JobQuestionsEditorProps {
  questions: DraftQuestion[];
  draggedQuestionId: string | null;
  dragTargetIndex: number | null;
  onAddQuestion: () => void;
  onInsertQuestion: (targetIndex: number) => void;
  onQuestionChange: (
    questionId: string,
    field: keyof JobQuestion,
    value: string | boolean,
  ) => void;
  onRemoveQuestion: (questionId: string) => void;
  onQuestionDragStart: (event: DragEvent<HTMLElement>, questionId: string) => void;
  onQuestionDragOver: (event: DragEvent<HTMLDivElement>, targetIndex: number) => void;
  onQuestionDrop: (event: DragEvent<HTMLDivElement>, targetIndex: number) => void;
  onQuestionDragEnd: () => void;
}

export function JobQuestionsEditor({
  questions,
  draggedQuestionId,
  dragTargetIndex,
  onAddQuestion,
  onInsertQuestion,
  onQuestionChange,
  onRemoveQuestion,
  onQuestionDragStart,
  onQuestionDragOver,
  onQuestionDrop,
  onQuestionDragEnd,
}: JobQuestionsEditorProps) {
  return (
    <div className="admin-questions">
      <div className="admin-questions-header">
        <span className="eyebrow">Questions</span>
        <button className="ghost-button" onClick={onAddQuestion} type="button">
          Add question
        </button>
      </div>
      <div className="admin-question-list">
        {questions.map((question, index) => (
          <Fragment key={question.clientId}>
            <div
              className={`admin-question-slot ${
                index === 0 ? "is-edge" : ""
              } ${
                draggedQuestionId ? "is-dragging" : ""
              } ${
                dragTargetIndex === index ? "is-active" : ""
              }`}
              onDragOver={(event) => onQuestionDragOver(event, index)}
              onDrop={(event) => onQuestionDrop(event, index)}
            >
              <span>Drop question here</span>
              {index > 0 ? (
                <button
                  className="admin-insert-question"
                  onClick={() => onInsertQuestion(index)}
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
                    {stripRichText(question.prompt) || question.id || "Drag to reorder"}
                  </span>
                </div>
                <button
                  aria-label={`Drag to reorder question ${index + 1}`}
                  className="admin-drag-handle"
                  draggable
                  onDragEnd={onQuestionDragEnd}
                  onDragStart={(event) => onQuestionDragStart(event, question.clientId)}
                  type="button"
                >
                  <span aria-hidden="true">::</span>
                </button>
              </div>
              <div className="admin-form-grid compact">
                <LabeledField
                  label="ID"
                  value={question.id}
                  onChange={(value) => onQuestionChange(question.clientId, "id", value)}
                />
                <LabeledField
                  label="Question"
                  value={question.prompt}
                  onChange={(value) => onQuestionChange(question.clientId, "prompt", value)}
                  textarea
                />
                <LabeledField
                  label="Description"
                  value={question.helper}
                  onChange={(value) => onQuestionChange(question.clientId, "helper", value)}
                  textarea
                />
                <LabeledField
                  label="Placeholder"
                  value={question.placeholder}
                  onChange={(value) => onQuestionChange(question.clientId, "placeholder", value)}
                  textarea
                />
                <label className="admin-field">
                  <span>Type</span>
                  <select
                    className="admin-input"
                    onChange={(event) =>
                      onQuestionChange(question.clientId, "type", event.target.value)
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
                      onQuestionChange(question.clientId, "required", event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>Required</span>
                </label>
                <button
                  className="ghost-button danger"
                  onClick={() => onRemoveQuestion(question.clientId)}
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
            dragTargetIndex === questions.length ? "is-active" : ""
          }`}
          onDragOver={(event) => onQuestionDragOver(event, questions.length)}
          onDrop={(event) => onQuestionDrop(event, questions.length)}
        >
          <span>Drop question here</span>
        </div>
      </div>
    </div>
  );
}
