import { Err, Ok, type Result } from "../lib/result";
import type { IEvent } from "../model/Event";
import type { IEventRepository } from "../repository/EventRepository";
import {
  EventAuthorizationError,
  EventDependencyError,
  EventNotFoundError,
  EventStateError,
  EventValidationError,
  type EventError,
} from "../events/errors";

export class EventService {
  constructor(private readonly repo: IEventRepository) {}

  async createEvent(
    input: any,
    user: any
  ): Promise<Result<IEvent, EventError>> {
    if (!input.title || input.title.trim() === "") {
      return Err(EventValidationError("Title is required."));
    }

    if (!input.location || input.location.trim() === "") {
      return Err(EventValidationError("Location is required."));
    }

    const begin = new Date(input.startTime);
    const end = new Date(input.endTime);

    if (Number.isNaN(begin.getTime()) || Number.isNaN(end.getTime())) {
      return Err(EventValidationError("Valid start and end times are required."));
    }

    if (end < begin) {
      return Err(EventValidationError("End time must be after start time."));
    }

    const now = new Date().toISOString();

    const event: IEvent = {
      id: Math.random().toString(),
      title: input.title,
      description: input.description || "",
      location: input.location,
      category: input.category || "general",
      startDatetime: begin.toISOString(),
      endDatetime: end.toISOString(),
      organizerId: user.email,
      status: "published",
      capacity:
        input.capacity !== undefined && input.capacity !== ""
          ? Number(input.capacity)
          : 0,
      createdAt: now,
      updatedAt: now,
    };

    return await this.repo.create(event);
  }

  async getAllEvents(): Promise<Result<IEvent[], EventError>> {
    try {
      const events = await this.repo.getAll();
      return Ok(events);
    } catch {
      return Err(EventDependencyError("Failed to fetch events."));
    }
  }

  async getFilteredPublishedEvents(filters: {
    category?: string;
    date?: string;
  }): Promise<Result<IEvent[], EventError>> {
    try {
      const events = await this.repo.getAll();

      let filtered = events.filter((event) => event.status === "published");

      if (filters.category && filters.category.trim() !== "") {
        const category = filters.category.trim().toLowerCase();
        filtered = filtered.filter(
          (event) => event.category.toLowerCase() === category
        );
      }

      if (filters.date && filters.date.trim() !== "") {
        const targetDate = filters.date.trim();

        filtered = filtered.filter((event) => {
          const eventDate = new Date(event.startDatetime)
            .toISOString()
            .slice(0, 10);
          return eventDate === targetDate;
        });
      }

      return Ok(filtered);
    } catch {
      return Err(EventDependencyError("Failed to filter events."));
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
    const existingResult = await this.repo.findById(id);

    if (!existingResult.ok) {
      const error = existingResult.value as EventError;
      return Err(EventDependencyError(error.message));
    }

    if (!existingResult.value) {
      return Err(EventNotFoundError("Event not found."));
    }

    const event = existingResult.value;

    if (event.organizerId !== user.email && user.role !== "admin") {
      return Err(EventAuthorizationError("Not authorized to edit this event."));
    }

    if (event.status === "cancelled") {
      return Err(EventStateError("Cannot edit a cancelled event."));
    }

    if (new Date(event.endDatetime) < new Date()) {
      return Err(EventStateError("Cannot edit a past event."));
    }

    if (!input.title || input.title.trim() === "") {
      return Err(EventValidationError("Title is required."));
    }

    if (!input.location || input.location.trim() === "") {
      return Err(EventValidationError("Location is required."));
    }

    const begin = new Date(input.startTime);
    const end = new Date(input.endTime);

    if (Number.isNaN(begin.getTime()) || Number.isNaN(end.getTime())) {
      return Err(EventValidationError("Valid start and end times are required."));
    }

    if (end < begin) {
      return Err(EventValidationError("End time must be after start time."));
    }

    const updatedEvent: IEvent = {
      id: event.id,
      title: input.title,
      description: input.description || "",
      location: input.location,
      category: input.category || "general",
      startDatetime: begin.toISOString(),
      endDatetime: end.toISOString(),
      organizerId: event.organizerId,
      status: event.status,
      capacity:
        input.capacity !== undefined && input.capacity !== ""
          ? Number(input.capacity)
          : event.capacity,
      createdAt: event.createdAt,
      updatedAt: new Date().toISOString(),
    };

    return await this.repo.update(updatedEvent);
  }
}