/** Shape of /api/org-summary (shared by the report and grants pages). */
export interface OrgSummary {
  org: string;
  runs: number;
  yearFrom: number | null;
  yearTo: number | null;
  programs: string[];
  prisons: { code: string; name: string; underserved: boolean }[];
  byYear: { year: number; participantHours: number; participants: number; completed: number }[];
  byPrison: {
    code: string;
    name: string;
    underserved: boolean;
    womens: boolean;
    runs: number;
    participants: number;
    completed: number;
    participantHours: number;
  }[];
  priorService: { window: number[]; yearsWithProgramming: number[]; meets: boolean };
  signals: {
    underservedInstitutions: string[];
    specialPopulationRuns: number;
    languages: string[];
    criteria: { underserved: boolean; specialPopulations: boolean; nonEnglish: boolean };
    additionalPoints: number;
  };
  numbers: {
    programmingHours: number;
    participants: number;
    completed: number;
    participantHours: number;
    completionRate: number | null;
    completedRuns: number;
    inProgressRuns: number;
  };
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
/** 1,234 → "1.2K", 24,000 → "24K"; below 1,000 unchanged. */
export const compact = (n: number) => (Math.abs(n) >= 1000 ? `${Number((n / 1000).toFixed(1))}K` : fmt(n));
