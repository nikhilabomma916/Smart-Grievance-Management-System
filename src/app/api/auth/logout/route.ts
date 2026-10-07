import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  return Response.json({ success: true });
}