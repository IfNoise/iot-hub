import { z } from 'zod';

/**
 * Схема для информации о пользователе
 */
export const AuthUserInfoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().optional(),
  role: z.string(),
  isEmailVerified: z.boolean(),
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
  sub: z.string().uuid().describe('ID пользователя'),
  email: z.string().email().describe('Email пользователя'),
  name: z.string().describe('Имя пользователя'),
  role: z.enum(['admin', 'user']).describe('Роль пользователя'),
  iat: z.number().describe('Время создания токена'),
  exp: z.number().describe('Время истечения токена'),
});

/**
 * Схема для OAuth провайдеров
 */
export const OAuthProviderSchema = z.enum(['google', 'github', 'facebook']);

/**
 * Схема для OAuth входа
 */
export const OAuthLoginSchema = z.object({
  provider: OAuthProviderSchema.describe('OAuth провайдер'),
  code: z.string().describe('Код авторизации от провайдера'),
  state: z.string().optional().describe('Состояние для защиты от CSRF'),
});

/**
 * Схема для двухфакторной аутентификации
 */
export const TwoFactorSchema = z.object({
  code: z
    .string()
    .length(6)
    .describe('6-значный код из приложения аутентификатора'),
});

/**
 * Схема для включения двухфакторной аутентификации
 */
export const EnableTwoFactorSchema = z.object({
  secret: z.string().describe('Секретный ключ для генерации QR кода'),
  code: z.string().length(6).describe('6-значный код для подтверждения'),
});

/**
 * Схема для сессии пользователя
 */
export const SessionSchema = z.object({
  id: z.string().uuid().describe('ID сессии'),
  userId: z.string().uuid().describe('ID пользователя'),
  deviceInfo: z.string().optional().describe('Информация об устройстве'),
  ipAddress: z.string().describe('IP адрес'),
  userAgent: z.string().optional().describe('User Agent браузера'),
  createdAt: z.date().describe('Время создания сессии'),
  lastActivity: z.date().describe('Время последней активности'),
  isActive: z.boolean().describe('Активна ли сессия'),
});

/**
 * Типы TypeScript
 */
export type Login = z.infer<typeof LoginSchema>;
export type Register = z.infer<typeof RegisterSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type ForgotPassword = z.infer<typeof ForgotPasswordSchema>;
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmail = z.infer<typeof VerifyEmailSchema>;
export type ResendVerification = z.infer<typeof ResendVerificationSchema>;
export type AccessToken = z.infer<typeof AccessTokenSchema>;
export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
export type TokenPayload = z.infer<typeof TokenPayloadSchema>;
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;
export type OAuthLogin = z.infer<typeof OAuthLoginSchema>;
export type TwoFactor = z.infer<typeof TwoFactorSchema>;
export type EnableTwoFactor = z.infer<typeof EnableTwoFactorSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type AuthUserInfo = z.infer<typeof AuthUserInfoSchema>;
export type AuthProfile = z.infer<typeof AuthProfileSchema>;
export type AdminResponse = z.infer<typeof AdminResponseSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
