import type {
  ChangeEvent,
  HTMLAttributes,
  KeyboardEvent,
} from "react";

import type { JobQuestion } from "../lib/types";

interface QuestionFieldProps {
  question: JobQuestion;
  value: string;
  onChange: (value: string) => void;
  onAdvance: () => void;
  onArrowAdvance: () => void;
  onRetreat: () => void;
  setFieldRef?: (node: HTMLInputElement | HTMLTextAreaElement | null) => void;
}

const inputModeByType: Record<
  JobQuestion["type"],
  HTMLAttributes<HTMLInputElement>["inputMode"]
> = {
  textarea: "text",
  text: "text",
  url: "url",
  currency: "text",
};

export function QuestionField({
  question,
  value,
  onChange,
  onAdvance,
  onArrowAdvance,
  onRetreat,
  setFieldRef,
}: QuestionFieldProps) {
  const hasModifier = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    event.shiftKey || event.altKey || event.ctrlKey || event.metaKey;

  const hasSelection = (field: HTMLInputElement | HTMLTextAreaElement) =>
    field.selectionStart !== field.selectionEnd;

  const isOnFirstLine = (field: HTMLTextAreaElement) =>
    !field.value.slice(0, field.selectionStart ?? 0).includes("\n");

  const isOnLastLine = (field: HTMLTextAreaElement) =>
    !field.value.slice(field.selectionEnd ?? 0).includes("\n");

  const commonProps = {
    value,
    placeholder: question.placeholder,
    onChange: (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      onChange(event.target.value);
    },
    className: "flow-input",
  };

  if (question.type === "textarea") {
    return (
      <textarea
        {...commonProps}
        ref={setFieldRef}
        rows={6}
        onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
          if (hasModifier(event)) {
            return;
          }

          if (event.key === "Enter" && !event.shiftKey && value.trim()) {
            event.preventDefault();
            onAdvance();
            return;
          }

          if (hasSelection(event.currentTarget)) {
            return;
          }

          if (event.key === "ArrowUp" && isOnFirstLine(event.currentTarget)) {
            event.preventDefault();
            onRetreat();
            return;
          }

          if (event.key === "ArrowDown" && value.trim() && isOnLastLine(event.currentTarget)) {
            event.preventDefault();
            onArrowAdvance();
          }
        }}
      />
    );
  }

  return (
    <input
      {...commonProps}
      ref={setFieldRef}
      type={question.type === "url" ? "url" : "text"}
      inputMode={inputModeByType[question.type]}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (hasModifier(event)) {
          return;
        }

        if (event.key === "Enter" && value.trim()) {
          event.preventDefault();
          onAdvance();
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          onRetreat();
          return;
        }

        if (event.key === "ArrowDown" && value.trim()) {
          event.preventDefault();
          onArrowAdvance();
        }
      }}
    />
  );
}
