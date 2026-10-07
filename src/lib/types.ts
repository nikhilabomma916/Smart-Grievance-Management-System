// User types
export type UserRole = 'citizen' | 'officer' | 'department_admin' | 'admin';

export interface User {
  id: string;
  email: string;
  password: string; // hashed
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

// Department
export interface Department {
  id: string;
  name: string;
  description: string;
  headOfficerId?: string;
  headId?: string;
  headOfficerName?: string;
  contactEmail?: string;
  categories: string[]; // category IDs mapped to this dept
  metrics?: {
    totalGrievances: number;
    openGrievances: number;
    avgResolutionTimeHours: number;
  };
  stats?: {
    officers: number;
    grievances: number;
  };
}

// Category
export interface Category {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  icon?: string;
}

// Location
export interface GrievanceLocation {
  address?: string;
  area?: string;
  ward?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// Grievance statuses
export type GrievanceStatus = 'SUBMITTED' | 'AI_ANALYZED' | 'ASSIGNED' | 'IN_PROGRESS' | 'AWAITING_INFORMATION' | 'RESOLVED' | 'CLOSED' | 'SLA_AT_RISK' | 'ESCALATED' | 'REOPENED';

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// Grievance
export interface Grievance {
  id: string;
  citizenId: string;
  title: string;
  description: string;
  categoryId: string;
  category?: string; // alias
  location: GrievanceLocation;
  duration?: string; // how long the issue has been going on
  affectedCount?: number;
  previousComplaintId?: string;
  status: GrievanceStatus;
  priorityScore?: number; // 0-100
  priorityLevel?: PriorityLevel;
  priority?: PriorityLevel; // alias
  departmentId?: string;
  assignedOfficerId?: string;
  slaDeadline?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  attachments: Attachment[];
  complaintLetter?: string;
}

// Attachment
export interface Attachment {
  id: string;
  grievanceId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath?: string;
  storageRef?: string | null;
  uploadedAt: string;
}

// AI Analysis
export interface GrievanceAnalysis {
  id: string;
  grievanceId: string;
  summary: string;
  category: string;
  subcategory?: string;
  issueType?: string;
  extractedLocation?: string;
  extractedDuration?: string;
  affectedPopulation?: string;
  urgency: UrgencyLevel;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  safetyRisk: boolean;
  reasoning: string[];
  confidence?: number;
  aiProvider?: 'ollama' | 'fallback';
  createdAt: string;
}

// Priority Breakdown
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

// Duplicate Link
export interface DuplicateLink {
  id: string;
  grievanceId: string;
  similarGrievanceId: string;
  similarityScore: number;
  detectedAt: string;
}

// Incident (recurring issue cluster)
export interface Incident {
  id: string;
  title: string;
  description: string;
  categoryId?: string;
  category?: string;
  ward?: string;
  location?: GrievanceLocation | string;
  grievanceIds: string[];
  relatedGrievanceIds?: string[];
  totalComplaints?: number;
  complaintCount?: number;
  estimatedAffected: number;
  severity: PriorityLevel | 'critical' | 'high' | 'medium' | 'low' | string;
  priority?: string;
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'OPEN' | string;
  detectedAt?: string;
  createdAt?: string;
  updatedAt: string;
  affectedCount?: number;
}

// SLA Rule
export interface SLARule {
  id: string;
  priorityLevel: PriorityLevel;
  resolutionHours: number;
  escalationHours: number;
  departmentId?: string;
}

// Status History
export interface StatusHistoryEntry {
  id: string;
  grievanceId: string;
  fromStatus: GrievanceStatus | null;
  toStatus: GrievanceStatus;
  changedBy: string;
  changedByRole: UserRole;
  note?: string;
  timestamp: string;
}

// Internal Note
export interface InternalNote {
  id: string;
  grievanceId: string;
  authorId: string;
  authorName: string;
  authorRole: Exclude<UserRole, 'citizen'>;
  content: string;
  createdAt: string;
}

// Citizen Update
export interface CitizenUpdate {
  id: string;
  grievanceId: string;
  message: string;
  isPublic: boolean;
  createdAt: string;
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type:
    | 'complaint_received'
    | 'analysis_completed'
    | 'department_assigned'
    | 'complaint_assigned'
    | 'status_updated'
    | 'info_requested'
    | 'sla_approaching'
    | 'sla_breached'
    | 'sla_warning'
    | 'complaint_resolved'
    | 'complaint_escalated'
    | 'feedback_requested'
    | 'complaint_reopened'
    | 'new_assignment';
  grievanceId?: string;
  read: boolean;
  createdAt: string;
}

// Feedback
export interface Feedback {
  id: string;
  grievanceId: string;
  citizenId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
}

export interface GrievanceResolution {
  id: string;
  grievanceId: string;
  details: string;
  resolvedByRole: Exclude<UserRole, 'citizen'>;
  resolvedAt: string;
}

// AI Recommendation
export interface AIRecommendation {
  id: string;
  grievanceId: string;
  summary: string;
  keyFindings: string[];
  recommendedActions: string[];
  suggestedResponse?: string;
  escalationRecommendation?: string;
  relevantKnowledge?: string[];
  confidence: number;
  createdAt: string;
}

// AI Decision (human-in-the-loop)
export interface AIDecision {
  id: string;
  recommendationId: string;
  grievanceId: string;
  officerId: string;
  decision: 'ACCEPT' | 'MODIFY' | 'REJECT';
  modification?: string;
  timestamp: string;
}

export type GrievanceAIDecisionValue = 'ACCEPTED' | 'MODIFIED' | 'REJECTED';

export interface GrievanceAIRecommendationContent {
  summary: string;
  keyFindings: string[];
  recommendedActions: Array<{ action: string; department: string } | string>;
  suggestedCitizenResponse?: string;
  escalationRecommendation?: string;
  relevantKnowledge?: string[];
}

export interface GrievanceAIDecisionRecord {
  id: string;
  grievanceId: string;
  recommendationId: string;
  officerId: string;
  decision: GrievanceAIDecisionValue;
  originalRecommendation: GrievanceAIRecommendationContent;
  finalRecommendation: GrievanceAIRecommendationContent | null;
  officerNote?: string;
  createdAt: string;
}

// Knowledge Document
export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isDemo: boolean;
  createdAt: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  details?: any;
  timestamp: string;
}

// Analytics types
export interface AnalyticsOverview {
  totalGrievances: number;
  open: number;
  inProgress: number;
  resolved: number;
  escalated: number;
  overdue: number;
  avgResolutionHours: number;
  avgResolutionTimeHours: number;
  citizenSatisfaction: number;
  citizenSatisfactionScore: number;
  activeIncidents: number;
  statusDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  departmentWorkload: Record<string, number>;
  trends: {
    dailyVolume: { date: string; count: number }[];
    categoryBreakdown?: { category: string; count: number }[];
  };
}

export interface TrendData {
  date: string;
  count: number;
  category?: string;
}
