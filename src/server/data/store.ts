import { hashSync } from 'bcryptjs';
import {
  User, Department, Category, Grievance, GrievanceAnalysis, DuplicateLink,
  Incident, SLARule, StatusHistoryEntry, InternalNote, CitizenUpdate, Notification,
  Feedback, AIRecommendation, AIDecision, KnowledgeDocument, AuditLog, GrievanceStatus, PriorityLevel, GrievanceLocation, UrgencyLevel
} from '@/lib/types';

const hashedPassword = hashSync('demo123', 10);

const generateId = (prefix: string, index: number) => `${prefix}-${index.toString().padStart(3, '0')}`;
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (startDaysAgo: number, endDaysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(endDaysAgo, startDaysAgo));
  date.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59));
  return date.toISOString();
};

export const store = {
  users: [] as User[],
  departments: [] as Department[],
  categories: [] as Category[],
  grievances: [] as Grievance[],
  analyses: [] as GrievanceAnalysis[],
  duplicateLinks: [] as DuplicateLink[],
  incidents: [] as Incident[],
  slaRules: [] as SLARule[],
  statusHistory: [] as StatusHistoryEntry[],
  internalNotes: [] as InternalNote[],
  citizenUpdates: [] as CitizenUpdate[],
  notifications: [] as Notification[],
  feedback: [] as Feedback[],
  recommendations: [] as AIRecommendation[],
  decisions: [] as AIDecision[],
  knowledgeDocuments: [] as KnowledgeDocument[],
  auditLogs: [] as AuditLog[],
};

// --- INITIALIZE STATIC DATA ---
store.users = [
  { id: 'usr-citizen-001', email: 'citizen@demo.com', password: hashedPassword, name: 'Priya Sharma', role: 'citizen', phone: '+919876543210', createdAt: new Date().toISOString() },
  { id: 'usr-officer-001', email: 'officer@demo.com', password: hashedPassword, name: 'Rajesh Kumar', role: 'officer', phone: '+919876543211', createdAt: new Date().toISOString() },
  { id: 'usr-admin-001', email: 'admin@demo.com', password: hashedPassword, name: 'Anita Desai', role: 'admin', phone: '+919876543212', createdAt: new Date().toISOString() },
  // Additional officers
  { id: 'usr-officer-002', email: 'officer2@demo.com', password: hashedPassword, name: 'Vikram Singh', role: 'officer', phone: '+919876543213', createdAt: new Date().toISOString() },
  { id: 'usr-officer-003', email: 'officer3@demo.com', password: hashedPassword, name: 'Sanjay Gupta', role: 'officer', phone: '+919876543214', createdAt: new Date().toISOString() },
  { id: 'usr-officer-004', email: 'officer4@demo.com', password: hashedPassword, name: 'Meera Reddy', role: 'officer', phone: '+919876543215', createdAt: new Date().toISOString() },
  { id: 'usr-officer-005', email: 'officer5@demo.com', password: hashedPassword, name: 'Rahul Patel', role: 'officer', phone: '+919876543216', createdAt: new Date().toISOString() },
  { id: 'usr-officer-006', email: 'officer6@demo.com', password: hashedPassword, name: 'Neha Joshi', role: 'officer', phone: '+919876543217', createdAt: new Date().toISOString() },
];

store.departments = [
  { id: 'dept-water', name: 'Water Supply', description: 'Water distribution and sewerage', headOfficerId: 'usr-officer-001', categories: ['cat-water-supply', 'cat-sewerage'] },
  { id: 'dept-roads', name: 'Roads & Infrastructure', description: 'Road maintenance, potholes', headOfficerId: 'usr-officer-002', categories: ['cat-potholes', 'cat-footpaths'] },
  { id: 'dept-sanitation', name: 'Sanitation', description: 'Waste management and cleaning', headOfficerId: 'usr-officer-003', categories: ['cat-garbage', 'cat-public-toilets'] },
  { id: 'dept-electrical', name: 'Electrical', description: 'Streetlights and power issues', headOfficerId: 'usr-officer-004', categories: ['cat-streetlights', 'cat-power'] },
  { id: 'dept-safety', name: 'Public Safety', description: 'Hazards and public security', headOfficerId: 'usr-officer-005', categories: ['cat-hazards', 'cat-stray-animals'] },
  { id: 'dept-health', name: 'Healthcare', description: 'Public health and clinics', headOfficerId: 'usr-officer-006', categories: ['cat-health'] },
  { id: 'dept-edu', name: 'Education', description: 'Public schools and education', categories: ['cat-schools'] },
  { id: 'dept-transport', name: 'Transport', description: 'Public transit and buses', categories: ['cat-transit'] }
];

store.categories = [
  { id: 'cat-water-supply', name: 'Water Supply Issue', description: 'No water, contaminated water', departmentId: 'dept-water' },
  { id: 'cat-sewerage', name: 'Sewerage/Drainage', description: 'Blocked drains, overflowing sewage', departmentId: 'dept-water' },
  { id: 'cat-potholes', name: 'Potholes/Road Damage', description: 'Broken roads, deep potholes', departmentId: 'dept-roads' },
  { id: 'cat-footpaths', name: 'Footpath Encroachment', description: 'Broken or blocked footpaths', departmentId: 'dept-roads' },
  { id: 'cat-garbage', name: 'Garbage Collection', description: 'Uncollected garbage, dumping', departmentId: 'dept-sanitation' },
  { id: 'cat-public-toilets', name: 'Public Toilets', description: 'Unclean or non-functional toilets', departmentId: 'dept-sanitation' },
  { id: 'cat-streetlights', name: 'Streetlights', description: 'Non-functioning streetlights', departmentId: 'dept-electrical' },
  { id: 'cat-power', name: 'Power Cut', description: 'Unscheduled power outages', departmentId: 'dept-electrical' },
  { id: 'cat-hazards', name: 'Safety Hazards', description: 'Open manholes, hanging wires', departmentId: 'dept-safety' },
  { id: 'cat-stray-animals', name: 'Stray Animals', description: 'Aggressive stray dogs/animals', departmentId: 'dept-safety' },
  { id: 'cat-health', name: 'Public Health', description: 'Mosquito breeding, sanitation hazards', departmentId: 'dept-health' },
  { id: 'cat-schools', name: 'Public Schools', description: 'Infrastructure issues in public schools', departmentId: 'dept-edu' },
  { id: 'cat-transit', name: 'Public Transit', description: 'Bus stop issues, scheduling', departmentId: 'dept-transport' },
];

store.slaRules = [
  { id: 'sla-critical', priorityLevel: 'CRITICAL', resolutionHours: 4, escalationHours: 2 },
  { id: 'sla-high', priorityLevel: 'HIGH', resolutionHours: 24, escalationHours: 12 },
  { id: 'sla-medium', priorityLevel: 'MEDIUM', resolutionHours: 72, escalationHours: 48 },
  { id: 'sla-low', priorityLevel: 'LOW', resolutionHours: 168, escalationHours: 120 },
];

store.knowledgeDocuments = [
  { id: 'doc-001', title: 'Water Supply Contingency Protocol', content: 'In case of main line burst, deploy water tankers immediately to affected wards.', category: 'Water Supply', tags: ['water', 'emergency', 'tanker'], isDemo: true, createdAt: new Date().toISOString() },
  { id: 'doc-002', title: 'Sewerage Blockage Resolution SLA', content: 'High priority blockages must be resolved within 12 hours using jetting machines.', category: 'Sanitation', tags: ['sewerage', 'jetting', 'SLA'], isDemo: true, createdAt: new Date().toISOString() },
  { id: 'doc-003', title: 'Pothole Filling Guidelines', content: 'Use cold mix for temporary filling during monsoons. Ensure proper compaction.', category: 'Roads', tags: ['potholes', 'monsoon', 'repair'], isDemo: true, createdAt: new Date().toISOString() },
  { id: 'doc-004', title: 'Stray Animal Handling', content: 'Contact certified animal catchers. Do not harm the animals. Transport to nearest shelter.', category: 'Safety', tags: ['stray', 'animals', 'shelter'], isDemo: true, createdAt: new Date().toISOString() },
  { id: 'doc-005', title: 'Garbage Collection Routing', content: 'If standard routes fail, use backup route B and notify the zonal supervisor.', category: 'Sanitation', tags: ['garbage', 'routes', 'backup'], isDemo: true, createdAt: new Date().toISOString() },
];

// Demo transaction data is intentionally disabled. Complaints enter through the API.
const seedDemoData = false;

if (seedDemoData) {
// --- GENERATORS FOR SCENARIOS ---

let grievanceCounter = 1;
const createGrievance = (
  overrides: Partial<Grievance>,
  analysisOverrides?: Partial<GrievanceAnalysis>
): Grievance => {
  const id = generateId('grv', grievanceCounter++);
  const createdAt = overrides.createdAt || randomDate(30, 0);
  
  const g: Grievance = {
    id,
    citizenId: 'usr-citizen-001',
    title: 'Sample Grievance',
    description: 'This is a sample description.',
    categoryId: 'cat-water-supply',
    location: { ward: '1', area: 'Koramangala', city: 'Bangalore' },
    status: 'SUBMITTED',
    createdAt,
    updatedAt: createdAt,
    attachments: [],
    ...overrides
  };
  
  store.grievances.push(g);

  // Generate an Analysis
  const analysis: GrievanceAnalysis = {
    id: `anl-${id}`,
    grievanceId: id,
    summary: g.title,
    category: g.categoryId,
    urgency: g.priorityLevel as UrgencyLevel || 'MEDIUM',
    impact: 'MEDIUM',
    safetyRisk: g.priorityLevel === 'CRITICAL',
    reasoning: ['Based on description', 'Matched historical patterns'],
    confidence: 0.85 + Math.random() * 0.1,
    aiProvider: 'ollama',
    createdAt,
    ...analysisOverrides
  };
  store.analyses.push(analysis);

  // Generate initial status history
  store.statusHistory.push({
    id: `sh-${id}-init`,
    grievanceId: id,
    fromStatus: null,
    toStatus: g.status,
    changedBy: g.citizenId,
    changedByRole: 'citizen',
    timestamp: createdAt
  });

  return g;
};

// Scenario A: WATER CRISIS (15+ similar in Ward 12)
for (let i = 0; i < 16; i++) {
  createGrievance({
    title: `No water for 3 days in Block ${String.fromCharCode(65 + i)}`,
    description: 'We have not received any corporation water for the last 3 days. Tanks are empty.',
    categoryId: 'cat-water-supply',
    departmentId: 'dept-water',
    location: { ward: '12', area: 'Indiranagar', city: 'Bangalore' },
    status: i < 5 ? 'IN_PROGRESS' : i < 10 ? 'ASSIGNED' : 'SUBMITTED',
    priorityScore: randomInt(75, 95),
    priorityLevel: 'HIGH',
    assignedOfficerId: i < 10 ? 'usr-officer-001' : undefined,
    affectedCount: randomInt(50, 200)
  });
}

// Scenario B: PUBLIC SAFETY (3-5 critical)
createGrievance({
  title: 'Open Manhole on Main Road',
  description: 'There is a dangerous open manhole right in the middle of the road. High risk of accidents.',
  categoryId: 'cat-hazards',
  departmentId: 'dept-safety',
  location: { ward: '5', area: 'Jayanagar', city: 'Bangalore' },
  status: 'ASSIGNED',
  priorityScore: 98,
  priorityLevel: 'CRITICAL',
  assignedOfficerId: 'usr-officer-005'
}, { safetyRisk: true, impact: 'HIGH', urgency: 'CRITICAL' });

// MISROUTED COMPLAINT 1: Road crater mistakenly sent to Sanitation
createGrievance({
  title: 'Severe Road Crater Pothole on 100ft Main Road',
  description: 'Deep 3-foot asphalt road crater causing severe vehicle wheel damage and two-wheeler accidents.',
  categoryId: 'cat-potholes',
  departmentId: 'dept-sanitation', // MISTAKENLY SENT TO SANITATION!
  location: { ward: '12', area: 'Indiranagar', city: 'Bangalore' },
  status: 'SUBMITTED',
  priorityScore: 88,
  priorityLevel: 'HIGH'
});

// MISROUTED COMPLAINT 2: Pipeline burst mistakenly sent to Electrical
createGrievance({
  title: 'Ruptured Water Pipeline Flooding Street',
  description: 'Underground drinking water main has burst, wasting thousands of liters of clean water onto the street.',
  categoryId: 'cat-water-supply',
  departmentId: 'dept-electrical', // MISTAKENLY SENT TO ELECTRICAL!
  location: { ward: '8', area: 'HSR Layout', city: 'Bangalore' },
  status: 'SUBMITTED',
  priorityScore: 92,
  priorityLevel: 'HIGH'
});


createGrievance({
  title: 'Live wire fallen on footpath',
  description: 'A high tension wire has snapped and fallen across the walking path. Sparking heavily.',
  categoryId: 'cat-hazards',
  departmentId: 'dept-safety',
  location: { ward: '8', area: 'HSR Layout', city: 'Bangalore' },
  status: 'IN_PROGRESS',
  priorityScore: 100,
  priorityLevel: 'CRITICAL',
  assignedOfficerId: 'usr-officer-005'
}, { safetyRisk: true, impact: 'HIGH', urgency: 'CRITICAL' });

createGrievance({
  title: 'Huge tree branch about to fall on houses',
  description: 'Heavy rains have caused a massive branch to splinter. It is hanging directly over our roof.',
  categoryId: 'cat-hazards',
  departmentId: 'dept-safety',
  location: { ward: '3', area: 'Malleswaram', city: 'Bangalore' },
  status: 'SUBMITTED',
  priorityScore: 92,
  priorityLevel: 'CRITICAL'
}, { safetyRisk: true, impact: 'HIGH', urgency: 'CRITICAL' });

// Scenario C: GARBAGE DUPLICATES (15+ similar in Ward 7)
for (let i = 0; i < 18; i++) {
  createGrievance({
    title: `Garbage dump overflow near Street ${i + 1}`,
    description: 'The community garbage bin has not been cleared for a week. Terrible stench and mosquitoes.',
    categoryId: 'cat-garbage',
    departmentId: 'dept-sanitation',
    location: { ward: '7', area: 'Whitefield', city: 'Bangalore' },
    status: 'SUBMITTED',
    priorityScore: randomInt(50, 70),
    priorityLevel: 'MEDIUM',
    affectedCount: randomInt(20, 100)
  });
}

// Scenario D: OVERDUE ROAD
const overdueDate = new Date();
overdueDate.setDate(overdueDate.getDate() - 10);
createGrievance({
  title: 'Deep crater on Outer Ring Road',
  description: 'Massive pothole causing severe traffic jams and vehicle damage.',
  categoryId: 'cat-potholes',
  departmentId: 'dept-roads',
  location: { ward: '9', area: 'Bellandur', city: 'Bangalore' },
  status: 'SLA_AT_RISK',
  priorityScore: 85,
  priorityLevel: 'HIGH',
  assignedOfficerId: 'usr-officer-002',
  createdAt: overdueDate.toISOString(),
  updatedAt: overdueDate.toISOString(),
  slaDeadline: new Date(overdueDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
});

// Scenario E: RESOLVED CASE WITH FEEDBACK
const resolvedDate = randomDate(5, 1);
const resolvedG = createGrievance({
  title: 'Streetlight not working',
  description: 'The streetlight outside my house has been off for 2 days.',
  categoryId: 'cat-streetlights',
  departmentId: 'dept-electrical',
  location: { ward: '4', area: 'BTM Layout', city: 'Bangalore' },
  status: 'RESOLVED',
  priorityScore: 40,
  priorityLevel: 'LOW',
  assignedOfficerId: 'usr-officer-004',
  resolvedAt: resolvedDate
});

store.feedback.push({
  id: 'fdb-001',
  grievanceId: resolvedG.id,
  citizenId: 'usr-citizen-001',
  rating: 5,
  comment: 'Very prompt response, thank you!',
  createdAt: resolvedDate
});

// Random padding to reach 100+
const areas = ['Koramangala', 'Indiranagar', 'Jayanagar', 'HSR Layout', 'Whitefield', 'Bellandur', 'BTM Layout', 'Malleswaram'];
while (store.grievances.length < 105) {
  const cat = randomElement(store.categories);
  const levels: PriorityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const level = randomElement(levels);
  const statuses: GrievanceStatus[] = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const status = randomElement(statuses);
  
  createGrievance({
    title: `Issue with ${cat.name}`,
    description: `Randomly generated description for ${cat.name} issue.`,
    categoryId: cat.id,
    departmentId: cat.departmentId,
    location: { ward: randomInt(1, 20).toString(), area: randomElement(areas), city: 'Bangalore' },
    status,
    priorityScore: randomInt(10, 90),
    priorityLevel: level,
    affectedCount: randomInt(1, 50)
  });
}

// Generate Incidents for the clusters
store.incidents.push({
  id: 'inc-001',
  title: 'Major Water Outage - Ward 12',
  description: 'Widespread water shortage reported across multiple blocks in Ward 12 over 3 days.',
  categoryId: 'cat-water-supply',
  location: { ward: '12', area: 'Indiranagar', city: 'Bangalore' },
  grievanceIds: store.grievances.filter(g => g.categoryId === 'cat-water-supply' && g.location.ward === '12').map(g => g.id),
  totalComplaints: 16,
  estimatedAffected: 1500,
  severity: 'HIGH',
  status: 'ACTIVE',
  detectedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

store.incidents.push({
  id: 'inc-002',
  title: 'Garbage Collection Failure - Ward 7',
  description: 'Multiple reports of uncollected garbage leading to sanitary concerns in Ward 7.',
  categoryId: 'cat-garbage',
  location: { ward: '7', area: 'Whitefield', city: 'Bangalore' },
  grievanceIds: store.grievances.filter(g => g.categoryId === 'cat-garbage' && g.location.ward === '7').map(g => g.id),
  totalComplaints: 18,
  estimatedAffected: 800,
  severity: 'MEDIUM',
  status: 'INVESTIGATING',
  detectedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Link duplicates for Ward 7 Garbage
const garbageGrievances = store.grievances.filter(g => g.categoryId === 'cat-garbage' && g.location.ward === '7');
for (let i = 1; i < garbageGrievances.length; i++) {
  store.duplicateLinks.push({
    id: `dup-${i}`,
    grievanceId: garbageGrievances[i].id,
    similarGrievanceId: garbageGrievances[0].id,
    similarityScore: 0.92 + Math.random() * 0.07,
    detectedAt: new Date().toISOString()
  });
}

// Add some notifications
store.notifications.push({
  id: 'notif-001',
  userId: 'usr-officer-001',
  title: 'Incident Detected',
  message: 'A cluster of 16 water supply complaints has been detected in Ward 12.',
  type: 'new_assignment',
  read: false,
  createdAt: new Date().toISOString()
});

store.notifications.push({
  id: 'notif-002',
  userId: 'usr-citizen-001',
  title: 'Grievance Resolved',
  message: 'Your streetlight complaint has been resolved.',
  type: 'complaint_resolved',
  grievanceId: resolvedG.id,
  read: false,
  createdAt: new Date().toISOString()
});

}

// --- HELPER FUNCTIONS ---

export function findUserByEmail(email: string): User | undefined {
  return store.users.find(u => u.email === email);
}

export function findUserById(id: string): User | undefined {
  return store.users.find(u => u.id === id);
}

export function findGrievanceById(id: string): Grievance | undefined {
  return store.grievances.find(g => g.id === id);
}

export function getGrievancesByUser(userId: string): Grievance[] {
  return store.grievances.filter(g => g.citizenId === userId);
}

export function getGrievancesByDepartment(deptId: string): Grievance[] {
  return store.grievances.filter(g => g.departmentId === deptId);
}

export function getGrievancesByOfficer(officerId: string): Grievance[] {
  return store.grievances.filter(g => g.assignedOfficerId === officerId);
}

export function getNotificationsByUser(userId: string): Notification[] {
  return store.notifications.filter(n => n.userId === userId);
}

export function getAnalysisByGrievance(grievanceId: string): GrievanceAnalysis | undefined {
  return store.analyses.find(a => a.grievanceId === grievanceId);
}

export function getRecommendationByGrievance(grievanceId: string): AIRecommendation | undefined {
  return store.recommendations.find(r => r.grievanceId === grievanceId);
}

export function getDuplicatesForGrievance(grievanceId: string): DuplicateLink[] {
  return store.duplicateLinks.filter(d => d.grievanceId === grievanceId || d.similarGrievanceId === grievanceId);
}

export function getStatusHistory(grievanceId: string): StatusHistoryEntry[] {
  return store.statusHistory.filter(h => h.grievanceId === grievanceId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function getInternalNotes(grievanceId: string): InternalNote[] {
  return store.internalNotes.filter(n => n.grievanceId === grievanceId);
}

export function getCitizenUpdates(grievanceId: string): CitizenUpdate[] {
  return store.citizenUpdates.filter(u => u.grievanceId === grievanceId);
}

export function getFeedbackByGrievance(grievanceId: string): Feedback | undefined {
  return store.feedback.find(f => f.grievanceId === grievanceId);
}

export function addGrievance(grievance: Grievance): void {
  store.grievances.push(grievance);
}

export function updateGrievance(id: string, updates: Partial<Grievance>): Grievance | undefined {
  const idx = store.grievances.findIndex(g => g.id === id);
  if (idx !== -1) {
    store.grievances[idx] = { ...store.grievances[idx], ...updates, updatedAt: new Date().toISOString() };
    return store.grievances[idx];
  }
  return undefined;
}

export function addNotification(notification: Notification): void {
  store.notifications.push(notification);
}

export function addStatusHistory(entry: StatusHistoryEntry): void {
  store.statusHistory.push(entry);
}

export function addAuditLog(log: AuditLog): void {
  store.auditLogs.push(log);
}

export function addAnalysis(analysis: GrievanceAnalysis): void {
  store.analyses.push(analysis);
}

export function addRecommendation(rec: AIRecommendation): void {
  store.recommendations.push(rec);
}
