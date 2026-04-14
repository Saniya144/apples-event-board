import { Err, Ok, type Result } from "../lib/result";
import type { IEvent } from "./Event";
import type { IEventRepository } from "./EventRepository";

class InMemoryEventRepository implements IEventRepository {
  constructor(private readonly events: Map<string, IEvent>) {}

  async findById(eventId: string): Promise<Result<IEvent | null, Error>> {
    try {
      return Ok(this.events.get(eventId) ?? null);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error("Failed to read event."));
    }
  }

  async create(event: IEvent): Promise<Result<IEvent, Error>> {
    try {
      this.events.set(event.id, event);
      return Ok(event);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error("Failed to create event."));
    }
  }

  async update(event: IEvent): Promise<Result<IEvent, Error>> {
    try {
      this.events.set(event.id, event);
      return Ok(event);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error("Failed to update event."));
    }
  }

  async list(): Promise<Result<IEvent[], Error>> {
    try {
      return Ok(Array.from(this.events.values()));
    } catch (error) {
      return Err(error instanceof Error ? error : new Error("Failed to list events."));
    }
  }
}

const seedEvents = new Map<string, IEvent>();

export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository(seedEvents);
}