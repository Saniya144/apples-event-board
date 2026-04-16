import { Err, Ok, type Result } from "../lib/result";
import type { IEvent, IEventDetailView } from "../model/Event";
import type { IEventRepository } from "../repository/EventRepository";
import type { UserRole } from "../auth/User";
import {
  EventAuthorizationError,
  EventDependencyError,
  EventNotFoundError,
  EventStateError,
  EventValidationError,
  type EventError,
} from "../events/errors";


interface IOrganizerLookup {
  findDisplayNameByUserId(userId: string): Promise<Result<string | null, Error>>;
}

interface IAttendanceLookup {
  countGoingByEventId(eventId: string): Promise<Result<number, Error>>;
}


export interface GetEventDetailInput {
  eventId: string;
  actingUserId: string;
  actingUserRole: UserRole;
}



export interface TransitionEventInput {
  eventId: string;
  actingUserId: string;
  actingUserRole: UserRole;
}

export class EventService {
  constructor(
  private readonly repo: IEventRepository,
  private readonly organizers: IOrganizerLookup = new InMemoryOrganizerLookup(),
  private readonly attendance: IAttendanceLookup = new InMemoryAttendanceLookup(),
) {}

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
      organizerId: user.userId,
      status: "draft",
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

  async searchPublishedUpcomingEvents(
    query?: string
  ): Promise<Result<IEvent[], EventError>> {
    try {
      const events = await this.repo.getAll();
      const now = new Date();

      let filtered = events.filter((event) => {
        return (
          event.status === "published" &&
          new Date(event.startDatetime) >= now
        );
      });

      if (!query || query.trim() === "") {
        return Ok(filtered);
      }

      const q = query.trim().toLowerCase();

      filtered = filtered.filter((event) => {
        return (
          event.title.toLowerCase().includes(q) ||
          event.description.toLowerCase().includes(q) ||
          event.location.toLowerCase().includes(q) ||
          event.category.toLowerCase().includes(q)
        );
      });

      return Ok(filtered);
    } catch {
      return Err(EventDependencyError("Failed to search events."));
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

    if (event.organizerId !== user.userId && user.role !== "admin") {
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
  async getEventDetail(
    input: GetEventDetailInput
  ): Promise<Result<IEventDetailView, EventError>> {
    const eventId = input.eventId.trim();
    if (!eventId) {
      return Err(EventValidationError("Event id is required."));
    }

    const eventResult = await this.repo.findById(eventId);

    if (eventResult.ok === false) {
      const error = eventResult.value as EventError;
      return Err(EventDependencyError(error.message));
    }

    const event = eventResult.value;
    if (!event) {
      return Err(EventNotFoundError("Event not found."));
    }

    const isAdmin = input.actingUserRole === "admin";
    const isOwner = event.organizerId === input.actingUserId;

    const canViewDraft = event.status !== "draft" || isOwner || isAdmin;
    if (!canViewDraft) {
      return Err(EventNotFoundError("Event not found."));
    }

    const organizerResult = await this.organizers.findDisplayNameByUserId(
      event.organizerId
    );
    if (organizerResult.ok === false) {
      return Err(EventDependencyError(organizerResult.value.message));
    }

    const attendeeCountResult = await this.attendance.countGoingByEventId(event.id);
    if (attendeeCountResult.ok === false) {
      return Err(EventDependencyError(attendeeCountResult.value.message));
    }

    const organizerName = organizerResult.value ?? "Unknown organizer";
    const attendeeCount = attendeeCountResult.value;

    return Ok({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      category: event.category,
      status: event.status,
      capacity: event.capacity,
      startDatetime: event.startDatetime,
      endDatetime: event.endDatetime,
      organizerId: event.organizerId,
      organizerName,
      attendeeCount,
      canEdit: isOwner || isAdmin,
      canCancel: isOwner || isAdmin,
      canPublish: isOwner && event.status === "draft",
      canRsvp: event.status === "published",
    });
  }
  async publishEvent(
    input: TransitionEventInput
  ): Promise<Result<IEventDetailView, EventError>> {
    const eventResult = await this.repo.findById(input.eventId);

    if (eventResult.ok === false) {
      return Err(EventDependencyError(eventResult.value.message));
    }

    const event = eventResult.value;
    if (!event) {
      return Err(EventNotFoundError("Event not found."));
    }

    const isOwner = event.organizerId === input.actingUserId;

    if (!isOwner) {
      return Err(EventAuthorizationError("Only the organizer can publish this event."));
    }

    if (event.status !== "draft") {
      return Err(EventStateError("Only draft events can be published."));
    }

    const updatedEvent: IEvent = {
      ...event,
      status: "published",
      updatedAt: new Date().toISOString(),
    };

    const updateResult = await this.repo.update(updatedEvent);
    if (updateResult.ok === false) {
      return Err(EventDependencyError(updateResult.value.message));
    }

    return this.getEventDetail({
      eventId: updatedEvent.id,
      actingUserId: input.actingUserId,
      actingUserRole: input.actingUserRole,
    });
  }
  async cancelEvent(
    input: TransitionEventInput
  ): Promise<Result<IEventDetailView, EventError>> {
    const eventResult = await this.repo.findById(input.eventId);

    if (eventResult.ok === false) {
      return Err(EventDependencyError(eventResult.value.message));
    }

    const event = eventResult.value;
    if (!event) {
      return Err(EventNotFoundError("Event not found."));
    }

    const isOwner = event.organizerId === input.actingUserId;
    const isAdmin = input.actingUserRole === "admin";

    if (!isOwner && !isAdmin) {
      return Err(
        EventAuthorizationError("Only the organizer or an admin can cancel this event.")
      );
    }

    if (event.status !== "published") {
      return Err(EventStateError("Only published events can be cancelled."));
    }

    const updatedEvent: IEvent = {
      ...event,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    };

    const updateResult = await this.repo.update(updatedEvent);
    if (updateResult.ok === false) {
      return Err(EventDependencyError(updateResult.value.message));
    }

    return this.getEventDetail({
      eventId: updatedEvent.id,
      actingUserId: input.actingUserId,
      actingUserRole: input.actingUserRole,
    });
  }
}
class InMemoryAttendanceLookup implements IAttendanceLookup {
  async countGoingByEventId(_eventId: string): Promise<Result<number, Error>> {
    return Ok(0);
  }
}

class InMemoryOrganizerLookup implements IOrganizerLookup {
  async findDisplayNameByUserId(_userId: string): Promise<Result<string | null, Error>> {
    return Ok(null);
  }
}