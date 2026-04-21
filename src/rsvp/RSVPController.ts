import { Request, Response } from "express";
import { RSVPService } from "./RSVPService";
import {
  getAuthenticatedUser,
  AppSessionStore,
  touchAppSession,
} from "../session/AppSession";
import { RSVPError } from "./errors";

export class RSVPController {
  constructor(private readonly rsvpService: RSVPService) {}

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
      const error = result.value as RSVPError;
      switch (error.type) {
        case "USER_NOT_FOUND":
          res.status(404).render("error", {
            message: "User not found",
            session: browserSession,
          });
          return;
        case "UNEXPECTED_ERROR":
          res.status(500).render("error", {
            message: error.message,
            session: browserSession,
          });
          return;
      }
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

  toggleRSVP = async (req: Request, res: Response): Promise<void> => {
    const store = req.session as AppSessionStore;
    const user = getAuthenticatedUser(store);
    const browserSession = touchAppSession(store);

    if (!user) {
      res.status(403).send("Forbidden");
      return;
    }

    // Ensure eventId is a string, not string[]
    const eventId = Array.isArray(req.params.eventId)
      ? req.params.eventId[0]
      : req.params.eventId;

    const result = await this.rsvpService.toggleRSVP(eventId, user.userId);

    if (!result.ok) {
      const error = result.value as RSVPError;
      switch (error.type) {
        case "EVENT_NOT_FOUND":
          res.status(404).send("Event not found");
          return;
        case "USER_NOT_FOUND":
          res.status(404).send("User not found");
          return;
        case "UNEXPECTED_ERROR":
          res.status(500).send(error.message);
          return;
      }
    }

    // After toggling, return the updated RSVP list for this user
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
