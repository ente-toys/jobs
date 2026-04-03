export type JobQuestionType = "textarea" | "url" | "text" | "currency";

export interface JobQuestion {
  id: string;
  prompt: string;
  helper: string;
  placeholder: string;
  type: JobQuestionType;
  required: boolean;
}

export interface JobCard {
  slug: string;
  team: string;
  title: string;
  cardDescription: string;
}

export interface JobDefinition extends JobCard {
  introEyebrow: string;
  introTitle: string;
  introDescription: string;
  questions: JobQuestion[];
}

export interface ApplicationSubmissionInput {
  jobSlug: string;
  answers: Record<string, string>;
}

export interface SubmissionResponse {
  ok: boolean;
  submissionId: string;
}

export interface ApiErrorPayload {
  error: string;
}

export interface AdminJobRecord extends JobDefinition {
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSubmissionRecord {
  id: string;
  jobSlug: string;
  jobTitle: string;
  answers: Record<string, string>;
  createdAt: string;
}

export interface AdminBootstrapResponse {
  jobs: AdminJobRecord[];
  submissions: AdminSubmissionRecord[];
}

export interface AdminUpdateJobInput {
  team: string;
  title: string;
  cardDescription: string;
  introEyebrow: string;
  introTitle: string;
  introDescription: string;
  questions: JobQuestion[];
  isActive: boolean;
  sortOrder: number;
}

export interface AdminCreateJobInput extends AdminUpdateJobInput {
  slug: string;
}
