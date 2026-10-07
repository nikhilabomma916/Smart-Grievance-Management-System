import { Grievance, Incident } from '@/lib/types';

export function detectIncidents(grievances: Grievance[]): Incident[] {
  const clusters: Record<string, Grievance[]> = {};
  
  // Group complaints by category and ward
  for (const g of grievances) {
    if (!g.location?.ward) continue;
    
    const cat = g.categoryId || g.category || 'general';
    const key = `${cat}-${g.location.ward}`;
    if (!clusters[key]) {
      clusters[key] = [];
    }
    clusters[key].push(g);
  }
  
  const incidents: Incident[] = [];
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  
  for (const [key, clusterGrievances] of Object.entries(clusters)) {
    // If cluster has 5+ complaints, flag as potential incident
    if (clusterGrievances.length < 5) continue;
    
    // Sort by date
    clusterGrievances.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    let windowStart = 0;
    for (let i = 0; i < clusterGrievances.length; i++) {
      const gStart = new Date(clusterGrievances[windowStart].createdAt).getTime();
      const gCurrent = new Date(clusterGrievances[i].createdAt).getTime();
      
      // Time window (7 days)
      if (gCurrent - gStart > sevenDaysInMs) {
        windowStart = i;
      }
      
      const windowSize = i - windowStart + 1;
      if (windowSize >= 5) {
        const [category, ward] = key.split('-');
        
        const clusterSubset = clusterGrievances.slice(windowStart, i + 1);
        
        incidents.push({
          id: `inc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: `Cluster: Recurring ${category} in Ward ${ward}`,
          description: `Detected cluster of ${windowSize} complaints within a 7-day window indicating a potential larger incident.`,
          categoryId: category,
          category,
          ward,
          status: 'OPEN',
          severity: 'HIGH',
          priority: 'HIGH',
          location: { ward },
          grievanceIds: clusterSubset.map(g => g.id),
          relatedGrievanceIds: clusterSubset.map(g => g.id),
          totalComplaints: windowSize,
          complaintCount: windowSize,
          estimatedAffected: windowSize * 25,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          affectedCount: clusterSubset.length
        });
        
        break; // Identify one incident per area/category to avoid overlap in this basic implementation
      }
    }
  }
  
  return incidents;
}
