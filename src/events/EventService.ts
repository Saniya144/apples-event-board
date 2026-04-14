import { Err, Ok, type Result } from "../lib/result";
import type { UserRole } from "../auth/User";
import type { IEventDetailView } from "./Event";
import type { IEventRepository } from "./EventRepository";
import {
  EventDependencyError,
  EventNotFoundError,
  EventValidationError,
  type EventError,
} from "./errors";

export interface GetEventDetailInput {
  eventId: string;
  actingUserId: string;
  actingUserRole: UserRole;
}

export interface IEventService {
  getEventDetail(
    input: GetEventDetailInput,
  ): Promise<Result<IEventDetailView, EventError>>;
}

interface IOrganizerLookup {
  findDisplayNameByUserId(userId: string): Promise<Result<string | null, Error>>;
}

interface IAttendanceLookup {
  countGoingByEventId(eventId: string): Promise<Result<number, Error>>;
}

class EventService implements IEventService {
  constructor(
    private readonly events: IEventRepository,
    private readonly organizers: IOrganizerLookup,
    private readonly attendance: IAttendanceLookup,
  ) {}

  async getEventDetail(
    input: GetEventDetailInput,
  ): Promise<Result<IEventDetailView, EventError>> {
    const eventId = input.eventId.trim();
    if (!eventId) {
      return Err(EventValidationError("Event id is required."));
    }

    const eventResult = await this.events.findById(eventId);
    if (eventResult.ok === false) {
      return Err(EventDependencyError(eventResult.value.message));
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
      event.organizerId,
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

export function CreateEventService(
  events: IEventRepository,
  organizers?: IOrganizerLookup,
  attendance?: IAttendanceLookup,
): IEventService {
  return new EventService(
    events,
    organizers ?? new InMemoryOrganizerLookup(),
    attendance ?? new InMemoryAttendanceLookup(),
  );
}