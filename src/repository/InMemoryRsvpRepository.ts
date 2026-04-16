import type { Rsvp, RsvpStatus } from "../model/Rsvp";
import { IRsvpRepository } from "./RsvpRepository";

class InMemoryRsvpRepository implements IRsvpRepository {
  private readonly rsvps = new Map<string, Rsvp>();
  private nextId = 1;

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