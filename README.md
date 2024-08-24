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

## Running Locally

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


## API Documentation

The full API documentation is available via Swagger UI at:

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