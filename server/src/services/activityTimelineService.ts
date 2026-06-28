import { activityCollectionEngine, ActivityTimelineResponseDTO } from "../engine/ActivityCollectionEngine";

/**
 * ActivityTimelineService
 *
 * Thin orchestration layer between the controller and the ActivityCollectionEngine.
 * Keeps the controller free of engine-level logic while allowing future extensions
 * (e.g. caching, merging sources) without touching the controller.
 */
export class ActivityTimelineService {
  /**
   * Returns a normalized activity timeline for a project on a specific date.
   *
   * @param projectId  Target project ID
   * @param date       YYYY-MM-DD in UTC (defaults to today if omitted)
   */
  public async getTimeline(
    projectId: number,
    date?: string
  ): Promise<ActivityTimelineResponseDTO> {
    return activityCollectionEngine.collectForDate(projectId, date);
  }

  /**
   * Returns a normalized activity timeline for a project over a date range.
   *
   * @param projectId  Target project ID
   * @param from       YYYY-MM-DD start date (UTC, inclusive)
   * @param to         YYYY-MM-DD end date (UTC, inclusive)
   */
  public async getTimelineRange(
    projectId: number,
    from: string,
    to: string
  ): Promise<ActivityTimelineResponseDTO> {
    // Guard: from must be before or equal to to
    if (from > to) {
      throw new Error(`"from" date (${from}) must not be after "to" date (${to}).`);
    }
    return activityCollectionEngine.collectForRange(projectId, from, to);
  }
}

export const activityTimelineService = new ActivityTimelineService();
