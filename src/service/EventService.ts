import { UnexpectedDependencyError } from "../event/errors";
import { EventError } from "../event/errors";
import { Result, Ok, Err } from "../lib/result";
import { IEvent } from "../model/Event";
import { IEventRepository } from "../repository/EventRepository";

export class EventService {
  publishEvent(id: any) {
    throw new Error("Method not implemented.");
  }
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
      status: "published",
    };
    return await this.repo.create(event);
  }
  async getAllEvents(user: any): Promise<Result<IEvent[], EventError>> {
    try {
      const events = await this.repo.getAll();
  
      const visibleEvents = events.filter((event) => {
        if (event.status === "published") return true;
  
        if (event.status === "draft") {
          return user && (user.role === "admin" || event.organizerID === user.email);
        }
  
        return false;
      });
  
      return Ok(visibleEvents);
    } catch {
      return Err(UnexpectedDependencyError("failed to fetch"));
    }
  }
  async getEventByID(id: string,user:any): Promise<Result<IEvent | null, EventError>> {
    const result = await this.repo.findById(id);

    if (!result.ok || !result.value) {
      return Err(UnexpectedDependencyError("eventNotFound"));
    }

    const event = result.value;

    if (event.status === "draft") {
      const canSee =
        user && (user.role === "admin" || event.organizerID === user.email);

      if (!canSee) {
        return Err(UnexpectedDependencyError("eventNotFound"));
      }
    }

    return Ok(event);
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
