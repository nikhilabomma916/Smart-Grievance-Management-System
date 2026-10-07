import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { hash } from 'bcryptjs';
import { AccountConflictError, createCitizenAccount } from '@/server/auth-accounts';
import { createToken } from '@/server/auth';
import { isDatabaseConfigured } from '@/server/db';
import { citizenRegistrationSchema } from '@/server/validation/auth';

function getRegistrationFailureMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return 'Registration could not be completed. Please try again.';
  }

  const code = error.code;
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' || code === 'ECONNRESET') {
    return 'Cannot reach the database. Use the Supabase Session pooler connection string if your network does not support IPv6, then restart the app.';
  }

  if (code === '42P01' || code === '42703') {
    return 'The database schema is missing or outdated. Run database/migrations/001_auth.sql in the Supabase SQL Editor.';
  }

  return 'Registration could not be completed. Please try again.';
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = citizenRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      const fields = parsed.error.issues.reduce<Record<string, string>>((result, issue) => {
        const field = issue.path.join('.');
        if (!result[field]) result[field] = issue.message;
        return result;
      }, {});
      return Response.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', fields },
      }, { status: 400 });
    }

    if (!isDatabaseConfigured()) {
      return Response.json({ error: 'Registration is unavailable until the database is configured.' }, { status: 503 });
    }

    const passwordHash = await hash(parsed.data.password, 10);
    const newUser = await createCitizenAccount(parsed.data, passwordHash);

    const payload = { userId: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role };
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
      success: true,
      user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AccountConflictError) {
      return Response.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
    console.error('Citizen registration failed:', error);
    return Response.json({ error: getRegistrationFailureMessage(error) }, { status: 500 });
  }
}