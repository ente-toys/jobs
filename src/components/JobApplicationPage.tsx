import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getJob, submitApplication } from "../lib/api";
import { thanksArtworkUrl } from "../lib/assets";
import { getRoleArtwork } from "../lib/roleArtwork";
import type { JobDefinition, JobQuestion } from "../lib/types";
import { QuestionField } from "./QuestionField";
import { RichText } from "./RichText";
import { SiteNav } from "./SiteNav";

type ViewState = "loading" | "ready" | "submitted" | "error";

interface PageState {
  job: JobDefinition | null;
  view: ViewState;
  error: string | null;
}

const animationTransition = {
  duration: 0.48,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function JobApplicationPage() {
  const navigate = useNavigate();
  const { slug = "" } = useParams();
  const [pageState, setPageState] = useState<PageState>({
    job: null,
    view: "loading",
    error: null,
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const draftStorageKey = slug ? `ente-jobs:${slug}:draft` : "";

  useEffect(() => {
    const abortController = new AbortController();

    void (async () => {
      try {
        const job = await getJob(slug);
        if (abortController.signal.aborted) {
          return;
        }

        setPageState({ job, view: "ready", error: null });

        const persistedDraft = draftStorageKey
          ? sessionStorage.getItem(draftStorageKey)
          : null;

        if (persistedDraft) {
          try {
            const parsedDraft = JSON.parse(persistedDraft) as Record<string, string>;
            setAnswers(parsedDraft);
          } catch {
            sessionStorage.removeItem(draftStorageKey);
          }
        } else {
          setAnswers({});
        }

        setStepIndex(0);
        setSubmissionError(null);
      } catch (error) {
        if (!abortController.signal.aborted) {
          setPageState({
            job: null,
            view: "error",
            error:
              error instanceof Error
                ? error.message
                : "We could not load this role right now.",
          });
        }
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [draftStorageKey, slug]);

  useEffect(() => {
    if (!draftStorageKey || pageState.view !== "ready") {
      return;
    }

    sessionStorage.setItem(draftStorageKey, JSON.stringify(answers));
  }, [answers, draftStorageKey, pageState.view]);

  const job = pageState.job;
  const introArtwork = job ? getRoleArtwork(job.team) : null;
  const totalSteps = job ? job.questions.length + 1 : 1;
  const activeQuestion = useMemo(() => {
    if (!job || stepIndex === 0) {
      return null;
    }

    return job.questions[stepIndex - 1] ?? null;
  }, [job, stepIndex]);
  const currentValue = activeQuestion ? answers[activeQuestion.id] ?? "" : "";
  const canContinue = stepIndex === 0 || currentValue.trim().length > 0;
  const progress = pageState.view === "submitted" ? 100 : (stepIndex / totalSteps) * 100;

  const updateAnswer = (question: JobQuestion, value: string) => {
    setAnswers((current) => ({
      ...current,
      [question.id]: value,
    }));
    setSubmissionError(null);
  };

  const goBack = () => {
    setSubmissionError(null);

    if (stepIndex === 0) {
      navigate("/");
      return;
    }

    setDirection(-1);
    setStepIndex((current) => current - 1);
  };

  const goToNextStep = () => {
    if (!job || isSubmitting || stepIndex >= job.questions.length) {
      return;
    }

    setSubmissionError(null);
    setDirection(1);
    setStepIndex((current) => current + 1);
  };

  const goForward = async () => {
    if (!job || isSubmitting) {
      return;
    }

    if (stepIndex === 0) {
      setDirection(1);
      setStepIndex(1);
      return;
    }

    if (!canContinue) {
      return;
    }

    if (stepIndex < job.questions.length) {
      setDirection(1);
      setStepIndex((current) => current + 1);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionError(null);
      await submitApplication({
        jobSlug: job.slug,
        answers,
      });
      if (draftStorageKey) {
        sessionStorage.removeItem(draftStorageKey);
      }
      setPageState((current) => ({
        ...current,
        view: "submitted",
      }));
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Submission failed. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (pageState.view !== "ready") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest("input, textarea, button, a, select, label") ||
          (target instanceof HTMLElement && target.isContentEditable))
      ) {
        return;
      }

      if (event.key === "Enter" && !event.shiftKey && stepIndex === 0) {
        event.preventDefault();
        void goForward();
        return;
      }

      if (event.shiftKey) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        goToNextStep();
        return;
      }

      if ((event.key === "ArrowLeft" || event.key === "ArrowUp") && stepIndex > 0) {
        event.preventDefault();
        goBack();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goBack, goForward, goToNextStep, pageState.view, stepIndex]);

  if (pageState.view === "loading") {
    return (
      <FlowPageShell>
        <div className="flow-card loading-card" />
      </FlowPageShell>
    );
  }

  if (pageState.view === "error" || !job) {
    return (
      <FlowPageShell>
        <section className="flow-card error-card">
          <span className="eyebrow">ente jobs</span>
          <h1>This role is not available right now.</h1>
          <p>{pageState.error}</p>
          <Link className="ghost-button" to="/">
            Back to roles
          </Link>
        </section>
      </FlowPageShell>
    );
  }

  if (pageState.view === "submitted") {
    return (
      <FlowPageShell>
        <motion.section
          className="flow-card success-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={animationTransition}
        >
          <img
            alt=""
            aria-hidden="true"
            className="success-artwork"
            src={thanksArtworkUrl}
          />
          <h1>Thanks.</h1>
          <p>If the fit is real, we will get back to you!</p>
          <a
            className="primary-button primary-button-accent"
            href="https://ente.com/"
          >
            Check out Ente
          </a>
        </motion.section>
      </FlowPageShell>
    );
  }

  return (
    <FlowPageShell>
      <section className="flow-card">
        <div className="progress-track" aria-hidden="true">
          <motion.div
            className="progress-fill"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div className="flow-stage">
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            {stepIndex === 0 ? (
              <StepIntro
                key="intro"
                direction={direction}
                job={job}
              />
            ) : (
              <StepQuestion
                key={activeQuestion?.id ?? "question"}
                direction={direction}
                question={activeQuestion}
                value={currentValue}
                onChange={(value) => {
                  if (activeQuestion) {
                    updateAnswer(activeQuestion, value);
                  }
                }}
                onAdvance={() => {
                  void goForward();
                }}
                onArrowAdvance={goToNextStep}
                onRetreat={goBack}
              />
            )}
          </AnimatePresence>
        </div>

        <footer className="flow-footer">
          {stepIndex === 0 && introArtwork ? (
            <div className="flow-footer-artwork" aria-hidden="true">
              <img alt="" src={introArtwork} />
            </div>
          ) : activeQuestion?.type === "textarea" ? (
            <div className="flow-hint">
              Shift + Enter adds a new line.
            </div>
          ) : null}
          <div className="flow-actions">
            <button className="ghost-button" onClick={goBack} type="button">
              {stepIndex === 0 ? "Back" : "Previous"}
            </button>
            <button
              className="primary-button"
              disabled={!canContinue || isSubmitting}
              onClick={() => {
                void goForward();
              }}
              type="button"
            >
              {isSubmitting
                ? "Submitting..."
                : stepIndex === 0
                  ? "Apply"
                  : stepIndex === job.questions.length
                    ? "Submit"
                    : "Next"}
            </button>
          </div>
        </footer>

        {submissionError ? <p className="submission-error">{submissionError}</p> : null}
      </section>
    </FlowPageShell>
  );
}

function FlowPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="flow-page-shell">
      <SiteNav />
      <div className="flow-shell">{children}</div>
    </main>
  );
}

function StepIntro({
  direction,
  job,
}: {
  direction: number;
  job: JobDefinition;
}) {
  return (
    <motion.div
      className="step-frame step-frame-intro"
      custom={direction}
      initial={{ opacity: 0, x: direction > 0 ? 56 : -56 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
      transition={animationTransition}
    >
      <RichText
        as="h1"
        className="rich-copy"
        html={job.introTitle}
        mode="inline"
      />
      <RichText
        className="intro-copy rich-copy"
        format="markdown"
        html={job.introDescription}
        mode="block"
      />
      <div className="intro-summary">
        <div className="intro-summary-card">
          <span className="summary-marker">
            <svg
              aria-hidden="true"
              className="summary-icon"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 21s-5.25-5.16-5.25-10.04A5.25 5.25 0 1 1 17.25 11C17.25 15.84 12 21 12 21Z"
                fill="currentColor"
              />
              <circle cx="12" cy="11" fill="rgba(255, 255, 255, 0.9)" r="1.55" />
            </svg>
          </span>
          <strong className="summary-value">Bangalore, India</strong>
        </div>
      </div>
    </motion.div>
  );
}

function StepQuestion({
  direction,
  question,
  value,
  onChange,
  onAdvance,
  onArrowAdvance,
  onRetreat,
}: {
  direction: number;
  question: JobQuestion | null;
  value: string;
  onChange: (value: string) => void;
  onAdvance: () => void;
  onArrowAdvance: () => void;
  onRetreat: () => void;
}) {
  const fieldWrapRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const focusField = () => {
    const field = fieldRef.current;
    if (!field || document.activeElement === field) {
      return false;
    }

    try {
      field.focus({ preventScroll: true });
    } catch {
      field.focus();
    }

    if (document.activeElement !== field) {
      return false;
    }

    const caretPosition = field.value.length;
    field.setSelectionRange?.(caretPosition, caretPosition);

    return true;
  };

  useEffect(() => {
    if (!question) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      const frameId = window.requestAnimationFrame(() => {
        focusField();
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    const fieldWrap = fieldWrapRef.current;
    if (!fieldWrap) {
      return;
    }

    let frameId = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (!entry?.isIntersecting || entry.intersectionRatio < 0.8) {
          return;
        }

        frameId = window.requestAnimationFrame(() => {
          if (focusField()) {
            observer.disconnect();
          }
        });
      },
      {
        threshold: [0.8],
      },
    );

    observer.observe(fieldWrap);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      observer.disconnect();
    };
  }, [question]);

  if (!question) {
    return null;
  }

  return (
    <motion.div
      className="step-frame"
      custom={direction}
      initial={{ opacity: 0, x: direction > 0 ? 56 : -56 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
      transition={animationTransition}
      onClick={(event) => {
        const target = event.target;
        if (
          !(target instanceof Element) ||
          target.closest("input, textarea, button, a, label")
        ) {
          return;
        }

        focusField();
      }}
    >
      <RichText
        as="h1"
        className="rich-copy"
        html={question.prompt}
        mode="inline"
      />
      <RichText
        className="question-helper rich-copy"
        html={question.helper}
        mode="block"
      />
      <div className="flow-input-wrap" ref={fieldWrapRef}>
        <QuestionField
          setFieldRef={(node) => {
            fieldRef.current = node;
          }}
          question={question}
          value={value}
          onChange={onChange}
          onAdvance={onAdvance}
          onArrowAdvance={onArrowAdvance}
          onRetreat={onRetreat}
        />
      </div>
    </motion.div>
  );
}
