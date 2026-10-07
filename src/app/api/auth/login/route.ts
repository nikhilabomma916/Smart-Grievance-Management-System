import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { findAuthAccountByEmail, updateLastLogin } from '@/server/auth-accounts';
import { verifyPassword, createToken } from '@/server/auth';
import { isDatabaseConfigured } from '@/server/db';
import { loginSchema } from '@/server/validation/auth';

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const fields = parsed.error.issues.reduce<Record<string, string>>((result, issue) => {
        const field = issue.path.join('.');
        if (!result[field]) result[field] = issue.message;
        return result;
      }, {});
      return Response.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please check your login details.', fields },
      }, { status: 400 });
    }

    if (!isDatabaseConfigured()) {
      return Response.json({ error: 'Login is unavailable until the database is configured.' }, { status: 503 });
    }

    const user = await findAuthAccountByEmail(parsed.data.email);
    if (!user || user.accountStatus !== 'active' || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await updateLastLogin(user.id);
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      ...(user.departmentId ? { departmentId: user.departmentId } : {}),
    };
    const token = await createToken(payload);
    
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ...(user.departmentId ? { departmentId: user.departmentId } : {}),
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}