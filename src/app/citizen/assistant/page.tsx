'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, Send, Bot, User, Sparkles, ArrowRight,
  Shield, CheckCircle, Clock, MapPin, Zap, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { AIChatMessage } from '@/server/ai/ai-service';

export default function CitizenAssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    { label: 'Water supply outage in Indiranagar Ward 12', text: 'I want to report a total water supply outage for the past 2 days in Indiranagar Ward 12.' },
    { label: 'Dangerous live wire fallen on footpath', text: 'Emergency: A high voltage electric cable has snapped and fallen near the children park on 5th main road.' },
    { label: 'Overflowing garbage bin in Whitefield', text: 'Garbage collection has failed for 5 days near Whitefield main market and waste is overflowing.' },
    { label: 'What are the official city SLAs?', text: 'Explain the municipal resolution SLAs for critical hazards versus standard complaints.' }
  ];

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Namaste! I am **Atharva AI Civic Mitra** — your intelligent municipal assistant.\n\nI can help you:\n1. **Draft grievances interactively** and auto-detect category & urgency\n2. **Track status** of ongoing complaints\n3. **Explain municipal SLAs** and escalation processes\n4. **Direct emergency hazard reporting**\n\nWhat civic issue would you like to resolve today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const content = textToSend || inputValue;
    if (!content.trim() || loading) return;

    const userMessage: AIChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputValue('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });

      let payload: { message?: AIChatMessage; error?: string } | null = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const errorMessage = payload?.error || 'The assistant is temporarily unavailable.';
        throw new Error(errorMessage);
      }

      if (!payload?.message || typeof payload.message.content !== 'string') {
        throw new Error('The assistant returned an empty response.');
      }

      const assistantReply: AIChatMessage = {
        ...payload!.message,
        role: payload!.message.role ?? 'assistant',
        content: payload!.message.content ?? '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantReply]);
    } catch (error: unknown) {
      const message = error instanceof Error && error.message ? error.message : 'Sorry, I encountered a temporary connection issue. Please try again.';
      const fallbackMessage: AIChatMessage = {
        role: 'assistant',
        content: message === 'Unauthorized'
          ? 'Please sign in to use the assistant.'
          : message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action: any) => {
    if (action.type === 'DRAFT_GRIEVANCE') {
      const params = new URLSearchParams();
      if (action.payload?.categoryId) params.set('category', action.payload.categoryId);
      if (action.payload?.title) params.set('title', action.payload.title);
      if (action.payload?.description) params.set('desc', action.payload.description);
      router.push(`/citizen/submit?${params.toString()}`);
    } else if (action.type === 'CHECK_STATUS') {
      if (action.payload?.grievanceId) {
        router.push(`/citizen/grievances/${action.payload.grievanceId}`);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Brain className="size-7 text-indigo-600" />
            AI Civic Mitra Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Chat with AI to draft complaints, get instant civic advice, and track municipal services.
          </p>
        </div>
        <Button
          onClick={() => router.push('/citizen/submit')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
        >
          <Sparkles className="size-4" /> Direct Photo Submission
        </Button>
      </div>

      {/* Main Chat Interface */}
      <Card className="h-[620px] flex flex-col overflow-hidden shadow-lg border-indigo-100 dark:border-slate-800">
        <CardHeader className="py-3.5 px-6 border-b bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                <Bot className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">Atharva AI Civic Mitra</h3>
                <p className="text-[11px] text-white/80 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Natural Language Civic Intelligence
                </p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-none text-xs">
              Online 24/7
            </Badge>
          </div>
        </CardHeader>

        {/* Message Log */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 mt-1">
                  <Bot className="size-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-700'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.suggestedAction && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      size="sm"
                      onClick={() => handleActionClick(m.suggestedAction)}
                      className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-sm"
                    >
                      <Sparkles className="size-3.5" />
                      {m.suggestedAction.label}
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                )}

                {m.timestamp && (
                  <p className={`mt-1.5 text-[10px] text-right ${m.role === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                    {m.timestamp}
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-500">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Bot className="size-4 animate-spin" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5">
                <span className="size-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
                <span className="size-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                <span className="size-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-6 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-wrap gap-2">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.text)}
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-2xs"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <Input
              placeholder="Describe what happened or ask a question..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 h-11 text-sm rounded-xl"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold"
            >
              <span>Send</span>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
