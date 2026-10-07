'use client';

import { cn } from '@/lib/utils';

type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const priorityConfig: Record<PriorityLevel, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800', label: 'Critical' },
  HIGH: { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800', label: 'High' },
  MEDIUM: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800', label: 'Medium' },
  LOW: { color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800', label: 'Low' },
};

export function PriorityBadge({ level, priority, score, className }: { level?: PriorityLevel | string; priority?: PriorityLevel | string; score?: number; className?: string }) {
  const pLevel = ((level || priority || 'MEDIUM') as string).toUpperCase() as PriorityLevel;
  const config = priorityConfig[pLevel] || priorityConfig.MEDIUM;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold', config.bg, config.color, pLevel === 'CRITICAL' && 'animate-pulse-critical', className)}>
      <span className={cn('size-1.5 rounded-full', pLevel === 'CRITICAL' ? 'bg-red-500' : pLevel === 'HIGH' ? 'bg-orange-500' : pLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500')} />
      {config.label}
      {score !== undefined && <span className="opacity-75">({score})</span>}
    </span>
  );
}

type GrievanceStatus = 'SUBMITTED' | 'AI_ANALYZED' | 'ASSIGNED' | 'IN_PROGRESS' | 'AWAITING_INFORMATION' | 'RESOLVED' | 'CLOSED' | 'SLA_AT_RISK' | 'ESCALATED' | 'REOPENED';

const statusConfig: Record<GrievanceStatus, { color: string; bg: string; label: string }> = {
  SUBMITTED: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', label: 'Submitted' },
  AI_ANALYZED: { color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', label: 'AI Analyzed' },
  ASSIGNED: { color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800', label: 'Assigned' },
  IN_PROGRESS: { color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800', label: 'In Progress' },
  AWAITING_INFORMATION: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', label: 'Awaiting Information' },
  RESOLVED: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', label: 'Resolved' },
  CLOSED: { color: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700', label: 'Closed' },
  SLA_AT_RISK: { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', label: 'SLA At Risk' },
  ESCALATED: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', label: 'Escalated' },
  REOPENED: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', label: 'Reopened' },
};

export function StatusBadge({ status, className }: { status: GrievanceStatus | string; className?: string }) {
  const config = statusConfig[status as GrievanceStatus] || statusConfig.SUBMITTED;
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', config.bg, config.color, className)}>
      {config.label}
    </span>
  );
}

export function IssueConditionBadge({ status, isResolved }: { status: string; isResolved?: boolean }) {
  const resolved = isResolved || ['RESOLVED', 'CLOSED'].includes(status);

  if (resolved) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
        <span className="size-2 rounded-full bg-emerald-500" />
        Resolved
      </span>
    );
  }

  if (['IN_PROGRESS', 'ASSIGNED'].includes(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
        <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
        In Progress
      </span>
    );
  }

  if (['ESCALATED', 'SLA_AT_RISK'].includes(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:text-red-300">
        <span className="size-2 rounded-full bg-red-500 animate-ping" />
        Escalated
      </span>
    );
  }

  if (status === 'REOPENED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
        <span className="size-2 rounded-full bg-amber-500" />
        Reopened
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
      <span className="size-2 rounded-full bg-blue-500" />
      Submitted
    </span>
  );
}

export function SLAIndicator({ deadline, className }: { deadline: string; className?: string }) {
  const now = new Date();
  const dl = new Date(deadline);
  const remaining = dl.getTime() - now.getTime();
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  const isOverdue = remaining < 0;
  const isAtRisk = !isOverdue && hours < 4;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-medium', isOverdue ? 'text-red-600 dark:text-red-400' : isAtRisk ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground', className)}>
      <span className={cn('size-2 rounded-full', isOverdue ? 'bg-red-500 animate-pulse' : isAtRisk ? 'bg-amber-500 animate-pulse' : 'bg-green-500')} />
      {isOverdue ? (
        <span>Overdue by {Math.abs(hours)}h {Math.abs(minutes)}m</span>
      ) : (
        <span>{hours}h {minutes}m remaining</span>
      )}
    </div>
  );
}

export function MetricCard({ title, value, subtitle, icon, trend, className }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean } | string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {icon && (
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', typeof trend === 'string' ? 'text-muted-foreground' : trend.isPositive ? 'text-emerald-600' : 'text-red-600')}>
          {typeof trend === 'string' ? (
            <span>{trend}</span>
          ) : (
            <>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs last week</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-muted-foreground/50">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative size-10">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
      </div>
      {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

export function ErrorState({ title, message, onRetry }: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-3">
        <svg className="size-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold">{title || 'Unable to complete the request'}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Try Again
        </button>
      )}
    </div>
  );
}
