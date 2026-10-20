import { z } from 'zod';

const rwPhone = /^(\+?25)?0?7[2-9]\d{7}$/;

/**
 * Password policy, applied consistently to registration, password change
 * and password reset. Passwords are never trimmed or otherwise modified.
 */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

const passwordField = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`);

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(3, 'Full name must be at least 3 characters').max(120),
    phone: z
      .string()
      .trim()
      .regex(rwPhone, 'Enter a valid Rwandan phone number (e.g. 0788123456)'),
    email: z.string().trim().email('Enter a valid email').max(160),
    password: passwordField,
    confirm_password: z.string().min(1, 'Please confirm your password'),
    business_name: z.string().trim().max(160).optional().or(z.literal('')),
    business_type: z.string().trim().max(120).optional().or(z.literal('')),
    business_location: z.string().trim().max(160).optional().or(z.literal('')),
    business_description: z.string().trim().max(255).optional().or(z.literal('')),
    currency: z.string().trim().length(3).default('RWF'),
    locale: z.string().trim().max(10).default('rw'),
  })
  .refine(
    (data) => data.password === data.confirm_password,
    { message: 'Passwords do not match', path: ['confirm_password'] },
  );

export const loginSchema = z.object({
  phone: z.string().trim().min(1, 'Phone is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Identifies the account for OTP actions. The caller may supply the email
 * address, or the phone number they signed in with, so the frontend never has
 * to ask the user for an email they already registered with.
 */
const otpIdentityFields = {
  email: z.string().trim().email('Enter a valid email address').max(160).optional(),
  phone: z
    .string()
    .trim()
    .regex(rwPhone, 'Enter a valid Rwandan phone number (e.g. 0788123456)')
    .optional(),
};

export const verifyEmailSchema = z
  .object({
    ...otpIdentityFields,
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit code'),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Provide the email or phone number on the account',
    path: ['email'],
  });

export const resendOtpSchema = z
  .object({ ...otpIdentityFields })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Provide the email or phone number on the account',
    path: ['email'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(160),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, 'Reset token is required').max(512),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const validateResetTokenSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required').max(512),
});

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(3).max(120).optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  business_name: z.string().trim().max(160).optional().or(z.literal('')),
  business_type: z.string().trim().max(120).optional().or(z.literal('')),
  business_location: z.string().trim().max(160).optional().or(z.literal('')),
  business_description: z.string().trim().max(255).optional().or(z.literal('')),
  currency: z.string().trim().length(3).optional(),
  locale: z.string().trim().max(10).optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: passwordField,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ValidateResetTokenInput = z.infer<typeof validateResetTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
