import { UnexpectedDependencyError } from "../event/errors";
import { EventError } from "../event/errors";
import { Result, Ok, Err } from "../lib/result";
import { IEvent } from "../model/Event";
import { IEventRepository } from "../repository/EventRepository";

export class EventService {
  constructor(private readonly repo: IEventRepository) {}
  async createEvent(
    input: any,
    user: any
  ): Promise<Result<IEvent, EventError>> {
    if (!input.title || input.title.trim() === "")
      return Err(UnexpectedDependencyError("title is required"));
    if (!input.location || input.location.trim() === "")
      return Err(UnexpectedDependencyError("location is required"));
    const begin = new Date(input.startTime);
    const end = new Date(input.endTime);

    if (begin < new Date()) {
      return Err(UnexpectedDependencyError("Cannot create event in the past"));
    }

    if (end < begin)
      return Err(UnexpectedDependencyError("invalid end is before start"));
    const event: IEvent = {
      id: Math.random().toString(),
      title: input.title,
      description: input.description || "",
      location: input.location,
      startTime: begin,
      endTime: end,
      organizerID: user.email,
      status: "draft",
    };
    return await this.repo.create(event);
  }
  async getAllEvents(): Promise<Result<IEvent[], EventError>> {
    try {
      const events = await this.repo.getAll();
      return Ok(events);
    } catch {
      return Err(UnexpectedDependencyError("failed to fetch"));
    }
  }
  async getEventByID(id: string): Promise<Result<IEvent | null, EventError>> {
    return await this.repo.findById(id);
  }
  async updateEvent(
    id: string,
    input: any,
    user: any
  ): Promise<Result<IEvent, EventError>> {
    const exist = await this.repo.findById(id);
    if (!exist.ok || !exist.value)
      return Err(UnexpectedDependencyError("eventNotFound"));
    const event = exist.value;
    if (event.organizerID !== user.email && user.role !== "admin")
      return Err(UnexpectedDependencyError("not authorized "));
    if (event.status === "cancelled")
      return Err(UnexpectedDependencyError("cant edit cancelled event"));
    if (event.startTime < new Date()) {
      return Err(UnexpectedDependencyError("Cannot edit past event"));
    }
    if (!input.title || input.title.trim() === "")
      return Err(UnexpectedDependencyError("title is required"));
    if (!input.location || input.location.trim() === "")
      return Err(UnexpectedDependencyError("location is required"));

    const begin = new Date(input.startTime);
    const end = new Date(input.endTime);
    if (begin < new Date()) {
      return Err(UnexpectedDependencyError("Cannot set event to past time"));
    }
    if (end < begin)
      return Err(UnexpectedDependencyError("invalid end is before start"));
    const updatedEvent: IEvent = {
      id: event.id,
      title: input.title,
      description: input.description || "",
      location: input.location,
      startTime: begin,
      endTime: end,
      organizerID: event.organizerID,
      status: event.status,
    };
    return await this.repo.update(updatedEvent);
  }
}
