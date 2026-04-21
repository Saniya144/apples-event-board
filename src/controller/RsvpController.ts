import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type { IRsvpService } from "../service/RsvpService";
import type { ILoggingService } from "../service/LoggingService";
import { rsvpRepository as dashboardRsvpRepository } from "../rsvp/rsvp.routes";
import { RsvpForbiddenError } from "../rsvp/errors";

export interface IRsvpController {
  toggleRsvpFromForm(
    req: Request,
    res: Response,
    eventId: string,
    userId: string, 
    userRole: string
  ): Promise<void>;
}

class RsvpController implements IRsvpController {
  constructor(
    private readonly rsvpService: IRsvpService,
    private readonly logger: ILoggingService
  ) {}

  async toggleRsvpFromForm(
    req: Request,
    res: Response,
    eventId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    if (userRole === "admin" || userRole === "staff") {
      const error = new RsvpForbiddenError();
      this.logger.warn(`RSVP blocked for role ${userRole} on event ${eventId}`);

      const isHtmx = req.get("HX-Request") === "true";
      if (isHtmx) {
        res.status(403).render("partials/rsvp-button", {
          eventId,
          rsvpStatus: null,
          rsvpError: error.message,
          layout: false,
        });
        return;
      }

      res.status(403).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    const result = await this.rsvpService.toggleRSVP(eventId, userId);

    if (!result.ok) {
      const error = result.value as Error;
      this.logger.warn(`RSVP toggle failed for event ${eventId}: ${error.message}`);

      const isHtmx = req.get("HX-Request") === "true";
      if (isHtmx) {
        res.status(400).render("partials/rsvp-button", {
          eventId,
          rsvpStatus: null,
          rsvpError: error.message,
          layout: false,
        });
        return;
      }

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

    const isHtmx = req.get("HX-Request") === "true";
    if (isHtmx) {
      res.status(200).render("partials/rsvp-button", {
        eventId,
        rsvpStatus: result.value.status,
        rsvpError: null,
        layout: false,
      });
      return;
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