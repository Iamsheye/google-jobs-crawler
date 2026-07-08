import { z } from 'zod';

export const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1).max(65535).default(3333),
  ),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_SECRET: z.string().min(1),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  FRONTEND_URL: z.url(),
  ALLOWED_ORIGINS: z.string().optional(),
  ENABLE_SWAGGER: z.string().optional(),
});

export type EnvironmentVariables = z.infer<typeof environmentSchema>;

export const validationSchema = {
  validate(config: unknown): { error?: Error; value: unknown } {
    const result = environmentSchema.safeParse(config);

    if (!result.success) {
      const message = result.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return { error: new Error(message), value: config };
    }

    return { error: undefined, value: result.data };
  },
};
