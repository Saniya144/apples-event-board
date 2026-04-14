import { Event, EventRepository } from "./EventRepository";

const events: Map<string, Event> = new Map();

export class InMemoryEventRepository implements EventRepository {
  async findByOrganizerId(organizerId: string): Promise<Event[]> {
    const results: Event[] = [];
    for (const event of events.values()) {
      if (event.organizerId === organizerId) {
        results.push(event);
      }
    }
    // Sort by start time ascending
    results.sort(
      (a, b) => a.startDatetime.getTime() - b.startDatetime.getTime(),
    );
    return results;
  }

  async findById(id: string): Promise<Event | null> {
    return events.get(id) ?? null;
  }

  async save(event: Event): Promise<Event> {
    events.set(event.id, event);
    return event;
  }
}
