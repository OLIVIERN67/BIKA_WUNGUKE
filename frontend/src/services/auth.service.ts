import { api, unwrap } from './api';
import { AuthResponse, LoginResult, RegisterResponse, User } from '../types';

export interface RegisterPayload {
  full_name: string;
  phone: string;
  email: string;
  password: string;
  confirm_password?: string;
  business_name?: string;
  business_type?: string;
  business_location?: string;
  business_description?: string;
  currency?: string;
  locale?: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  email?: string;
  business_name?: string;
  business_type?: string;
  business_location?: string;
  business_description?: string;
  currency?: string;
  locale?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return unwrap(api.post('/auth/register', payload));
}

export function login(payload: LoginPayload): Promise<LoginResult> {
  return unwrap(api.post('/auth/login', payload));
}

export interface VerifyEmailPayload {
  email?: string;
  phone?: string;
  otp: string;
}

export function verifyEmail(payload: VerifyEmailPayload): Promise<AuthResponse> {
  return unwrap(api.post('/auth/verify-email', payload));
}

export interface ResendOtpPayload {
  email?: string;
  phone?: string;
}

export function resendOtp(payload: ResendOtpPayload): Promise<null> {
  return unwrap(api.post('/auth/resend-otp', payload));
}

export function forgotPassword(email: string): Promise<null> {
  return unwrap(api.post('/auth/forgot-password', { email }));
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export function resetPassword(payload: ResetPasswordPayload): Promise<null> {
  return unwrap(api.post('/auth/reset-password', payload));
}

export function validateResetToken(token: string): Promise<{ valid: boolean }> {
  return unwrap(api.post('/auth/validate-reset-token', { token }));
}

export function getMe(): Promise<User> {
  return unwrap(api.get('/auth/me'));
}

export function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  return unwrap(api.put('/auth/me', payload));
}

export function changePassword(payload: ChangePasswordPayload): Promise<null> {
  return unwrap(api.put('/auth/change-password', payload));
}
