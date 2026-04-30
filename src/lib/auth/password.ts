import bcrypt from "bcryptjs";

// BCRYPT_ROUNDS env var lets CI use 4 rounds (fast) while prod uses 12 (secure).
// Never use fewer than 4 rounds, even in tests.
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10);

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
