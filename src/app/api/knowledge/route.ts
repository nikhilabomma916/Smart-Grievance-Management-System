import { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/api-utils';
import { store } from '@/server/data/store';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  return Response.json(store.knowledgeDocuments);
}
