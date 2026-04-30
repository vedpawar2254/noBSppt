export const PASSWORD_MIN_LENGTH = 8;

export function isValidEmail(email: string): boolean {
  // RFC 5322-ish — sufficient for server-side gate
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}

export interface RegistrationInput {
  email: string;
  password: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: { email?: string; password?: string };
}

export function validateRegistrationInput(input: RegistrationInput): ValidationResult {
  const errors: { email?: string; password?: string } = {};

  if (!input.email || !isValidEmail(input.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!input.password || !isValidPassword(input.password)) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
