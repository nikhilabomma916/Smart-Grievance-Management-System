'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Send, X, Bot, User, Brain, AlertCircle,
  Clock, Shield, ArrowRight, CornerDownLeft, RefreshCw, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AIChatMessage } from '@/server/ai/ai-service';
import { stripDecorativeSymbols } from '@/lib/text';

interface AIChatWidgetProps {
  portalRole?: 'citizen' | 'officer' | 'admin';
  userName?: string;
  className?: string;
  defaultOpen?: boolean;
}

export function AIChatWidget({ portalRole = 'citizen', userName, className, defaultOpen = false }: AIChatWidgetProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const initialPrompts = portalRole === 'citizen' ? [
    { label: 'Water supply concern in my ward', text: 'I want to report a water supply outage in my area.' },
    { label: 'Broken electrical hazard', text: 'There is a dangerous exposed electrical cable on the road.' },
    { label: 'Overflowing waste collection issue', text: 'The waste bin has not been cleared for more than a week.' },
    { label: 'SLA status for my grievance', text: 'What is the current SLA deadline for resolving my grievance?' }
  ] : [
    { label: 'System overview', text: 'Give me a summary of open grievances and active service bottlenecks.' },
    { label: 'Ward 12 water service review', text: 'Analyze recent water-related grievances in Ward 12.' },
    { label: 'SLA risk review', text: 'Which grievances are at the highest risk of missing SLA deadlines?' },
    { label: 'Citizen response guidance', text: 'How should we respond to recurring road maintenance issues?' }
  ];

  useEffect(() => {
    const welcome = portalRole === 'citizen'
      ? `Welcome ${userName || 'Citizen'}. I can help you submit a grievance, review progress, and understand the current service timeline.`
      : `Welcome ${userName || 'Officer'}. I can assist with grievance review, SLA tracking, and recommended actions.`;

    setMessages([
      {
        role: 'assistant',
        content: welcome,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [portalRole, userName]);

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
      const message = error instanceof Error && error.message
        ? error.message
        : 'Sorry, I encountered a temporary connection issue. Please try again.';

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
      setIsOpen(false);
    } else if (action.type === 'CHECK_STATUS') {
      if (action.payload?.grievanceId) {
        router.push(`/citizen/grievances/${action.payload.grievanceId}`);
        setIsOpen(false);
      }
    } else if (action.type === 'VIEW_INCIDENT') {
      router.push('/officer/incidents');
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('fixed bottom-6 right-6 z-50', className)}>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-3.5 text-white shadow-xl shadow-indigo-500/25 transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/40 active:scale-95"
          aria-label="Open assistant"
        >
          <div className="relative">
        <Bot className="size-6 text-white" />
          </div>
          <span className="hidden pr-2 text-sm font-semibold sm:inline-block">
        Assistant
          </span>
        </button>
      )}

      {/* Chatbox Window */}
      {isOpen && (
        <div className="flex h-[560px] w-[360px] sm:w-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
                <Brain className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">
                  {portalRole === 'citizen' ? 'Support Assistant' : 'AI-Assisted Analysis'}
                </h3>
                <p className="text-[11px] text-white/80 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400"></span>
                  Available to assist
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close assistant"
            >
              <X className="size-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2.5',
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {m.role === 'assistant' && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 mt-0.5">
                    <Bot className="size-4" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/50 dark:border-slate-700/50'
                  )}
                >
                  <div className="whitespace-pre-wrap">{stripDecorativeSymbols(m.content)}</div>

                  {/* Interactive Action Chips */}
                  {m.suggestedAction && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                      <Button
                        size="sm"
                        className="w-full gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm text-xs font-semibold"
                        onClick={() => handleActionClick(m.suggestedAction)}
                      >
                        <Sparkles className="size-3.5" />
                        {m.suggestedAction.label}
                        <ArrowRight className="size-3 ml-auto" />
                      </Button>
                    </div>
                  )}

                  {m.timestamp && (
                    <p className={cn('mt-1 text-[10px] text-right', m.role === 'user' ? 'text-white/70' : 'text-slate-400')}>
                      {m.timestamp}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-500">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600">
                  <Bot className="size-4 animate-spin" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800 px-3.5 py-2">
                  <span className="size-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
                  <span className="size-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="size-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-1.5">
              {initialPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.text)}
                  className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div className="border-t border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <Input
                placeholder={portalRole === 'citizen' ? 'Ask about your grievance...' : 'Ask for recommendations...'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-800 text-sm h-10 rounded-xl"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || loading}
                className="size-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0 hover:opacity-90"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
