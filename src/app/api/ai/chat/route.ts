import { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/api-utils';
import { aiService, AIChatMessage } from '@/server/ai/ai-service';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { messages = [] }: { messages: AIChatMessage[] } = body;

    const userContext = {
      role: user.role,
      userId: user.userId,
      name: user.name
    };

    const reply = await aiService.chat(messages, userContext);
    return Response.json({ message: reply });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to process AI chat message' }, { status: 500 });
  }
}
