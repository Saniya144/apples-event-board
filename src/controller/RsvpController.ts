import type { Response } from "express";
import type { IRsvpService } from "../rsvp/RsvpService";
import type { ILoggingService } from "../service/LoggingService";

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
      this.logger.warn(`RSVP toggle failed for event ${eventId}: ${result.value.message}`);
      res.status(400).render("partials/error", {
        message: result.value.message,
        layout: false,
      });
      return;
    }

    this.logger.info(
      `RSVP toggled for user ${userId} on event ${eventId} -> ${result.value.status}`
    );

    res.redirect(`/events/${eventId}`);
  }
}

export function CreateRsvpController(
  rsvpService: IRsvpService,
  logger: ILoggingService
): IRsvpController {
  return new RsvpController(rsvpService, logger);
}