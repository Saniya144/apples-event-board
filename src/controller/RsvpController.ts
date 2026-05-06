import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type { IRsvpService } from "../service/RsvpService";
import type { ILoggingService } from "../service/LoggingService";
import { RsvpForbiddenError } from "../rsvp/errors";
import {
  getAuthenticatedUser,
  AppSessionStore,
  touchAppSession,
} from "../session/AppSession";

export interface IRsvpController {
  // Feature 4 — toggle from event detail page (HTMX, role-checked)
  toggleRsvpFromForm(
    req: Request,
    res: Response,
    eventId: string,
    userId: string,
    userRole: string
  ): Promise<void>;

  // Feature 7 — dashboard view
  getDashboard(req: Request, res: Response): Promise<void>;

  // Feature 7 — toggle from dashboard (redirects back to dashboard)
  toggleRSVP(req: Request, res: Response): Promise<void>;
}

class RsvpController implements IRsvpController {
  constructor(
    private readonly rsvpService: IRsvpService,
    private readonly logger: ILoggingService
  ) {}

  // ── Feature 4: toggle from event detail page ──────────────────────────

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

    const isHtmx = req.get("HX-Request") === "true";
    if (isHtmx) {
      const waitlistPosition = await this.rsvpService.getWaitlistPosition(eventId, userId);
      res.status(200).render("partials/rsvp-button", {
        eventId,
        rsvpStatus: result.value.status,
        rsvpError: null,
        attendeeCount: result.value.attendeeCount,
        capacity: result.value.event.capacity ?? null,
        waitlistPosition,
        layout: false,
      });
      return;
    }
    res.redirect(`/events/${eventId}`);
  }

  // ── Feature 7: dashboard ──────────────────────────────────────────────

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const store = req.session as AppSessionStore;
    const user = getAuthenticatedUser(store);
    const browserSession = touchAppSession(store);

    if (!user || user.role !== "user") {
      res.status(403).send("Forbidden");
      return;
    }

    const result = await this.rsvpService.getRSVPsForUser(user.userId);

    if (!result.ok) {
      const error = result.value;
      if (error instanceof Error && error.message === "USER_NOT_FOUND") {
        res.status(404).render("error", {
          message: "User not found",
          session: browserSession,
        });
        return;
      }
      res.status(500).render("error", {
        message: "Unexpected error",
        session: browserSession,
      });
      return;
    }

    const rsvps = result.value;
    const isHtmx = req.headers["hx-request"] === "true";

    if (isHtmx) {
      res.render("rsvp/partials/rsvp-list", {
        rsvps,
        session: browserSession,
        layout: false,
      });
    } else {
      res.render("rsvp/dashboard", { rsvps, session: browserSession });
    }
  };

  // ── Feature 7: toggle from dashboard ─────────────────────────────────

  toggleRSVP = async (req: Request, res: Response): Promise<void> => {
    const store = req.session as AppSessionStore;
    const user = getAuthenticatedUser(store);
    const browserSession = touchAppSession(store);

    if (!user) {
      res.status(403).send("Forbidden");
      return;
    }

    const eventId = Array.isArray(req.params.eventId)
      ? req.params.eventId[0]
      : req.params.eventId;

    const result = await this.rsvpService.toggleRSVP(eventId, user.userId);

    if (!result.ok) {
      const error = result.value as Error;
      res.status(404).send(error.message ?? "Error toggling RSVP");
      return;
    }

    const updatedResult = await this.rsvpService.getRSVPsForUser(user.userId);
    if (updatedResult.ok) {
      const isHtmx = req.headers["hx-request"] === "true";
      if (isHtmx) {
        res.render("rsvp/partials/rsvp-list", {
          rsvps: updatedResult.value,
          session: browserSession,
          layout: false,
        });
      } else {
        res.redirect("/rsvps/dashboard");
      }
    } else {
      res.status(500).send("Failed to load updated RSVPs");
    }
  };
}

export function CreateRsvpController(
  rsvpService: IRsvpService,
  logger: ILoggingService
): IRsvpController {
  return new RsvpController(rsvpService, logger);
}