import type { IEventRepository } from "./EventRepository";
import type { IEvent } from "../model/Event";
import { Ok, Err, type Result } from "../lib/result";
import {
  EventDependencyError,
  EventNotFoundError,
  type EventError,
} from "../events/errors";

class InMemoryEventRepository implements IEventRepository {
  private readonly events: IEvent[] = [];

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