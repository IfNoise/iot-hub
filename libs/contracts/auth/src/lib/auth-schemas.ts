import { z } from 'zod';
import { UserRoleEnum } from '@iot-hub/users';

/**
 * Схема для информации о пользователе
 */
export const AuthUserInfoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().optional(),
  roles: z.array(UserRoleEnum).default([]),
});

/**
 * Схема для расширенного профиля пользователя
 */
export const AuthProfileSchema = z.object({
  message: z.string(),
  data: z.record(z.any()), // Расширенная информация может быть любой
});

/**
 * Схема для админского ответа
 */
export const AdminResponseSchema = z.object({
  message: z.string(),
  admin: z.string(),
});

/**
 * Схема для пользовательского ответа
 */
export const UserResponseSchema = z.object({
  message: z.string(),
  user: z.object({
    name: z.string(),
    role: z.string(),
  }),
});
/**
 * Схема для входа в систему
 */
export const LoginSchema = z.object({
  email: z.string().email().describe('Email пользователя'),
  password: z.string().min(8).describe('Пароль пользователя'),
});

/**
 * Схема для регистрации
 */
export const RegisterSchema = z
  .object({
    email: z.string().email().describe('Email пользователя'),
    password: z.string().min(8).describe('Пароль пользователя'),
    name: z.string().min(2).max(100).describe('Имя пользователя'),
    confirmPassword: z.string().min(8).describe('Подтверждение пароля'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

/**
 * Схема для смены пароля
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).describe('Текущий пароль'),
    newPassword: z.string().min(8).describe('Новый пароль'),
    confirmPassword: z.string().min(8).describe('Подтверждение нового пароля'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

/**
 * Схема для восстановления пароля
 */
export const ForgotPasswordSchema = z.object({
  email: z.string().email().describe('Email пользователя'),
});

/**
 * Схема для сброса пароля
 */
export const ResetPasswordSchema = z
  .object({
    email: z.string().email().describe('Email пользователя'),
    token: z.string().describe('Токен для сброса пароля'),
    newPassword: z.string().min(8).describe('Новый пароль'),
    confirmPassword: z.string().min(8).describe('Подтверждение нового пароля'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

/**
 * Схема для подтверждения email
 */
export const VerifyEmailSchema = z.object({
  email: z.string().email().describe('Email пользователя'),
  token: z.string().describe('Токен подтверждения'),
});

/**
 * Схема для запроса повторного подтверждения email
 */
export const ResendVerificationSchema = z.object({
  email: z.string().email().describe('Email пользователя'),
});

/**
 * Схема для токена доступа
 */
export const AccessTokenSchema = z.object({
  accessToken: z.string().describe('JWT токен доступа'),
  refreshToken: z.string().describe('JWT токен обновления'),
  expiresIn: z.number().describe('Время жизни токена в секундах'),
  tokenType: z.string().default('Bearer').describe('Тип токена'),
});

/**
 * Схема для обновления токена
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().describe('JWT токен обновления'),
});

/**
 * Схема для информации о пользователе из токена
 */
export const TokenPayloadSchema = z.object({
  exp: z.number().describe('Время истечения токена'),
  iat: z.number().describe('Время создания токена'),
  jti: z.string().describe('JWT ID'),
  iss: z.string().describe('Issuer'),
  aud: z.string().describe('Audience'),
  sub: z.string().uuid().describe('ID пользователя'),
  typ: z.string().optional().describe('Тип токена'),
  azp: z.string().optional().describe('Authorized party'),
  sid: z.string().optional().describe('Session ID'),
  realm_access: z
    .object({
      roles: z.array(z.string()).describe('Роли в realm'),
    })
    .optional(),
  scope: z.string().optional().describe('Scope'),
  role: z.array(z.string()).optional().describe('Роли пользователя'),
  organization: z
    .record(
      z.object({
        id: z.string().uuid().describe('ID организации'),
      })
    )
    .optional()
    .describe('Организации пользователя'),
  groups: z.array(z.string()).optional().describe('Группы пользователя'),
  preferred_username: z.string().optional().describe('Имя пользователя'),
  type: z.string().optional().describe('Тип пользователя'),
  email: z.string().email().describe('Email пользователя'),
});

/**
 * Типы TypeScript
 */
export type AuthUserInfo = z.infer<typeof AuthUserInfoSchema>;
export type AuthProfile = z.infer<typeof AuthProfileSchema>;
export type AdminResponse = z.infer<typeof AdminResponseSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type LoginData = z.infer<typeof LoginSchema>;
export type RegisterData = z.infer<typeof RegisterSchema>;
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;
export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmailData = z.infer<typeof VerifyEmailSchema>;
export type ResendVerificationData = z.infer<typeof ResendVerificationSchema>;
export type AccessToken = z.infer<typeof AccessTokenSchema>;
export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
export type TokenPayload = z.infer<typeof TokenPayloadSchema>;
