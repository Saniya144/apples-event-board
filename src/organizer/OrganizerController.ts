import { Request, Response } from "express";
import { EventService } from "../event/EventService";
import { EventError } from "../event/EventService";
import type { OrganizerDashboardEvent } from "../event/EventService";
import {
  getAuthenticatedUser,
  AppSessionStore,
  touchAppSession,
} from "../session/AppSession";

export class OrganizerController {
  constructor(private readonly eventService: EventService) {}

  private groupEvents(events: OrganizerDashboardEvent[]) {
    return {
      published: events.filter((event) => event.statusGroup === "published"),
      draft: events.filter((event) => event.statusGroup === "draft"),
      cancelledOrPast: events.filter((event) => event.statusGroup === "cancelledOrPast"),
    };
  }

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const store = req.session as AppSessionStore;
    const user = getAuthenticatedUser(store);
    const browserSession = touchAppSession(store);

    if (!user) {
      res.status(403).send("Forbidden");
      return;
    }

    const result = await this.eventService.getEventsForOrganizer({
      actingUserId: user.userId,
      actingUserRole: user.role,
    });

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
        case "UNAUTHORIZED":
          res
            .status(403)
            .render("partials/error", {
              message: "Only staff and admins can access organizer dashboard.",
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

    const groupedEvents = this.groupEvents(result.value);
    const isHtmx = req.headers["hx-request"] === "true";

    if (isHtmx) {
      res.render("organizer/partials/event-list", {
        groupedEvents,
        session: browserSession,
        actingUserRole: user.role,
        layout: false,
      });
    } else {
      res.render("organizer/dashboard", {
        groupedEvents,
        session: browserSession,
        actingUserRole: user.role,
      });
    }
  };
}
