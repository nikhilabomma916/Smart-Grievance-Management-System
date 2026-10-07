import type { Grievance } from '@/lib/types';

export type DuplicateCandidate = Pick<
  Grievance,
  'id' | 'title' | 'description' | 'categoryId' | 'location' | 'createdAt' | 'status'
>;

const RECENT_COMPLAINT_DAYS = 90;
const POTENTIAL_DUPLICATE_THRESHOLD = 0.5;

function getTerms(text: string): string[] {
  return (text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .filter((term) => term.length > 1);
}

function computeTextSimilarity(text1: string, text2: string): number {
  const terms1 = getTerms(text1);
  const terms2 = getTerms(text2);
  if (terms1.length === 0 || terms2.length === 0) return 0;

  const counts1 = new Map<string, number>();
  const counts2 = new Map<string, number>();
  for (const term of terms1) counts1.set(term, (counts1.get(term) || 0) + 1);
  for (const term of terms2) counts2.set(term, (counts2.get(term) || 0) + 1);

  let dotProduct = 0;
  for (const [term, count] of counts1) {
    dotProduct += count * (counts2.get(term) || 0);
  }
  const magnitude1 = Math.sqrt([...counts1.values()].reduce((sum, value) => sum + value ** 2, 0));
  const magnitude2 = Math.sqrt([...counts2.values()].reduce((sum, value) => sum + value ** 2, 0));
  return dotProduct / (magnitude1 * magnitude2);
}

function normalizeLocation(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase().replace(/\s+/g, ' ') || '';
}

function locationSimilarity(first: DuplicateCandidate['location'], second: DuplicateCandidate['location']): number {
  const firstAddress = normalizeLocation(first.address);
  const secondAddress = normalizeLocation(second.address);
  if (firstAddress && secondAddress && firstAddress === secondAddress) return 1;

  const firstArea = normalizeLocation(first.area);
  const secondArea = normalizeLocation(second.area);
  if (firstArea && secondArea && firstArea === secondArea) return 0.8;

  const firstWard = normalizeLocation(first.ward);
  const secondWard = normalizeLocation(second.ward);
  if (firstWard && secondWard && firstWard === secondWard) return 0.6;

  const firstCity = normalizeLocation(first.city);
  const secondCity = normalizeLocation(second.city);
  return firstCity && secondCity && firstCity === secondCity ? 0.25 : 0;
}

export function scoreComplaintSimilarity(
  complaint: Pick<DuplicateCandidate, 'title' | 'description' | 'categoryId' | 'location'>,
  candidate: Pick<DuplicateCandidate, 'title' | 'description' | 'categoryId' | 'location'>,
): number {
  const textScore = computeTextSimilarity(
    `${complaint.title} ${complaint.description}`,
    `${candidate.title} ${candidate.description}`,
  );
  const categoryScore = complaint.categoryId === candidate.categoryId ? 1 : 0;
  const locationScore = locationSimilarity(complaint.location, candidate.location);
  return Math.min(1, textScore * 0.75 + categoryScore * 0.15 + locationScore * 0.1);
}

export function findSimilarGrievances(
  grievance: DuplicateCandidate,
  candidates: DuplicateCandidate[],
  threshold = POTENTIAL_DUPLICATE_THRESHOLD,
): { grievanceId: string; similarity: number }[] {
  const now = Date.now();
  const recentCutoff = now - RECENT_COMPLAINT_DAYS * 24 * 60 * 60 * 1000;
  const results: { grievanceId: string; similarity: number }[] = [];

  for (const candidate of candidates) {
    if (candidate.id === grievance.id) continue;
    const createdAt = new Date(candidate.createdAt).getTime();
    if (!Number.isFinite(createdAt) || createdAt < recentCutoff || createdAt > now) continue;

    const similarity = scoreComplaintSimilarity(grievance, candidate);
    if (similarity >= threshold) {
      results.push({
        grievanceId: candidate.id,
        similarity: Number(similarity.toFixed(3)),
      });
    }
  }

  return results.sort((first, second) => second.similarity - first.similarity);
}
