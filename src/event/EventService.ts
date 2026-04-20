import { Result, Ok, Err } from "../lib/result";
import type { IEventRepository } from "../repository/EventRepository";
import type { IEvent } from "../model/Event";

export type EventError =
  | { type: "ORGANIZER_NOT_FOUND" }
  | { type: "UNEXPECTED_ERROR"; message: string };

export class EventService {
  constructor(private readonly eventRepository: IEventRepository) {}

  async getEventsForOrganizer(
    organizerId: string,
  ): Promise<Result<IEvent[], EventError>> {
    if (!organizerId) {
      return Err({ type: "ORGANIZER_NOT_FOUND" } as EventError);
    }

    try {
      const allEvents = await this.eventRepository.getAll();
      const events = allEvents.filter(
        (event) => event.organizerId === organizerId
      );
      return Ok(events);
    } catch (e) {
      return Err({
        type: "UNEXPECTED_ERROR",
        message: e instanceof Error ? e.message : "Unknown error",
      } as EventError);
    }
  }
}
