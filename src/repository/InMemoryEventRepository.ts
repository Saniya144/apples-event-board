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

import type { IEventRepository } from "./EventRepository";
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
      organizerId: "user-admin",
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

  async getAll(): Promise<IEvent[]> {
    return this.events;
  }
}

export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository();
}