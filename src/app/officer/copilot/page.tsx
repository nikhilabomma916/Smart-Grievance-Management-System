'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, Send, Bot, User, Sparkles, ArrowRight,
  Shield, CheckCircle, Clock, MapPin, Zap, MessageSquare, AlertTriangle, Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { AIChatMessage } from '@/server/ai/ai-service';

export default function OfficerCopilotPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const copilotPrompts = [
    { label: 'Summarize open queue & bottlenecks', text: 'Give me a live breakdown of our pending grievance queue, SLA risks, and anomalies.' },
    { label: 'Deep-dive Ward 12 Water Crisis', text: 'Analyze the 16 correlated complaints in Ward 12 and suggest an incident resolution strategy.' },
    { label: 'High SLA risk cases', text: 'Which assigned tickets are in danger of exceeding the 24-hour SLA deadline today?' },
    { label: 'Standard draft reply for road repairs', text: 'Draft an official citizen acknowledgement for heavy monsoon road crater repairs.' }
  ];

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hello Officer! I am your **CivicResolve AI Copilot & Resolution Assistant**.\n\nI can assist you with:\n1. **Systemic Incident Analysis** & Root Cause Detection\n2. **Predictive SLA Breach Alarms**\n3. **Automated Action Plan & Citizen Response Drafting**\n4. **Municipal Policy & Standard Operating Procedures**\n\nHow would you like to streamline your operational queue today?`,
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
      const message = error instanceof Error && error.message ? error.message : 'Sorry, I encountered an error connecting to the Copilot Engine. Please try again.';
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
    if (action.type === 'VIEW_INCIDENT') {
      router.push('/officer/incidents');
    } else if (action.type === 'CHECK_STATUS') {
      if (action.payload?.grievanceId) {
        router.push(`/officer/grievances/${action.payload.grievanceId}`);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Brain className="size-7 text-indigo-600" />
            Officer AI Copilot & Decision Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Intelligent assistant for incident clustering, resolution drafting, and municipal policy guidance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/officer/incidents')}
            className="gap-1.5"
          >
            <Layers className="size-4 text-indigo-500" /> Incident Radar
          </Button>
          <Button
            onClick={() => router.push('/officer/grievances')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
          >
            <Zap className="size-4" /> View All Grievances
          </Button>
        </div>
      </div>

      {/* Main Copilot Card */}
      <Card className="h-[620px] flex flex-col overflow-hidden shadow-lg border-slate-800 bg-[#0f172a] text-slate-100">
        <CardHeader className="py-3.5 px-6 border-b border-slate-800 bg-[#020817] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-600/30 border border-indigo-500/30">
                <Brain className="size-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">CivicResolve AI Copilot</h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Human-in-the-Loop Municipal Decision Assistant
                </p>
              </div>
            </div>
            <Badge className="bg-indigo-900/60 text-indigo-300 border-indigo-700 text-xs">
              Officer Mode
            </Badge>
          </div>
        </CardHeader>

        {/* Messages Log */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 mt-1">
                  <Bot className="size-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-800/80 text-slate-100 rounded-bl-none border border-slate-700/80'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.suggestedAction && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700">
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
                  <p className={`mt-1.5 text-[10px] text-right ${m.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {m.timestamp}
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-400">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-950 text-indigo-400">
                <Bot className="size-4 animate-spin" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-slate-800 px-4 py-2.5 border border-slate-700">
                <span className="size-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                <span className="size-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="size-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-6 py-2 border-t border-slate-800 bg-slate-900/80 flex flex-wrap gap-2">
          {copilotPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.text)}
              className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300 hover:border-indigo-500 hover:text-indigo-300 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-[#020817]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <Input
              placeholder="Ask Copilot for analysis, SLA forecasts, or policy resolutions..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 h-11 text-sm rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
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
