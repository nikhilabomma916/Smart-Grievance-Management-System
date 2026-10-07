import { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/api-utils';
import { store } from '@/server/data/store';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const total = store.auditLogs.length;
  const start = (page - 1) * limit;
  const paginated = store.auditLogs.slice().reverse().slice(start, start + limit);

  return Response.json({ data: paginated, meta: { total, page, limit } });
}