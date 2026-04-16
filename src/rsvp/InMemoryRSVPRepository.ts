import {
  RSVP,
  RSVPRepository,
  RSVPWithEvent,
  EventSummary,
} from "./RSVPRepository";

// In Sprints 1-2 events are owned by the EventRepository.
// We keep a local stub map here so the dashboard can join RSVP → Event
// without coupling to EventService. In Sprint 3, Prisma handles the join.
const rsvps: Map<string, RSVP> = new Map();
const eventStubs: Map<string, EventSummary> = new Map();

export class InMemoryRSVPRepository implements RSVPRepository {
  // Seed or update an event stub so RSVPs can resolve event details.
  // Call this from EventService whenever an event is created/updated.
  upsertEventStub(event: EventSummary): void {
    eventStubs.set(event.id, event);
  }

  async findByUserId(userId: string): Promise<RSVPWithEvent[]> {
    const results: RSVPWithEvent[] = [];

    for (const rsvp of rsvps.values()) {
      if (rsvp.userId !== userId) continue;

      const event = eventStubs.get(rsvp.eventId);
      if (!event) continue; // orphaned RSVP — skip silently

      results.push({ ...rsvp, event });
    }

    // Sort by event start time ascending
    results.sort(
      (a, b) =>
        a.event.startDatetime.getTime() - b.event.startDatetime.getTime(),
    );

    return results;
  }

  async findByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<RSVP | null> {
    for (const rsvp of rsvps.values()) {
      if (rsvp.eventId === eventId && rsvp.userId === userId) return rsvp;
    }
    return null;
  }

  async save(rsvp: RSVP): Promise<RSVP> {
    rsvps.set(rsvp.id, rsvp);
    return rsvp;
  }
}
