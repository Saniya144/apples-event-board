import { Result, Ok, Err } from "../lib/result";
import { EventRepository, Event } from "./EventRepository";

export type EventError =
  | { type: "ORGANIZER_NOT_FOUND" }
  | { type: "UNEXPECTED_ERROR"; message: string };

export class EventService {
  constructor(private readonly eventRepository: EventRepository) {}

  async getEventsForOrganizer(
    organizerId: string,
  ): Promise<Result<Event[], EventError>> {
    if (!organizerId) {
      return Err({ type: "ORGANIZER_NOT_FOUND" } as EventError);
    }

    try {
      const events = await this.eventRepository.findByOrganizerId(organizerId);
      return Ok(events);
    } catch (e) {
      return Err({
        type: "UNEXPECTED_ERROR",
        message: e instanceof Error ? e.message : "Unknown error",
      } as EventError);
    }
  }
}
