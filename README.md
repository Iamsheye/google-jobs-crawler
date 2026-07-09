## Description

This project is a RESTful API for managing and retrieving job listings crawled from Google.

## Technologies Used

- [NestJS](https://nestjs.com/)
- [Prisma](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Playwright](https://playwright.dev/)
- [Google Auth](https://www.npmjs.com/package/google-auth-library)
- [Passport](https://www.npmjs.com/package/passport)
- [Passport Google](https://www.npmjs.com/package/passport-google-oauth20)
- [Passport JWT](https://www.npmjs.com/package/passport-jwt)

## Authentication

The API supports the following authentication methods:

- JWT (JSON Web Token) authentication
- Google OAuth2 authentication

## Environment Variables

Create a `.env` file in the root directory of the project and add the following variables:

- DATABASE_URL
- JWT_SECRET
- JWT_REFRESH_SECRET
- PORT
- GOOGLE_CLIENT_ID
- GOOGLE_SECRET
- NODE_ENV
- ALLOWED_ORIGINS
- ENABLE_SWAGGER

### Security-related variables

- `NODE_ENV`: Set to `production` to enable production hardening (e.g., restricted CORS, disabled Swagger).
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins in production. When unset and not in production, all origins are allowed for local development.
- `ENABLE_SWAGGER`: Set to `true` to enable Swagger UI even when `NODE_ENV=production`. Swagger is enabled by default in non-production environments.

## Running Locally

For a fuller setup walkthrough, see [LOCAL_SETUP.md](./LOCAL_SETUP.md).

To run this project locally, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/your-username/google-crawler-jobs-api.git
   cd google-crawler-jobs-api
   ```

2. Install dependencies:
   ```
   yarn install
   ```

3. Set up your environment variables (see .env.example below)

4. Set up your database:
   ```
   npx prisma migrate dev
   ```

5. Start the development server:
   ```
   yarn run start:dev
   ```

The API should now be running on port 3333 or the port specified in your .env file.

## Running with Docker

The project includes a multi-stage `Dockerfile` and a `docker-compose.yml` for local containerized development and deployment. Docker Compose orchestrates the NestJS application and a PostgreSQL database.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick start

1. Create a `.env` file in the project root and configure the required variables (see [Environment Variables](#environment-variables)). At minimum, set:

   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_SECRET`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
   - `FRONTEND_URL`

   Database credentials default to `postgres`/`postgres` with a database named `google_jobs_crawler`, but you can override them via `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

2. Build and start the containers:

   ```bash
   docker compose up --build
   ```

3. Once the containers are healthy, the API is available at:

   ```
   http://localhost:3333
   ```

4. Stop the containers:

   ```bash
   docker compose down
   ```

   To remove the database volume as well, run:

   ```bash
   docker compose down -v
   ```

### Services

- `db`: PostgreSQL 16 (Alpine) with a persistent volume and a health check.
- `app`: The NestJS application built from the `Dockerfile`. It waits for the database to become healthy before starting and automatically runs Prisma migrations via `scripts/start-production.sh`.

### Dockerfile overview

The Dockerfile uses a two-stage build based on Debian (`node:22-bookworm-slim`):

1. **Builder stage**: installs dependencies, generates the Prisma client, and builds the NestJS application. Browser downloads are skipped here to keep the build layer lean.
2. **Runtime stage**: copies the built artifacts, Prisma schema, and a startup script that runs `prisma migrate deploy` before starting the application. It also installs Chromium and the Playwright system dependencies so the daily scraper works out of the box.

### Health check

A health check endpoint is exposed at `/health` and verifies connectivity to the database via Prisma.

## API Documentation

Swagger UI is available at `/api` by default in non-production environments. In production (`NODE_ENV=production`) it is disabled unless `ENABLE_SWAGGER=true` is set. The previously hosted docs are available here for reference:

[https://google-crawler-jobs-d05ea644aa3f.herokuapp.com/api](https://google-crawler-jobs-d05ea644aa3f.herokuapp.com/api)

### Key Endpoints

1. Authentication

   - POST /auth/signin
   - POST /auth/signup
   - GET /auth/google
   - POST /auth/refresh-token

2. User

   - GET /user/me
   - PATCH /user/password

3. Jobs & Job Alerts

   - GET /job-alert
   - POST /job-alert
   - GET /job-alert/{id}/jobs
   - PATCH /job-alert/{id}
   - DELETE /job-alert/{id}

## TODO

- [ ] Use parallel processing to scrape Google, we're currently using sequential processing which can be slow but uses fewer resources.
