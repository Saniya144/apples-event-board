import type { Response } from "express";
import type { UserRole } from "../auth/User";
import type { IEventService } from "./EventService";
import type { IAppBrowserSession } from "../session/AppSession";
export interface ShowEventDetailInput {
  eventId: string;
  actingUserId: string;
  actingUserRole: UserRole;
  session: IAppBrowserSession;
}

export interface IEventController {
  showEventDetail(res: Response, input: ShowEventDetailInput): Promise<void>;
}

class EventController implements IEventController {
  constructor(private readonly eventService: IEventService) {}

  async showEventDetail(res: Response, input: ShowEventDetailInput): Promise<void> {
    const result = await this.eventService.getEventDetail(input);

    if (result.ok === false) {
      switch (result.value.name) {
        case "EventValidationError":
          res.status(400).render("partials/error", {
            message: result.value.message,
            layout: false,
          });
          return;
        case "EventNotFoundError":
          res.status(404).render("partials/error", {
            message: result.value.message,
            layout: false,
          });
          return;
        default:
          res.status(500).render("partials/error", {
            message: "Unexpected server error.",
            layout: false,
          });
          return;
      }
    }

    res.status(200).render("events/detail", {
      event: result.value,
      session: input.session,
      pageError: null,
    });
  }
}

export function CreateEventController(
  eventService: IEventService,
): IEventController {
  return new EventController(eventService);
}
