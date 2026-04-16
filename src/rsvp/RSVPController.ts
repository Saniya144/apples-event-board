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

    if (!user) {
      res.status(403).send("Forbidden");
      return;
    }

    const result = await this.rsvpService.getRSVPsForUser(user.userId);

    if (!result.ok) {
      const error = result.value as RSVPError;
      switch (error.type) {
        case "USER_NOT_FOUND":
          res
            .status(404)
            .render("error", {
              message: "User not found",
              session: browserSession,
            });
          return;
        case "UNEXPECTED_ERROR":
          res
            .status(500)
            .render("error", {
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
}
