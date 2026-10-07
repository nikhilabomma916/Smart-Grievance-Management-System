export const DEPARTMENT_IDS = [
  'dept-water',
  'dept-roads',
  'dept-sanitation',
  'dept-electrical',
  'dept-safety',
  'dept-health',
  'dept-edu',
  'dept-transport',
] as const;

export const DEPARTMENT_NAMES: Record<string, string> = {
  'dept-water': 'Water Supply',
  'dept-roads': 'Roads & Infrastructure',
  'dept-sanitation': 'Sanitation',
  'dept-electrical': 'Electrical',
  'dept-safety': 'Public Safety',
  'dept-health': 'Healthcare',
  'dept-edu': 'Education',
  'dept-transport': 'Transport',
};

export const CATEGORY_NAMES: Record<string, string> = {
  'cat-water-supply': 'Water Supply',
  'cat-sewerage': 'Sewerage/Drainage',
  'cat-potholes': 'Potholes/Roads',
  'cat-footpaths': 'Footpaths',
  'cat-garbage': 'Garbage Collection',
  'cat-public-toilets': 'Public Toilets',
  'cat-streetlights': 'Streetlights',
  'cat-power': 'Power/Electricity',
  'cat-hazards': 'Safety Hazards',
  'cat-stray-animals': 'Stray Animals',
  'cat-health': 'Public Health',
  'cat-schools': 'Public Schools',
  'cat-transit': 'Public Transit',
};
