import type { Response } from "express";
import type { UserRole } from "../auth/User";
import type { IAppBrowserSession } from "../session/AppSession";
import { type EventError } from "../events/errors";
import { EventService } from "../service/EventService";

export interface ShowEventDetailInput {
  eventId: string;
  actingUserId: string;
  actingUserRole: UserRole;
  session: IAppBrowserSession;
}
export interface LifecycleEventInput {
  eventId: string;
  actingUserId: string;
  actingUserRole: UserRole;
  session: IAppBrowserSession;
}

export interface IEventController {
  createEventFromForm(
    res: Response,
    input: any,
    session: IAppBrowserSession
  ): Promise<void>;

  getAllEvents(
    res: Response,
    session: IAppBrowserSession
  ): Promise<void>;

  getEventByID(
    res: Response,
    id: string,
    session: IAppBrowserSession
  ): Promise<void>;

  showEventDetail(
    res: Response,
    input: ShowEventDetailInput
  ): Promise<void>;

  updateEventFromForm(
    res: Response,
    id: string,
    input: any,
    session: IAppBrowserSession
  ): Promise<void>;

  publishEvent(
    res: Response,
    input: LifecycleEventInput
  ): Promise<void>;

  cancelEvent(
    res: Response,
    input: LifecycleEventInput
  ): Promise<void>;
}

class EventController implements IEventController {
  constructor(private readonly service: EventService) {}

  private mapErrorStatus(error: EventError): number {
    if (error.name === "EventNotFoundError") return 404;
    if (error.name === "UnexpectedDependencyError") return 400;
    return 500;
  }

  async createEventFromForm(
    res: Response,
    input: any,
    session: IAppBrowserSession
  ): Promise<void> {
    const user = session.authenticatedUser;
    const result = await this.service.createEvent(input, user);

    if (!result.ok) {
      const error = result.value as EventError;
      const status = this.mapErrorStatus(error);
      res.status(status).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.redirect("/home");
  }

  async getAllEvents(
    res: Response,
    session: IAppBrowserSession
  ): Promise<void> {
    const result = await this.service.getAllEvents();

    if (!result.ok) {
      res.status(500).render("partials/error", {
        message: "Failed to load events.",
        layout: false,
      });
      return;
    }

    res.render("home", {
      session,
      pageError: null,
      events: result.value,
    });
  }

  async getEventByID(
    res: Response,
    id: string,
    session: IAppBrowserSession
  ): Promise<void> {
    const result = await this.service.getEventByID(id);

    if (!result.ok || !result.value) {
      res.status(404).render("partials/error", {
        message: "Event not found.",
        layout: false,
      });
      return;
    }

    res.render("events/edit", {
      session,
      event: result.value,
      pageError: null,
    });
  }

  async showEventDetail(
    res: Response,
    input: ShowEventDetailInput
  ): Promise<void> {
    const result = await this.service.getEventDetail({
      eventId: input.eventId,
      actingUserId: input.actingUserId,
      actingUserRole: input.actingUserRole,
    });

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
  async updateEventFromForm(
    res: Response,
    id: string,
    input: any,
    session: IAppBrowserSession
  ): Promise<void> {
    const user = session.authenticatedUser;
    const result = await this.service.updateEvent(id, input, user);

    if (!result.ok) {
      const error = result.value as EventError;
      res.status(400).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.redirect("/home");
  }
  async publishEvent(
    res: Response,
    input: LifecycleEventInput
  ): Promise<void> {
    const result = await this.service.publishEvent({
      eventId: input.eventId,
      actingUserId: input.actingUserId,
      actingUserRole: input.actingUserRole,
    });

    if (result.ok === false) {
      const error = result.value as EventError;
      const status =
        error.name === "EventNotFoundError"
          ? 404
          : error.name === "EventAuthorizationError" ||
            error.name === "EventStateError" ||
            error.name === "EventValidationError"
          ? 400
          : 500;

      res.status(status).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.status(200).render("../partials/lifecycle-controls", {
      event: result.value,
      layout: false,
    });
  }

  async cancelEvent(
    res: Response,
    input: LifecycleEventInput
  ): Promise<void> {
    const result = await this.service.cancelEvent({
      eventId: input.eventId,
      actingUserId: input.actingUserId,
      actingUserRole: input.actingUserRole,
    });

    if (result.ok === false) {
      const error = result.value as EventError;
      const status =
        error.name === "EventNotFoundError"
          ? 404
          : error.name === "EventAuthorizationError" ||
            error.name === "EventStateError" ||
            error.name === "EventValidationError"
          ? 400
          : 500;

      res.status(status).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.status(200).render("../partials/lifecycle-controls", {
      event: result.value,
      layout: false,
    });
  }
}

export function CreateEventController(service: EventService): IEventController {
  return new EventController(service);
}