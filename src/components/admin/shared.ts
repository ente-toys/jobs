import type { AdminJobRecord, AdminUpdateJobInput, JobQuestion } from "../../lib/types";

export interface DraftQuestion extends JobQuestion {
  clientId: string;
}

export interface AdminDraft extends Omit<AdminUpdateJobInput, "questions"> {
  questions: DraftQuestion[];
}

function createQuestionClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `question-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createDraftQuestion(question: Partial<JobQuestion> = {}): DraftQuestion {
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

export function serializeDraftQuestions(questions: DraftQuestion[]): JobQuestion[] {
  return questions.map(({ clientId: _clientId, ...question }) => ({
    id: question.id,
    prompt: question.prompt,
    helper: question.helper,
    placeholder: question.placeholder,
    type: question.type,
    required: question.required,
  }));
}

export function hydrateDraft(job: AdminJobRecord): AdminDraft {
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

export function createBlankDraft(sortOrder: number): AdminDraft {
  return {
    team: "",
    title: "",
    cardDescription: "",
    introEyebrow: "",
    introTitle: "",
    introDescription: "",
    questions: [createDraftQuestion()],
    isActive: true,
    sortOrder,
  };
}
