import { activityCollectionEngine, ActivityTimelineEvent, ActivityChangeDetail } from "./ActivityCollectionEngine";

export interface DailyTimelineFormattedEvent {
  id: number;
  actor: string;
  action: string;
  taskTitle: string | null;
  previousValue: string | null;
  newValue: string | null;
  timestamp: string;
}

export interface DailyTimelineGroup {
  period: "Morning" | "Afternoon" | "Evening";
  events: DailyTimelineFormattedEvent[];
}

export interface DailyTimelineResponseDTO {
  projectId: number;
  date: string;
  timeline: DailyTimelineGroup[];
}

export class DailyTimelineBuilder {
  /**
   * Builds a chronological daily timeline of project activity grouped by time of day.
   * Leverages the optimized ActivityCollectionEngine.
   */
  public async buildDailyTimeline(projectId: number, date?: string): Promise<DailyTimelineResponseDTO> {
    // 1. Fetch normalized activity data using the existing engine
    const collection = await activityCollectionEngine.collectForDate(projectId, date);

    const morning: DailyTimelineFormattedEvent[] = [];
    const afternoon: DailyTimelineFormattedEvent[] = [];
    const evening: DailyTimelineFormattedEvent[] = [];

    // 2. Iterate and group by time
    for (const event of collection.events) {
      const formatted = this.formatEvent(event);
      const hour = new Date(event.timestamp).getUTCHours(); // Assuming timeline grouping happens based on UTC or server time

      // Standard grouping
      if (hour < 12) {
        morning.push(formatted);
      } else if (hour < 17) {
        afternoon.push(formatted);
      } else {
        evening.push(formatted);
      }
    }

    return {
      projectId,
      date: collection.date,
      timeline: [
        { period: "Morning", events: morning },
        { period: "Afternoon", events: afternoon },
        { period: "Evening", events: evening }
      ]
    };
  }

  private formatEvent(event: ActivityTimelineEvent): DailyTimelineFormattedEvent {
    let previousValue: string | null = null;
    let newValue: string | null;

    if (event.changeDetail) {
      const d = event.changeDetail;
      switch (d.kind) {
        case "STATUS_CHANGED":
        case "PRIORITY_CHANGED":
        case "ASSIGNEE_CHANGED":
          previousValue = d.from;
          newValue = d.to;
          break;
        case "COMMENT_ADDED":
          newValue = d.commentText;
          break;
        case "DEPENDENCY_CREATED":
        case "DEPENDENCY_REMOVED":
          newValue = `${d.kind.replace("DEPENDENCY_", "")} (Pred: ${d.predecessorId}, Succ: ${d.successorId})`;
          break;
        case "GENERIC":
        default:
          newValue = event.summary;
          break;
      }
    } else {
      newValue = event.summary;
    }

    return {
      id: event.id,
      actor: event.actor?.username || "System",
      action: event.eventType,
      taskTitle: event.task?.title || null,
      previousValue,
      newValue,
      timestamp: event.timestamp
    };
  }
}

export const dailyTimelineBuilder = new DailyTimelineBuilder();
