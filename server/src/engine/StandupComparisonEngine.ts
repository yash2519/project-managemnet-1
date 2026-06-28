/**
 * StandupComparisonEngine
 *
 * Pure TypeScript computation layer — no database calls, no React.
 * Accepts two fully-loaded StandupReport records and returns a structured
 * comparison result that the frontend renders as a diff view.
 *
 * Designed to be consumed by:
 *   - GET /projects/:projectId/standup/compare  (server-side)
 *   - Future AI Retrospective Generator (as historical context diff)
 */

// ─── Input types (mirror schema.prisma StandupReport shape) ──────────────────

export interface StandupSummary {
  yesterday: string;
  today: string;
  blockers: string;
  teamSummary: string;
}

export interface StandupReportInput {
  id: number;
  date: Date | string;
  summary: StandupSummary;
  generatedStandup: string;
  aiRecommendations: string[];
  analysisContext: any;          // Raw AnalysisContext JSON stored at generation time
  generatedAt: Date | string;
  isRegenerated: boolean;
  generationVersion: string;
  author?: { username: string };
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface TextChangeDiff {
  /** The section name (e.g. "yesterday", "today", "blockers") */
  section: string;
  before: string;
  after: string;
  /** Rough word-count delta (positive = more content, negative = less) */
  wordDelta: number;
  /** Whether the text changed at all */
  changed: boolean;
}

export interface WorkloadDiff {
  totalMembersDelta: number;
  totalActiveTasksDelta: number;
  totalCompletedTasksDelta: number;
  totalBlockedTasksDelta: number;
  overloadedMembersDelta: number;
  idleMembersDelta: number;
}

export interface RecommendationDiff {
  added: string[];      // In B but not A
  removed: string[];    // In A but not B
  retained: string[];   // In both (approximate string similarity)
}

export interface ChangeStatistics {
  totalSectionsChanged: number;
  workloadImproved: boolean;   // fewer blocked + fewer overloaded
  blockersIncreased: boolean;
  recommendationsRotated: boolean;
  riskTrend: "improved" | "degraded" | "stable";
}

export interface StandupComparisonResult {
  dateA: string;
  dateB: string;
  reportIdA: number;
  reportIdB: number;

  /** Per-section narrative diffs */
  narrativeDiffs: TextChangeDiff[];

  /** Derived workload deltas (from analysisContext) */
  workloadDiff: WorkloadDiff | null;

  /** AI recommendation set changes */
  recommendationDiff: RecommendationDiff;

  /** High-level change statistics */
  statistics: ChangeStatistics;

  /** Health score delta if available in analysisContext */
  healthScoreDelta: number | null;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class StandupComparisonEngine {
  /**
   * Compare two standup reports. `reportA` is the older / baseline report,
   * `reportB` is the newer report we are comparing against.
   */
  public compare(
    reportA: StandupReportInput,
    reportB: StandupReportInput
  ): StandupComparisonResult {
    const summaryA = this.normaliseSummary(reportA.summary);
    const summaryB = this.normaliseSummary(reportB.summary);

    const narrativeDiffs = this.diffNarratives(summaryA, summaryB);
    const workloadDiff = this.diffWorkload(reportA.analysisContext, reportB.analysisContext);
    const recommendationDiff = this.diffRecommendations(
      reportA.aiRecommendations ?? [],
      reportB.aiRecommendations ?? []
    );
    const healthScoreDelta = this.diffHealthScore(reportA.analysisContext, reportB.analysisContext);
    const statistics = this.computeStatistics(narrativeDiffs, workloadDiff, recommendationDiff);

    return {
      dateA: typeof reportA.date === "string" ? reportA.date : reportA.date.toISOString(),
      dateB: typeof reportB.date === "string" ? reportB.date : reportB.date.toISOString(),
      reportIdA: reportA.id,
      reportIdB: reportB.id,
      narrativeDiffs,
      workloadDiff,
      recommendationDiff,
      statistics,
      healthScoreDelta,
    };
  }

  // ─── Narrative diff ─────────────────────────────────────────────────────────

  private normaliseSummary(raw: any): StandupSummary {
    if (!raw) {
      return { yesterday: "", today: "", blockers: "", teamSummary: "" };
    }
    return {
      yesterday: String(raw.yesterday ?? ""),
      today: String(raw.today ?? ""),
      blockers: String(raw.blockers ?? ""),
      teamSummary: String(raw.teamSummary ?? ""),
    };
  }

  private diffNarratives(a: StandupSummary, b: StandupSummary): TextChangeDiff[] {
    const sections: Array<keyof StandupSummary> = ["yesterday", "today", "blockers", "teamSummary"];
    return sections.map((section) => {
      const before = a[section];
      const after = b[section];
      const wordsBefore = this.countWords(before);
      const wordsAfter = this.countWords(after);
      return {
        section,
        before,
        after,
        wordDelta: wordsAfter - wordsBefore,
        changed: before.trim() !== after.trim(),
      };
    });
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  // ─── Workload diff ──────────────────────────────────────────────────────────

  private extractWorkload(ctx: any): {
    totalMembers: number;
    totalActiveTasks: number;
    totalCompletedTasks: number;
    totalBlockedTasks: number;
    overloadedMembers: number;
    idleMembers: number;
  } | null {
    // analysisContext structure: { analytics: { workload: { teamSummary: {...}, workloadStatistics: {...} } } }
    // Backwards compatible with legacy { workloadSummary: {...} }
    const ws = ctx?.analytics?.workload || ctx?.workloadSummary;
    if (!ws) return null;
    return {
      totalMembers: ws.teamSummary?.totalMembers ?? 0,
      totalActiveTasks: ws.teamSummary?.totalActiveTasks ?? 0,
      totalCompletedTasks: ws.teamSummary?.totalCompletedTasks ?? 0,
      totalBlockedTasks: ws.teamSummary?.totalBlockedTasks ?? 0,
      overloadedMembers: ws.workloadStatistics?.overloadedMembers?.length ?? 0,
      idleMembers: ws.workloadStatistics?.idleMembers?.length ?? 0,
    };
  }

  private diffWorkload(ctxA: any, ctxB: any): WorkloadDiff | null {
    const wA = this.extractWorkload(ctxA);
    const wB = this.extractWorkload(ctxB);
    if (!wA || !wB) return null;
    return {
      totalMembersDelta: wB.totalMembers - wA.totalMembers,
      totalActiveTasksDelta: wB.totalActiveTasks - wA.totalActiveTasks,
      totalCompletedTasksDelta: wB.totalCompletedTasks - wA.totalCompletedTasks,
      totalBlockedTasksDelta: wB.totalBlockedTasks - wA.totalBlockedTasks,
      overloadedMembersDelta: wB.overloadedMembers - wA.overloadedMembers,
      idleMembersDelta: wB.idleMembers - wA.idleMembers,
    };
  }

  // ─── Recommendation diff ────────────────────────────────────────────────────

  private diffRecommendations(recA: string[], recB: string[]): RecommendationDiff {
    const setA = new Set(recA.map((r) => r.trim()));
    const setB = new Set(recB.map((r) => r.trim()));
    const added = recB.filter((r) => !setA.has(r.trim()));
    const removed = recA.filter((r) => !setB.has(r.trim()));
    const retained = recA.filter((r) => setB.has(r.trim()));
    return { added, removed, retained };
  }

  // ─── Health score diff ──────────────────────────────────────────────────────

  private extractHealthScore(ctx: any): number | null {
    const health = ctx?.analytics?.health || ctx?.healthSummary;
    const score = health?.overallScore ?? health?.score;
    return typeof score === "number" ? score : null;
  }

  private diffHealthScore(ctxA: any, ctxB: any): number | null {
    const scoreA = this.extractHealthScore(ctxA);
    const scoreB = this.extractHealthScore(ctxB);
    if (scoreA === null || scoreB === null) return null;
    return Math.round((scoreB - scoreA) * 10) / 10;
  }

  // ─── Statistics ─────────────────────────────────────────────────────────────

  private computeStatistics(
    narrativeDiffs: TextChangeDiff[],
    workloadDiff: WorkloadDiff | null,
    recDiff: RecommendationDiff
  ): ChangeStatistics {
    const totalSectionsChanged = narrativeDiffs.filter((d) => d.changed).length;
    const blockersSection = narrativeDiffs.find((d) => d.section === "blockers");
    const blockersIncreased = !!blockersSection?.changed && (blockersSection.wordDelta ?? 0) > 5;

    const workloadImproved = workloadDiff
      ? workloadDiff.totalBlockedTasksDelta <= 0 && workloadDiff.overloadedMembersDelta <= 0
      : false;

    const recommendationsRotated =
      recDiff.added.length > 0 || recDiff.removed.length > 0;

    let riskTrend: "improved" | "degraded" | "stable" = "stable";
    if (workloadDiff) {
      const blockedDown = workloadDiff.totalBlockedTasksDelta < 0;
      const blockedUp = workloadDiff.totalBlockedTasksDelta > 0;
      const overloadedDown = workloadDiff.overloadedMembersDelta < 0;
      const overloadedUp = workloadDiff.overloadedMembersDelta > 0;

      if ((blockedDown || !blockersIncreased) && (overloadedDown || workloadDiff.overloadedMembersDelta === 0)) {
        riskTrend = "improved";
      } else if (blockedUp || overloadedUp || blockersIncreased) {
        riskTrend = "degraded";
      }
    }

    return {
      totalSectionsChanged,
      workloadImproved,
      blockersIncreased,
      recommendationsRotated,
      riskTrend,
    };
  }
}

export const standupComparisonEngine = new StandupComparisonEngine();
