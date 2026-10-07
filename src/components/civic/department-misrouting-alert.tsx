'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, ArrowRight, CheckCircle2, RefreshCw, Sparkles, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MisroutingAlert } from '@/server/ai/department-monitor';

export function AIDepartmentMisroutingMonitor({ className }: { className?: string }) {
  const [alerts, setAlerts] = useState<MisroutingAlert[]>([]);
  const [stats, setStats] = useState({ totalAudited: 0, correctlyRoutedCount: 0, misroutedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [reroutingId, setReroutingId] = useState<string | null>(null);

  const fetchMisroutingData = async () => {
    try {
      const res = await fetch('/api/ai/department-monitor');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setStats({
          totalAudited: data.totalAudited || 0,
          correctlyRoutedCount: data.correctlyRoutedCount || 0,
          misroutedCount: data.misroutedCount || 0
        });
      }
    } catch (err) {
      console.error('Failed to load department misrouting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMisroutingData();
  }, []);

  const handleAutoReroute = async (grievanceId: string, correctDepartmentId: string) => {
    setReroutingId(grievanceId);
    try {
      const res = await fetch('/api/ai/department-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grievanceId, targetDepartmentId: correctDepartmentId })
      });
      if (res.ok) {
        await fetchMisroutingData();
      }
    } catch (err) {
      console.error('Failed to reroute:', err);
    } finally {
      setReroutingId(null);
    }
  };

  if (loading) return null;

  return (
    <Card className={`border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/60 via-white to-red-50/40 dark:from-slate-900 dark:to-slate-800 shadow-md ${className}`}>
      <CardHeader className="pb-3 border-b border-amber-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="size-5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>AI Department Dispatch Monitor & Misrouting Radar</span>
                {stats.misroutedCount > 0 && (
                  <Badge className="bg-red-500 text-white font-bold animate-pulse text-[10px]">
                    ⚠️ {stats.misroutedCount} Misrouted Complaint{stats.misroutedCount > 1 ? 's' : ''} Detected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                AI continuously audits grievances on all dashboards to ensure complaints are sent to their correct respective department.
              </CardDescription>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchMisroutingData}
            className="h-8 text-xs gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="size-3.5" /> Re-audit
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Dispatch Health Meter */}
        <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Total Audited: <strong>{stats.totalAudited}</strong>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> {stats.correctlyRoutedCount} Correctly Routed
            </span>
          </div>
          {stats.misroutedCount > 0 ? (
            <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="size-3.5" /> {stats.misroutedCount} Require Re-routing
            </span>
          ) : (
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              ✓ 100% Department Accuracy
            </span>
          )}
        </div>

        {/* Misrouted Alerts List */}
        {alerts.length === 0 ? (
          <div className="p-3 text-center text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50/50 rounded-xl border border-emerald-200">
            ✓ All complaints are currently dispatched to their correct respective departments. No misrouting detected.
          </div>
        ) : (
          <div className="space-y-2.5">
            {alerts.map((alt) => (
              <div
                key={alt.grievanceId}
                className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-800/80 shadow-xs space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-indigo-600 font-bold">{alt.grievanceId}</span>
                      <Badge variant="outline" className="text-[10px] text-red-700 border-red-300 font-semibold">
                        ⚠️ Misrouted Complaint Flagged
                      </Badge>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{alt.title}</h4>
                  </div>

                  <Button
                    size="sm"
                    disabled={reroutingId === alt.grievanceId}
                    onClick={() => handleAutoReroute(alt.grievanceId, alt.correctDepartmentId)}
                    className="bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-700 hover:to-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm h-8"
                  >
                    <Sparkles className="size-3.5" />
                    {reroutingId === alt.grievanceId ? 'Auto-Rerouting...' : `Auto-Reroute to ${alt.correctDepartmentName}`}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs bg-red-50/70 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-100 dark:border-red-900/40">
                  <span className="text-slate-600 dark:text-slate-400">Mistakenly Sent To:</span>
                  <span className="font-bold text-red-700 dark:text-red-400 line-through">{alt.assignedDepartmentName}</span>
                  <ArrowRight className="size-3.5 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400">Correct Department:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Building2 className="size-3.5" /> {alt.correctDepartmentName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
