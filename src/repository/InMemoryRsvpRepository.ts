import type { Rsvp, RsvpStatus } from "../model/Rsvp";
import type { IEvent } from "../model/Event";
import { IRsvpRepository, type RsvpWithEvent } from "./RsvpRepository";

type EventSummary = Pick<
  IEvent,
  "id" | "title" | "location" | "startDatetime" | "endDatetime" | "category" | "status"
>;

class InMemoryRsvpRepository implements IRsvpRepository {
  private readonly rsvps = new Map<string, Rsvp>();
  private readonly eventStubs = new Map<string, EventSummary>();
  private nextId = 1;

  upsertEventStub(event: EventSummary): void {
    this.eventStubs.set(event.id, event);
  }

  async findByEventAndUser(eventId: string, userId: string): Promise<Rsvp | null> {
    for (const rsvp of this.rsvps.values()) {
      if (rsvp.eventId === eventId && rsvp.userId === userId) {
        return rsvp;
      }
    }
    return null;
  }

  async create(input: Omit<Rsvp, "id" | "createdAt">): Promise<Rsvp> {
    const rsvp: Rsvp = {
      id: String(this.nextId++),
      eventId: input.eventId,
      userId: input.userId,
      status: input.status,
      createdAt: new Date().toISOString(),
    };

    this.rsvps.set(rsvp.id, rsvp);
    return rsvp;
  }

  async updateStatus(id: string, status: RsvpStatus): Promise<Rsvp | null> {
    const existing = this.rsvps.get(id);
    if (!existing) {
      return null;
    }

    const updated: Rsvp = {
      ...existing,
      status,
    };

    this.rsvps.set(id, updated);
    return updated;
  }

  async listByEvent(eventId: string): Promise<Rsvp[]> {
    const matches: Rsvp[] = [];

    for (const rsvp of this.rsvps.values()) {
      if (rsvp.eventId === eventId) {
        matches.push(rsvp);
      }
    }

    return matches;
  }

  async findByUserId(userId: string): Promise<RsvpWithEvent[]> {
    const results: RsvpWithEvent[] = [];

    for (const rsvp of this.rsvps.values()) {
      if (rsvp.userId !== userId) continue;

      const event = this.eventStubs.get(rsvp.eventId);
      if (!event) continue;

      results.push({ ...rsvp, event });
    }

    results.sort(
      (a, b) => new Date(a.event.startDatetime).getTime() - new Date(b.event.startDatetime).getTime()
    );

    return results;
  }

  async save(rsvp: Rsvp): Promise<Rsvp> {
    this.rsvps.set(rsvp.id, rsvp);
    return rsvp;
  }

  async delete(id: string): Promise<void> {
    this.rsvps.delete(id);
  }

  async countGoingByEvent(eventId: string): Promise<number> {
    let count = 0;

    for (const rsvp of this.rsvps.values()) {
      if (rsvp.eventId === eventId && rsvp.status === "going") {
        count += 1;
      }
    }

    return count;
  }

  async findEarliestWaitlisted(eventId: string): Promise<Rsvp | null> {
  const waitlisted = [...this.rsvps.values()].filter(
    (r) => r.eventId === eventId && r.status === "waitlisted"
  );

  if (waitlisted.length === 0) return null;

  // Sort by createdAt ascending — earliest = first in queue
  waitlisted.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return waitlisted[0];
}
}

export function CreateInMemoryRsvpRepository(): IRsvpRepository {
  return new InMemoryRsvpRepository();
}