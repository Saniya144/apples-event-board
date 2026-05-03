import { Result, Ok, Err } from "../lib/result";
import type { IEventRepository } from "../repository/EventRepository";
import type { IEvent } from "../model/Event";
import type { IRsvpRepository, RsvpWithEvent } from "../repository/RsvpRepository";
import type { RsvpStatus } from "../model/Rsvp";
import { EventNotFoundError, RsvpNotAllowedError } from "../rsvp/errors";

export type RsvpServiceError = EventNotFoundError | RsvpNotAllowedError;

export type RsvpEventSummary = Pick<
  IEvent,
  "id" | "title" | "location" | "startDatetime" | "endDatetime" | "category" | "status"
>;

export type RsvpToggleResult = {
  eventId: string;
  userId: string;
  status: RsvpStatus;
  attendeeCount: number;
  event: RsvpEventSummary;
};

export interface IRsvpService {
  toggleRSVP(
    eventId: string,
    userId: string
  ): Promise<Result<RsvpToggleResult, RsvpServiceError>>;

  getWaitlistPosition(eventId: string, userId: string): Promise<number | null>;
  
  getRsvpStatus(
    eventId: string,
    userId: string
  ): Promise<RsvpStatus | null>;

  getRSVPsForUser(userId: string): Promise<Result<RsvpWithEvent[], RsvpServiceError>>;

}

class RsvpService implements IRsvpService {
  constructor(
    private readonly rsvpRepository: IRsvpRepository,
    private readonly eventRepository: IEventRepository
  ) {}

  async getRsvpStatus(
  eventId: string,
  userId: string
): Promise<RsvpStatus | null> {
  const rsvp = await this.rsvpRepository.findByEventAndUser(eventId, userId);
  return rsvp ? rsvp.status : null;
}

  async toggleRSVP(
    eventId: string,
    userId: string
  ): Promise<Result<RsvpToggleResult, RsvpServiceError>> {
    const eventResult = await this.eventRepository.findById(eventId);

    if (!eventResult.ok) {
      return Err(new EventNotFoundError("Could not load event."));
    }

    const event = eventResult.value;

    if (!event) {
      return Err(new EventNotFoundError());
    }

    // Store event stub for dashboard (Feature 7)
    const rsvpRepoWithStub = this.rsvpRepository as any;
    if (rsvpRepoWithStub.upsertEventStub) {
      rsvpRepoWithStub.upsertEventStub({
        id: event.id,
        title: event.title,
        location: event.location,
        startDatetime: new Date(event.startDatetime),
        endDatetime: new Date(event.endDatetime),
        category: event.category,
        status: event.status,
      });
    }

    const allowedError = this.ensureRsvpAllowed(event);
    if (allowedError) {
      return Err(allowedError);
    }

    const existingRsvp = await this.rsvpRepository.findByEventAndUser(eventId, userId);

    if (!existingRsvp) {
      const newStatus = await this.getNextActiveStatus(event);

      const created = await this.rsvpRepository.create({
        eventId,
        userId,
        status: newStatus,
      });

      const attendeeCount = await this.rsvpRepository.countGoingByEvent(eventId);

      return Ok({
        eventId,
        userId,
        status: created.status,
        attendeeCount,
        event: {
          id: event.id,
          title: event.title,
          location: event.location,
          startDatetime: event.startDatetime,
          endDatetime: event.endDatetime,
          category: event.category,
          status: event.status,
        },
      });
    }

    if (existingRsvp.status === "going" || existingRsvp.status === "waitlisted") {
      const updated = await this.rsvpRepository.updateStatus(existingRsvp.id, "cancelled");

      if (!updated) {
        return Err(new RsvpNotAllowedError("Could not cancel RSVP."));
      }

      // waitlist promotion logic
      if (existingRsvp.status === "going") {
        const nextWaitlisted = await this.rsvpRepository.findEarliestWaitlisted(eventId);
        if (nextWaitlisted) {
          const promoted = await this.rsvpRepository.updateStatus(nextWaitlisted.id, "going");
          if (!promoted) {
            // Promotion failed — this is unexpected, but we still return the cancellation result
            // In Sprint 3 (Prisma), this whole block becomes a transaction
          }
        }
      }

      const attendeeCount = await this.rsvpRepository.countGoingByEvent(eventId);

      return Ok({
        eventId,
        userId,
        status: updated.status,
        attendeeCount,
        event: {
          id: event.id,
          title: event.title,
          location: event.location,
          startDatetime: event.startDatetime,
          endDatetime: event.endDatetime,
          category: event.category,
          status: event.status,
        },
      });
    }

    const reactivatedStatus = await this.getNextActiveStatus(event);
    const updated = await this.rsvpRepository.updateStatus(
      existingRsvp.id,
      reactivatedStatus
    );

    if (!updated) {
      return Err(new RsvpNotAllowedError("Could not reactivate RSVP."));
    }

    const attendeeCount = await this.rsvpRepository.countGoingByEvent(eventId);

    return Ok({
      eventId,
      userId,
      status: updated.status,
      attendeeCount,
      event: {
        id: event.id,
        title: event.title,
        location: event.location,
        startDatetime: event.startDatetime,
        endDatetime: event.endDatetime,
        category: event.category,
        status: event.status,
      },
    });
  }

  private ensureRsvpAllowed(event: IEvent): RsvpNotAllowedError | null {
    if (event.status === "draft") {
        return new RsvpNotAllowedError("Cannot RSVP to a draft event.");
    }

    if (event.status === "cancelled") {
        return new RsvpNotAllowedError("Cannot RSVP to a cancelled event.");
    }

    const now = new Date();
    if (new Date(event.endDatetime) < now) {
        return new RsvpNotAllowedError("Cannot RSVP to a past event.");
    }

    return null;
}

  private async getNextActiveStatus(event: IEvent): Promise<RsvpStatus> {
    const currentGoingCount = await this.rsvpRepository.countGoingByEvent(event.id);

    const capacity = this.getEventCapacity(event);

    if (capacity === null) {
      return "going";
    }

    return currentGoingCount < capacity ? "going" : "waitlisted";
  }

  private getEventCapacity(event: IEvent): number | null {
    const eventWithCapacity = event as IEvent & { capacity?: number };

    if (
      typeof eventWithCapacity.capacity === "number" &&
      Number.isFinite(eventWithCapacity.capacity) &&
      eventWithCapacity.capacity >= 0
    ) {
      return eventWithCapacity.capacity;
    }

    return null;
  }

  // Add to RsvpService class:
  async getWaitlistPosition(eventId: string, userId: string): Promise<number | null> {
    const allRsvps = await this.rsvpRepository.listByEvent(eventId);

    // Get only waitlisted RSVPs, sorted by createdAt ascending
    const waitlist = allRsvps
      .filter((r) => r.status === "waitlisted")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const position = waitlist.findIndex((r) => r.userId === userId);

    // findIndex returns -1 if not found; otherwise return 1-based position
    return position === -1 ? null : position + 1;
  }

  async getRSVPsForUser(
  userId: string
): Promise<Result<RsvpWithEvent[], RsvpServiceError>> {
  if (!userId) {
    return Err(new RsvpNotAllowedError("User not found."));
  }
  try {
    const rsvps = await this.rsvpRepository.findByUserId(userId);
    return Ok(rsvps);
  } catch (e) {
    return Err(new RsvpNotAllowedError(e instanceof Error ? e.message : "Unknown error"));
  }
}
}

export function CreateRsvpService(
  rsvpRepository: IRsvpRepository,
  eventRepository: IEventRepository
): IRsvpService {
  return new RsvpService(rsvpRepository, eventRepository);
}
