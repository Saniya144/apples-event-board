// import type { IEventRepository } from "./EventRepository";
// import type { IEvent } from "../model/Event";
// import { Ok, Err, type Result } from "../lib/result";
// import {
//   EventDependencyError,
//   EventNotFoundError,
//   type EventError,
// } from "../events/errors";

// class InMemoryEventRepository implements IEventRepository {
//   private readonly events: IEvent[] = [
//   {
//     id: "event-1",
//     title: "Board Game Night",
//     description: "Games and snacks",
//     location: "Campus Center",
//     category: "Social",
//     status: "draft",
//     capacity: 20,
//     startDatetime: "2026-04-16T18:00:00.000Z",
//     endDatetime: "2026-04-16T20:00:00.000Z",
//     organizerId: "staff@app.test",
//     createdAt: "2026-04-13T10:00:00.000Z",
//     updatedAt: "2026-04-13T10:00:00.000Z",
//   },
// ];

//   async create(event: IEvent): Promise<Result<IEvent, EventError>> {
//     try {
//       this.events.push(event);
//       return Ok(event);
//     } catch {
//       return Err(EventDependencyError("Unable to create event."));
//     }
//   }

//   async findById(id: string): Promise<Result<IEvent | null, EventError>> {
//     try {
//       const match = this.events.find((e) => e.id === id) ?? null;
//       return Ok(match);
//     } catch {
//       return Err(EventDependencyError("Unable to find event."));
//     }
//   }

//   async update(event: IEvent): Promise<Result<IEvent, EventError>> {
//     try {
//       const index = this.events.findIndex((e) => e.id === event.id);

//       if (index === -1) {
//         return Err(EventNotFoundError("Event not found."));
//       }

//       this.events[index] = event;
//       return Ok(event);
//     } catch {
//       return Err(EventDependencyError("Unable to update event."));
//     }
//   }

//   async getAll(): Promise<IEvent[]> {
//     return this.events;
//   }
// }

// export function CreateInMemoryEventRepository(): IEventRepository {
//   return new InMemoryEventRepository();
// }

import type { IEventRepository, EventWithAttendeeCount } from "./EventRepository";
import type { IEvent } from "../model/Event";
import { Ok, Err, type Result } from "../lib/result";
import {
  EventDependencyError,
  EventNotFoundError,
  type EventError,
} from "../events/errors";

export class InMemoryEventRepository implements IEventRepository {
  private readonly events: IEvent[] = [
    {
      id: "event-1",
      title: "Board Game Night",
      description: "Games and snacks",
      location: "Campus Center",
      category: "Social",
      status: "draft",
      capacity: 20,
      startDatetime: "2026-04-16T18:00:00.000Z",
      endDatetime: "2026-04-16T20:00:00.000Z",
      organizerId: "user-staff",
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    },
    {
      id: "event-2",
      title: "Open Mic Night",
      description: "Music, poetry, and comedy",
      location: "Student Union",
      category: "Arts",
      status: "published",
      capacity: 50,
      startDatetime: "2026-04-22T19:00:00.000Z",
      endDatetime: "2026-04-22T21:00:00.000Z",
      organizerId: "user-staff",
      createdAt: "2026-04-14T10:00:00.000Z",
      updatedAt: "2026-04-14T10:00:00.000Z",
    },
  ];

  async create(event: IEvent): Promise<Result<IEvent, EventError>> {
    try {
      this.events.push(event);
      return Ok(event);
    } catch {
      return Err(EventDependencyError("Unable to create event."));
    }
  }

  async findById(id: string): Promise<Result<IEvent | null, EventError>> {
    try {
      const match = this.events.find((e) => e.id === id) ?? null;
      return Ok(match);
    } catch {
      return Err(EventDependencyError("Unable to find event."));
    }
  }

  async update(event: IEvent): Promise<Result<IEvent, EventError>> {
    try {
      const index = this.events.findIndex((e) => e.id === event.id);

      if (index === -1) {
        return Err(EventNotFoundError("Event not found."));
      }

      this.events[index] = event;
      return Ok(event);
    } catch {
      return Err(EventDependencyError("Unable to update event."));
    }
  }

  async findFilteredPublishedUpcoming(filters: {
    category?: string;
    date?: "all" | "week" | "weekend";
  }): Promise<IEvent[]> {
    const now = new Date();

    return this.events
      .filter((event) => event.status === "published")
      .filter((event) => new Date(event.startDatetime) >= now)
      .filter((event) => {
        if (!filters.category?.trim()) return true;
        return event.category === filters.category.trim();
      })
      .filter((event) => {
        if (!filters.date || filters.date === "all") return true;

        const eventDate = new Date(event.startDatetime);

        if (filters.date === "week") {
          const endOfWeek = new Date(now);
          endOfWeek.setDate(now.getDate() + 7);
          endOfWeek.setHours(23, 59, 59, 999);

          return eventDate >= now && eventDate <= endOfWeek;
        }

        if (filters.date === "weekend") {
          const saturday = new Date(now);
          const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
          saturday.setDate(now.getDate() + daysUntilSaturday);
          saturday.setHours(0, 0, 0, 0);

          const sunday = new Date(saturday);
          sunday.setDate(saturday.getDate() + 1);
          sunday.setHours(23, 59, 59, 999);

          return eventDate >= saturday && eventDate <= sunday;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.startDatetime).getTime() -
          new Date(b.startDatetime).getTime()
      );
  }

  async searchPublishedUpcoming(query?: string): Promise<IEvent[]> {
    const q = query?.trim()?.toLowerCase();

    return this.events
      .filter((event) => event.status === "published")
      .filter((event) => {
        if (!q) return true;

        return (
          event.title.toLowerCase().includes(q) ||
          event.description.toLowerCase().includes(q) ||
          event.location.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(a.startDatetime).getTime() -
          new Date(b.startDatetime).getTime()
      );
  }

  async getAll(): Promise<IEvent[]> {
    return this.events;
  }

  async getAllWithAttendeeCount(
    filterByOrganizerId?: string,
  ): Promise<EventWithAttendeeCount[]> {
    const filteredEvents = filterByOrganizerId
      ? this.events.filter((event) => event.organizerId === filterByOrganizerId)
      : this.events;

    const attendeeCounts = new Map<string, number>();

    for (const rsvp of this.rsvps) {
      if (rsvp.status === "going") {
        attendeeCounts.set(rsvp.eventId, (attendeeCounts.get(rsvp.eventId) ?? 0) + 1);
      }
    }

    return filteredEvents.map((event) => ({
      ...event,
      attendeeCount: attendeeCounts.get(event.id) ?? 0,
    }));
  }
}

export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository();
}