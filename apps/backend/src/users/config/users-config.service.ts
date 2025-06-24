import { Injectable } from '@nestjs/common';
import { usersConfigSchema, UsersConfig } from './users-config.schema';

@Injectable()
export class UsersConfigService {
  private readonly config: UsersConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = usersConfigSchema.parse({
      userSessionTimeoutMs: env.USER_SESSION_TIMEOUT_MS,
      maxActiveSessionsPerUser: env.MAX_ACTIVE_SESSIONS_PER_USER,
      enableUserRegistration: env.ENABLE_USER_REGISTRATION,
      requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
      userProfileImageMaxSizeBytes: env.USER_PROFILE_IMAGE_MAX_SIZE_BYTES,
      passwordMinLength: env.PASSWORD_MIN_LENGTH,
      passwordRequireSpecialChars: env.PASSWORD_REQUIRE_SPECIAL_CHARS,
    });
  }

  get<T extends keyof UsersConfig>(key: T): UsersConfig[T] {
    return this.config[key];
  }

  getAll(): UsersConfig {
    return this.config;
  }

  // Convenience methods
  getSessionConfig() {
    return {
      timeout: this.config.userSessionTimeoutMs,
      maxActiveSessions: this.config.maxActiveSessionsPerUser,
    };
  }

  getRegistrationConfig() {
    return {
      enableRegistration: this.config.enableUserRegistration,
      requireEmailVerification: this.config.requireEmailVerification,
    };
  }

  getProfileConfig() {
    return {
      maxImageSize: this.config.userProfileImageMaxSizeBytes,
    };
  }

  getPasswordPolicy() {
    return {
      minLength: this.config.passwordMinLength,
      requireSpecialChars: this.config.passwordRequireSpecialChars,
    };
  }

  // Helper methods
  isRegistrationEnabled(): boolean {
    return this.config.enableUserRegistration;
  }

  isEmailVerificationRequired(): boolean {
    return this.config.requireEmailVerification;
  }
}
