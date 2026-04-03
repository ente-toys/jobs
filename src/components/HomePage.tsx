import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getJobs } from "../lib/api";
import { getRoleArtwork } from "../lib/roleArtwork";
import type { JobCard } from "../lib/types";
import { RichText } from "./RichText";
import { SiteNav } from "./SiteNav";

interface HomePageState {
  jobs: JobCard[];
  loading: boolean;
  error: string | null;
}

export function HomePage() {
  const [state, setState] = useState<HomePageState>({
    jobs: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const abortController = new AbortController();

    void (async () => {
      try {
        const jobs = await getJobs();
        if (!abortController.signal.aborted) {
          setState({ jobs, loading: false, error: null });
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          setState({
            jobs: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "We could not load the jobs right now.",
          });
        }
      }
    })();

    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <main className="page-shell">
      <SiteNav />

      <section className="hero-section">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1>Help us craft quality</h1>
          <p>
            Ente builds beautiful,{" "}
            <a
              className="hero-inline-link"
              href="https://github.com/ente-io/ente"
              rel="noreferrer"
              target="_blank"
            >
              open-source
            </a>{" "}
            software.
            <br />
            We care about ownership, longevity, and craft that makes people feel
            at home.
          </p>
          <div className="hero-video-frame">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              src="https://www.youtube.com/embed/ioscMJNIA6I"
              title="Jobs at Ente"
            />
          </div>
        </motion.div>
      </section>

      <section className="jobs-section">
        <div className="section-heading">
          <h2>Open roles</h2>
        </div>

        {state.loading ? <LoadingJobs /> : null}
        {state.error ? <ErrorState message={state.error} /> : null}
        {!state.loading && !state.error ? <JobGrid jobs={state.jobs} /> : null}
      </section>
    </main>
  );
}

function JobGrid({ jobs }: { jobs: JobCard[] }) {
  if (jobs.length === 0) {
    return (
      <div className="empty-state">
        <h3>No published roles yet.</h3>
        <p>
          Add a job row in D1 and the board will render it automatically. The UI
          is already wired for more than one role.
        </p>
      </div>
    );
  }

  return (
    <div className="jobs-grid">
      {jobs.map((job, index) => {
        const artwork = getRoleArtwork(job.team);

        return (
          <motion.div
            key={job.slug}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              delay: 0.15 + index * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <article className="job-card">
              <Link
                aria-label={`Open ${job.title}`}
                className="job-card-surface-link"
                to={`/${job.slug}`}
              />
              <div className="job-card-content">
                <div className="job-card-meta">
                  <span className="job-card-team">{job.team}</span>
                  <span aria-hidden="true" className="job-card-dot" />
                </div>
                {artwork ? (
                  <div className="job-card-artwork" aria-hidden="true">
                    <img alt="" src={artwork} />
                  </div>
                ) : null}
                <div className="job-card-body">
                  <h3>{job.title}</h3>
                  <RichText
                    className="job-card-description rich-copy"
                    html={job.cardDescription}
                    mode="block"
                  />
                </div>
              </div>
            </article>
          </motion.div>
        );
      })}
    </div>
  );
}

function LoadingJobs() {
  return (
    <div className="jobs-grid">
      <div className="job-card skeleton-card" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="empty-state error-state">
      <h3>The board is up, but the data layer is not ready yet.</h3>
      <p>{message}</p>
    </div>
  );
}
