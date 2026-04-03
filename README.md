# Ente Jobs

Minimal React job board for `jobs.ente.com`, with Cloudflare Workers serving the app and D1 storing both job definitions and application submissions.

## Stack

- React + Vite for the front-end
- Cloudflare Worker API routes for jobs and applications
- Cloudflare D1 for job definitions and submissions
- A schema-driven multi-step form so new roles can be added as data

## Local setup

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Create a D1 database in your Cloudflare account:

   ```bash
   yarn wrangler d1 create ente-jobs
   ```

3. Copy the returned `database_id` into [wrangler.jsonc](/Users/vishnu/work/jobs/wrangler.jsonc).

4. Apply the schema migration locally:

   ```bash
   yarn db:local
   ```

5. Start the app:

   ```bash
   yarn dev
   ```

## Production deploys with GitHub Actions

This repo includes [`.github/workflows/deploy.yml`](/Users/vishnu/work/jobs/.github/workflows/deploy.yml), which:

- installs dependencies
- builds the app
- applies remote D1 migrations
- deploys the Worker to Cloudflare on every push to `main`

One-time setup:

1. Create the production D1 database:

   ```bash
   npx wrangler d1 create ente-jobs
   ```

2. Copy the returned `database_id` into [wrangler.jsonc](/Users/vishnu/work/jobs/wrangler.jsonc).

3. In GitHub repository settings, add these Actions secrets:

   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
   - `ADMIN_API_KEY`

4. Push to `main`, or run the workflow manually from the Actions tab.

The Worker is configured to deploy on the custom domain `jobs.ente.com`.

## Admin

Set an admin key for local development:

```bash
cp .dev.vars.example .dev.vars
```

Then edit `.dev.vars`, set `ADMIN_API_KEY`, restart `yarn dev`, and open `/admin`.

The admin area lets you:

- view all current postings
- edit posting copy and question schemas
- browse submissions by role

## Data model

`jobs` stores the card copy, intro copy, and question schema.

`applications` stores `job_slug` plus a JSON object of the submitted answers.

That means a new role can be added by inserting a new row into `jobs` with a different `questions_json` payload, or by creating one from `/admin`.

Fresh databases start empty after migrations are applied.

## Adding roles

Create a new migration that inserts a job row into `jobs`, or use the admin UI. The front-end will automatically show the new card and render the new question flow.

Question schema shape:

```json
[
  {
    "id": "most_impressive_thing",
    "prompt": "What is the most impressive thing you have built?",
    "helper": "Explain what made it difficult and why it mattered.",
    "placeholder": "Tell us the story.",
    "type": "textarea",
    "required": true
  }
]
```

Supported field types today: `textarea`, `url`, `text`, `currency`.
