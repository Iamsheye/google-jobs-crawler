# Local Setup Guide

This project is a NestJS REST API for managing job alerts and storing job listings scraped from Google search results. It uses Prisma with PostgreSQL, JWT authentication, Google OAuth, SMTP email delivery, and Playwright Chromium for scraping.

## Prerequisites

- Node.js 22.x
- Yarn 1.x
- PostgreSQL 12 or newer
- Git

Check your local versions:

```sh
node --version
yarn --version
psql --version
```

The project declares `node: 22.x` in `package.json`. If you use `nvm`, install and use a Node 22 release before installing dependencies.

## 1. Clone And Install

```sh
git clone <repository-url>
cd google-jobs-crawler
yarn install
```

## 2. Create A Local Database

Create a PostgreSQL database for local development. One common local setup is:

```sh
createdb google_jobs_crawler
```

If your local PostgreSQL user or password differs, adjust the `DATABASE_URL` in the next step.

## 3. Configure Environment Variables

Create a `.env` file in the project root:

```sh
touch .env
```

Use this as a local starting point:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/google_jobs_crawler?schema=public"
JWT_SECRET="local-access-token-secret"
JWT_REFRESH_SECRET="local-refresh-token-secret"
PORT=3333

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_SECRET="your-google-client-secret"

SMTP_USER="your-smtp-user"
SMTP_PASSWORD="your-smtp-password"
FRONTEND_URL="http://localhost:3000"
```

Variable notes:

- `DATABASE_URL` is required by Prisma.
- `JWT_SECRET` and `JWT_REFRESH_SECRET` are required for authentication.
- `PORT` defaults to `3333` if omitted.
- `GOOGLE_CLIENT_ID` and `GOOGLE_SECRET` are needed for Google login.
- `SMTP_USER` and `SMTP_PASSWORD` are used by Gmail SMTP for verification and password reset emails.
- `FRONTEND_URL` is used to build verification and password reset links.

For basic local API bootstrapping, you can use placeholder Google and SMTP values. Google sign-in and email delivery will only work when real credentials are configured.

## 4. Run Prisma Migrations

Apply the existing migrations to your local database and generate the Prisma client:

```sh
yarn prisma migrate dev
```

If you only need to regenerate the Prisma client later:

```sh
yarn prisma generate
```

## 5. Install Playwright Chromium

The scraper launches Chromium through `playwright-chromium`. Install the browser binary locally:

```sh
yarn run playwright install chromium
```

This is especially important before running scrape jobs or any code path that launches the browser.

## 6. Start The API

Run the NestJS development server:

```sh
yarn run start:dev
```

By default, the API runs at:

```text
http://localhost:3333
```

Swagger documentation is available at:

```text
http://localhost:3333/api
```

## Useful Commands

```sh
yarn run build        # Compile the NestJS app into dist/
yarn run start        # Run the compiled app from dist/main
yarn run start:dev    # Start NestJS in watch mode
yarn run lint         # Run ESLint with auto-fix
yarn run format       # Format source and test files
yarn run test         # Run unit tests
yarn run test:e2e     # Run e2e tests
```

## Local Development Notes

- The scheduled job alert scraper runs every day at 2:00 AM in the `Africa/Lagos` timezone.
- Password reset token cleanup runs every day at midnight.
- The scraper performs Google searches and stores jobs for existing job alerts.
- Email sending errors are logged, so invalid SMTP credentials may not stop the API from starting, but verification and reset emails will fail.
- CORS is enabled globally in `src/main.ts`.

## Troubleshooting

### Prisma cannot connect to the database

Confirm PostgreSQL is running and that `DATABASE_URL` matches your local username, password, host, port, and database name.

```sh
psql "postgresql://postgres:postgres@localhost:5432/google_jobs_crawler"
```

### Migrations fail because the database does not exist

Create it first:

```sh
createdb google_jobs_crawler
```

Then rerun:

```sh
yarn prisma migrate dev
```

### Playwright cannot find Chromium

Install the browser binary:

```sh
yarn run playwright install chromium
```

### Port 3333 is already in use

Set a different `PORT` in `.env`, for example:

```env
PORT=3334
```

Then restart the dev server.

### Google login fails locally

Check that `GOOGLE_CLIENT_ID` and `GOOGLE_SECRET` are valid credentials from Google Cloud Console. Also confirm that the OAuth redirect URI configured in Google matches the API route used by this app.
