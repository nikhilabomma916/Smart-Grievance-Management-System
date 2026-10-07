import { cookies } from 'next/headers';
import { verifyToken, JWTPayload } from '@/server/auth';
import { getDatabasePool, isDatabaseConfigured } from '@/server/db';

export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || !isDatabaseConfigured()) return payload;

  const result = await getDatabasePool().query<{
    role: JWTPayload['role'];
    department_id: string | null;
    account_status: 'active' | 'inactive' | 'suspended';
  }>(
    'SELECT role, department_id, account_status FROM users WHERE id = $1 LIMIT 1',
    [payload.userId],
  );
  const account = result.rows[0];
  if (!account || account.account_status !== 'active') return null;
  const identity = { ...payload };
  delete identity.departmentId;
  return {
    ...identity,
    role: account.role,
    ...(account.department_id ? { departmentId: account.department_id } : {}),
  };
}
