import type { Response } from "express";
import { randomUUID } from "node:crypto";
import type { IRsvpService } from "../service/RsvpService";
import type { ILoggingService } from "../service/LoggingService";
import { rsvpRepository as dashboardRsvpRepository } from "../rsvp/rsvp.routes";

export interface IRsvpController {
  toggleRsvpFromForm(
    res: Response,
    eventId: string,
    userId: string
  ): Promise<void>;
}

class RsvpController implements IRsvpController {
  constructor(
    private readonly rsvpService: IRsvpService,
    private readonly logger: ILoggingService
  ) {}

  async toggleRsvpFromForm(
    res: Response,
    eventId: string,
    userId: string
  ): Promise<void> {
    const result = await this.rsvpService.toggleRSVP(eventId, userId);

    if (!result.ok) {
      const error = result.value as Error;
      this.logger.warn(`RSVP toggle failed for event ${eventId}: ${error.message}`);
      res.status(400).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    this.logger.info(
      `RSVP toggled for user ${userId} on event ${eventId} -> ${result.value.status}`
    );

    const legacyRepo = dashboardRsvpRepository as any;
    if (legacyRepo?.upsertEventStub) {
      legacyRepo.upsertEventStub({
        ...result.value.event,
        startDatetime: new Date(result.value.event.startDatetime),
        endDatetime: new Date(result.value.event.endDatetime),
      });
    }

    if (legacyRepo?.findByEventAndUser && legacyRepo?.save && legacyRepo?.delete) {
      const existing = await legacyRepo.findByEventAndUser(eventId, userId);

      if (result.value.status === "cancelled") {
        if (existing) {
          await legacyRepo.delete(existing.id);
        }
      } else {
        await legacyRepo.save({
          id: existing?.id ?? randomUUID(),
          eventId,
          userId,
          status: result.value.status,
          createdAt: existing?.createdAt ?? new Date(),
        });
      }
    }

    res.redirect(`/events/${eventId}`);
  }
}

export function CreateRsvpController(
  rsvpService: IRsvpService,
  logger: ILoggingService
): IRsvpController {
  return new RsvpController(rsvpService, logger);
}