import { Result, Ok, Err } from "../lib/result";
import type { IEventRepository } from "../repository/EventRepository";
import type { IEvent } from "../model/Event";
import type { IRsvpRepository } from "../repository/RsvpRepository";
import type { RsvpStatus } from "../model/Rsvp";
import { EventNotFoundError, RsvpNotAllowedError } from "../rsvp/errors";

export type RsvpServiceError = EventNotFoundError | RsvpNotAllowedError;

export type RsvpToggleResult = {
  eventId: string;
  userId: string;
  status: RsvpStatus;
  attendeeCount: number;
};

export interface IRsvpService {
  toggleRSVP(
    eventId: string,
    userId: string
  ): Promise<Result<RsvpToggleResult, RsvpServiceError>>;
}

class RsvpService implements IRsvpService {
  constructor(
    private readonly rsvpRepository: IRsvpRepository,
    private readonly eventRepository: IEventRepository
  ) {}

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
      });
    }

    if (existingRsvp.status === "going" || existingRsvp.status === "waitlisted") {
      const updated = await this.rsvpRepository.updateStatus(existingRsvp.id, "cancelled");

      if (!updated) {
        return Err(new RsvpNotAllowedError("Could not cancel RSVP."));
      }

      const attendeeCount = await this.rsvpRepository.countGoingByEvent(eventId);

      return Ok({
        eventId,
        userId,
        status: updated.status,
        attendeeCount,
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
}

export function CreateRsvpService(
  rsvpRepository: IRsvpRepository,
  eventRepository: IEventRepository
): IRsvpService {
  return new RsvpService(rsvpRepository, eventRepository);
}