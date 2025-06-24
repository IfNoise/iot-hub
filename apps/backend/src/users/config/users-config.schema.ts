import { z } from 'zod';

export const usersConfigSchema = z.object({
  // User management settings
  userSessionTimeoutMs: z.coerce
    .number()
    .min(60000) // minimum 1 minute
    .default(3600000) // 1 hour
    .describe('User session timeout in milliseconds'),
  
  maxActiveSessionsPerUser: z.coerce
    .number()
    .min(1)
    .default(5)
    .describe('Maximum active sessions per user'),
  
  // User registration settings
  enableUserRegistration: z.coerce
    .boolean()
    .default(true)
    .describe('Enable user self-registration'),
  
  requireEmailVerification: z.coerce
    .boolean()
    .default(true)
    .describe('Require email verification for new users'),
  
  // User data settings
  userProfileImageMaxSizeBytes: z.coerce
    .number()
    .min(1024) // minimum 1KB
    .default(2097152) // 2MB
    .describe('Maximum user profile image size in bytes'),
  
  // Password policy (when not using external auth)
  passwordMinLength: z.coerce
    .number()
    .min(6)
    .default(8)
    .describe('Minimum password length'),
  
  passwordRequireSpecialChars: z.coerce
    .boolean()
    .default(true)
    .describe('Require special characters in password'),
});

export type UsersConfig = z.infer<typeof usersConfigSchema>;
