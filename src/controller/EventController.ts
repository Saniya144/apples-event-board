import type { Response } from "express";
import type { UserRole } from "../auth/User";
import type { IAppBrowserSession } from "../session/AppSession";
import { type EventError } from "../events/errors";
import { EventService } from "../service/EventService";
import type { IRsvpService } from "../service/RsvpService";

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
    session: IAppBrowserSession,
    filters: { category?: string; date?: string }
  ): Promise<void>;

  searchEvents(
    res: Response,
    session: IAppBrowserSession,
    query?: string
  ): Promise<void>;

  getEventByID(
    res: Response,
    id: string,
    session: IAppBrowserSession
  ): Promise<void>;

  showEventDetail(res: Response, input: ShowEventDetailInput): Promise<void>;

  updateEventFromForm(
    res: Response,
    id: string,
    input: any,
    session: IAppBrowserSession
  ): Promise<void>;

  publishEvent(res: Response, input: LifecycleEventInput): Promise<void>;

  cancelEvent(res: Response, input: LifecycleEventInput): Promise<void>;
}

class EventController implements IEventController {
  constructor(
    private readonly service: EventService,
    private readonly rsvpService: IRsvpService
  ) {}

  private mapErrorStatus(error: EventError): number {
    if (
      error.name === "EventTitleRequiredError" ||
      error.name === "EventLocationRequiredError" ||
      error.name === "EventTimeRequiredError" ||
      error.name === "EventStartTimeInPastError" ||
      error.name === "EventEndBeforeStartError" ||
      error.name === "EventEditTitleRequiredError" ||
      error.name === "EventEditLocationRequiredError" ||
      error.name === "EventEditTimeRequiredError" ||
      error.name === "EventEditStartTimeInPastError" ||
      error.name === "EventEditEndBeforeStartError"
    ) {
      return 400;
    }
  
    if (
      error.name === "EventEditUnauthorizedError" ||
      error.name === "EventAuthorizationError"
    ) {
      return 403;
    }
  
    if (
      error.name === "EventEditNotFoundError" ||
      error.name === "EventNotFoundError"
    ) {
      return 404;
    }
  
    if (
      error.name === "EventCancelledEditError" ||
      error.name === "EventPastEditError" ||
      error.name === "EventStateError"
    ) {
      return 400;
    }
  
    if (
      error.name === "EventCreateFailedError" ||
      error.name === "EventUpdateFailedError" ||
      error.name === "EventDependencyError"
    ) {
      return 500;
    }
  
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
      res.status(200).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.redirect("/home");
  }

  async getAllEvents(
    res: Response,
    session: IAppBrowserSession,
    filters: { category?: string; date?: string }
  ): Promise<void> {
    const hasFilters =
      (filters.category && filters.category.trim() !== "") ||
      (filters.date && filters.date.trim() !== "");

    const result = hasFilters
      ? await this.service.getFilteredPublishedEvents(filters)
      : await this.service.getAllEvents();

    if (!result.ok) {
      res.status(500).render("partials/error", {
        message: "Failed to load",
        layout: false,
      });
      return;
    }

    const user = session.authenticatedUser;

    if (!user) {
      res.status(401).render("partials/error", {
        message: "Not authenticated",
        layout: false,
      });
      return;
    }

    const visibleEvents = result.value.filter((event) => {
      if (event.status === "published") return true;

      if (event.status === "draft") {
        return user.role === "admin" || event.organizerId === user.userId;
      }

      return false;
    });

    res.render("home", {
      session,
      pageError: null,
      events: visibleEvents,
      filters: {
        category: filters.category ?? "",
        date: filters.date ?? "",
      },
      searchQuery: "",
    });
  }

  async searchEvents(
    res: Response,
    session: IAppBrowserSession,
    query?: string
  ): Promise<void> {
    const result = await this.service.searchPublishedUpcomingEvents(query);

    if (!result.ok) {
      res.status(500).render("partials/error", {
        message: "Failed to search events.",
        layout: false,
      });
      return;
    }

    res.render("home", {
      session,
      pageError: null,
      events: result.value,
      searchQuery: query || "",
      filters: {},
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
        message: "Event not found",
        layout: false,
      });
      return;
    }

    const user = session.authenticatedUser;
    const event = result.value;

    if (!user) {
      res.status(401).render("partials/error", {
        message: "Not authenticated",
        layout: false,
      });
      return;
    }

    if (event.status === "draft") {
      const canSeeDraft =
        user.role === "admin" || event.organizerId === user.userId;

      if (!canSeeDraft) {
        res.status(404).render("partials/error", {
          message: "Event not found",
          layout: false,
        });
        return;
      }
    }

    if (
      user.role !== "admin" &&
      (user.role !== "staff" || event.organizerId !== user.userId)
    ) {
      res.status(403).render("partials/error", {
        message: "Not authorized to edit this event",
        layout: false,
      });
      return;
    }

    res.render("events/edit", {
      session,
      event: result.value,
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

    const waitlistPosition = await this.rsvpService.getWaitlistPosition(
      input.eventId,
      input.actingUserId
    );

    res.status(200).render("events/detail", {
      event: result.value,
      session: input.session,
      pageError: null,
      waitlistPosition,
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
      res.status(200).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.redirect("/home");
  }

  async publishEvent(res: Response, input: LifecycleEventInput): Promise<void> {
    const result = await this.service.publishEvent({
      eventId: input.eventId,
      actingUserId: input.actingUserId,
      actingUserRole: input.actingUserRole,
    });

    if (result.ok === false) {
      const error = result.value as EventError;
      const status = this.mapErrorStatus(error);

      res.status(status).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.status(200).render("partials/lifecycle-controls", {
      event: result.value,
      layout: false,
    });
  }

  async cancelEvent(res: Response, input: LifecycleEventInput): Promise<void> {
    const result = await this.service.cancelEvent({
      eventId: input.eventId,
      actingUserId: input.actingUserId,
      actingUserRole: input.actingUserRole,
    });

    if (result.ok === false) {
      const error = result.value as EventError;
      const status = this.mapErrorStatus(error);

      res.status(status).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.status(200).render("partials/lifecycle-controls", {
      event: result.value,
      layout: false,
    });
  }
}

export function CreateEventController(
  service: EventService,
  rsvpService: IRsvpService
): IEventController {
  return new EventController(service, rsvpService);
}