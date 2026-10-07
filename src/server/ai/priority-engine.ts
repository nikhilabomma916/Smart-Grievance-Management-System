import { CATEGORY_NAMES } from '@/lib/constants';
import type { Grievance, GrievanceAnalysis, PriorityLevel, UrgencyLevel } from '@/lib/types';
import { impactLevelSchema, priorityLevelSchema, urgencyLevelSchema } from '@/server/validation/grievance';

export interface PriorityBreakdown {
  score: number;
  level: PriorityLevel;
  reasons: string[];
  factors: {
    severity: number;
    affectedPopulation: number;
    urgency: number;
    duration: number;
    safetyRisk: number;
    recurrence: number;
  };
}

const impactScores: Record<GrievanceAnalysis['impact'], number> = {
  HIGH: 80,
  MEDIUM: 50,
  LOW: 20,
};

const urgencyScores: Record<UrgencyLevel, number> = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
};

export function priorityLevelFromScore(score: number): PriorityLevel {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new RangeError('Priority score must be an integer between 0 and 100.');
  }

  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

export function calculateGrievancePriority(
  analysis: Pick<GrievanceAnalysis, 'urgency' | 'impact' | 'safetyRisk'>,
  grievance: Pick<Grievance, 'duration' | 'affectedCount'>,
  recurrenceCount: number,
): PriorityBreakdown {
  const urgency = urgencyLevelSchema.parse(analysis.urgency);
  const impact = impactLevelSchema.parse(analysis.impact);
  if (!Number.isInteger(recurrenceCount) || recurrenceCount < 0) {
    throw new RangeError('Recurrence count must be a non-negative integer.');
  }

  const severity = impactScores[impact];
  const populationFromCount = grievance.affectedCount === undefined
    ? severity
    : grievance.affectedCount > 50 ? 80 : grievance.affectedCount >= 10 ? 50 : 20;
  const affectedPopulation = Math.max(severity, populationFromCount);
  const urgencyScore = urgencyScores[urgency];
  const duration = grievance.duration ? 50 : 10;
  const safetyRisk = analysis.safetyRisk ? 100 : 0;
  const recurrence = Math.min(recurrenceCount * 20, 100);

  const score = Math.round(
    severity * 0.3 +
    affectedPopulation * 0.25 +
    urgencyScore * 0.2 +
    duration * 0.1 +
    safetyRisk * 0.1 +
    recurrence * 0.05,
  );
  const level = priorityLevelFromScore(score);
  const reasons: string[] = [];
  if (severity > 75) reasons.push('High-severity issue');
  if (affectedPopulation > 75) reasons.push('Large affected population');
  if (urgencyScore > 75) reasons.push(`Time-sensitive ${urgency.toLowerCase()} urgency`);
  if (analysis.safetyRisk) reasons.push('Poses a safety risk');
  if (recurrence > 75) reasons.push('Frequent recurrence');
  if (duration > 75) reasons.push('Longstanding issue');

  return {
    score,
    level,
    reasons,
    factors: { severity, affectedPopulation, urgency: urgencyScore, duration, safetyRisk, recurrence },
  };
}

export function buildGrievanceAnalysisSummary(
  analysis: Pick<GrievanceAnalysis, 'category' | 'urgency' | 'impact' | 'safetyRisk'>,
  priority?: { score: number; level: PriorityLevel },
): string {
  const urgency = urgencyLevelSchema.parse(analysis.urgency);
  const impact = impactLevelSchema.parse(analysis.impact);
  const category = CATEGORY_NAMES[analysis.category] || analysis.category;
  const safety = analysis.safetyRisk ? 'Safety risk identified' : 'No safety risk identified';
  if (!priority) {
    return `Category: ${category}. ${urgency} urgency. ${impact} impact. ${safety}. Overall priority is unavailable.`;
  }
  const level = priorityLevelSchema.parse(priority.level);
  if (priorityLevelFromScore(priority.score) !== level) {
    throw new Error('Displayed priority level does not match its persisted score.');
  }
  return `Category: ${category}. ${urgency} urgency. ${impact} impact. ${safety}. Overall priority: ${level} (${priority.score}).`;
}
