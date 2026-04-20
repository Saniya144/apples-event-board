import { Request, Response } from "express";
import { EventService } from "../event/EventService";
import { EventError } from "../event/EventService";
import {
  getAuthenticatedUser,
  AppSessionStore,
  touchAppSession,
} from "../session/AppSession";

export class OrganizerController {
  constructor(private readonly eventService: EventService) {}

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const store = req.session as AppSessionStore;
    const user = getAuthenticatedUser(store);
    const browserSession = touchAppSession(store);

    if (!user) {
      res.status(403).send("Forbidden");
      return;
    }

    const result = await this.eventService.getEventsForOrganizer(user.userId);

    if (!result.ok) {
      const error = result.value as EventError;
      switch (error.type) {
        case "ORGANIZER_NOT_FOUND":
          res
            .status(404)
            .render("partials/error", {
              message: "Organizer not found",
              layout: false,
            });
          return;
        case "UNEXPECTED_ERROR":
          res
            .status(500)
            .render("partials/error", {
              message: error.message,
              layout: false,
            });
          return;
      }
    }

    const events = result.value;
    const isHtmx = req.headers["hx-request"] === "true";

    if (isHtmx) {
      res.render("organizer/partials/event-list", {
        events,
        session: browserSession,
      });
    } else {
      res.render("organizer/dashboard", { events, session: browserSession });
    }
  };
}
