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
  setFieldRef,
}: QuestionFieldProps) {
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
          if (event.key === "Enter" && !event.shiftKey && value.trim()) {
            event.preventDefault();
            onAdvance();
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
        if (event.key === "Enter" && value.trim()) {
          event.preventDefault();
          onAdvance();
        }
      }}
    />
  );
}
