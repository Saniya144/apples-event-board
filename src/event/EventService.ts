import { Result, Ok, Err } from "../lib/result";
import type { IEventRepository } from "../repository/EventRepository";
import type { IRsvpRepository } from "../repository/RsvpRepository";
import type { IEvent } from "../model/Event";
import type { UserRole } from "../auth/User";

export interface OrganizerDashboardInput {
  actingUserId: string;
  actingUserRole: UserRole;
}

export interface OrganizerDashboardEvent extends IEvent {
  attendeeCount: number;
  statusGroup: "published" | "draft" | "cancelledOrPast";
  canPublish: boolean;
  canCancel: boolean;
}

export type EventError =
  | { type: "ORGANIZER_NOT_FOUND" }
  | { type: "UNAUTHORIZED" }
  | { type: "UNEXPECTED_ERROR"; message: string };

export class EventService {
  constructor(
    private readonly eventRepository: IEventRepository,
    private readonly rsvpRepository: IRsvpRepository,
  ) {}

  async getEventsForOrganizer(
    input: OrganizerDashboardInput,
  ): Promise<Result<OrganizerDashboardEvent[], EventError>> {
    if (!input.actingUserId) {
      return Err({ type: "ORGANIZER_NOT_FOUND" } as EventError);
    }

    if (input.actingUserRole === "user") {
      return Err({ type: "UNAUTHORIZED" } as EventError);
    }

    try {
      const allEvents = await this.eventRepository.getAll();
      const visibleEvents =
        input.actingUserRole === "admin"
          ? allEvents
          : allEvents.filter((event) => event.organizerId === input.actingUserId);

      const now = new Date();

      const eventsWithStats = await Promise.all(
        visibleEvents.map(async (event) => {
          const attendeeCount = await this.rsvpRepository.countGoingByEvent(event.id);
          const isPast = new Date(event.endDatetime) < now;
          const statusGroup: OrganizerDashboardEvent["statusGroup"] =
            event.status === "cancelled" || isPast
              ? "cancelledOrPast"
              : event.status === "draft"
                ? "draft"
                : "published";

          const canManage =
            input.actingUserRole === "admin" || event.organizerId === input.actingUserId;

          return {
            ...event,
            attendeeCount,
            statusGroup,
            canPublish: canManage && event.status === "draft",
            canCancel: canManage && event.status === "published" && !isPast,
          } as OrganizerDashboardEvent;
        }),
      );

      return Ok(eventsWithStats);
    } catch (e) {
      return Err({
        type: "UNEXPECTED_ERROR",
        message: e instanceof Error ? e.message : "Unknown error",
      } as EventError);
    }
  }
}
