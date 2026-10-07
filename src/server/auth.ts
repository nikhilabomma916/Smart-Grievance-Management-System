import { SignJWT, jwtVerify } from 'jose';
import { compareSync } from 'bcryptjs';

const DEVELOPMENT_JWT_SECRET = 'civicresolve-local-development-secret-only';

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be configured in production.');
  }
  const value = secret || DEVELOPMENT_JWT_SECRET;
  if (value.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters.');
  return new TextEncoder().encode(value);
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: 'citizen' | 'officer' | 'department_admin' | 'admin';
  departmentId?: string;
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyPassword(password: string, hash: string): boolean {
  return compareSync(password, hash);
}

export async function getSession(cookieValue?: string): Promise<JWTPayload | null> {
  if (!cookieValue) return null;
  return verifyToken(cookieValue);
}
