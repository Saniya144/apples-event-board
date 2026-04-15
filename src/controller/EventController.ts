import { error } from "node:console";
import { UnexpectedDependencyError } from "../event/errors";
import { EventError } from "../event/errors";
import { Err, Result, Ok } from "../lib/result";
import { IEvent } from "../model/Event";
import { IEventRepository } from "../repository/EventRepository";
import { EventService } from "../service/EventService";
import { IAppBrowserSession } from "../session/AppSession";
import type { Response } from "express";

export interface IEventController {
  createEventFromForm(
    res: Response,
    input: any,
    session: IAppBrowserSession
  ): Promise<void>;
  getAllEvents(res: Response, session: IAppBrowserSession): Promise<void>;
  getEventByID(
    res: Response,
    id: string,
    session: IAppBrowserSession
  ): Promise<void>;
  updateEventFromForm(
    res: Response,
    id: string,
    input: any,
    session: IAppBrowserSession
  ): Promise<void>;
}

class EventController implements IEventController {
  constructor(private readonly service: EventService) {}
  private mapErrorStatus(error: EventError): number {
    if (error.type === "EventNotFound") return 404;
    if (error.type === "UnexpectedDependencyError") return 400;
    return 500;
  }
  async createEventFromForm(
    res: Response,
    input: any,
    session: IAppBrowserSession
  ): Promise<void> {
    const user = session.authenticatedUser;
    const result = await this.service.createEvent(input, user);
    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      res.status(status).render("partials/error", {
        error: error.message,
      });
      return;
    }
    res.redirect(`/home`);
  }

  async getAllEvents(
    res: Response,
    session: IAppBrowserSession
  ): Promise<void> {
    const result = await this.service.getAllEvents();
    if (!result.ok) {
      res.status(500).render("partials/error", {
        message: "Failed to load",
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
        message: "Event not found",
      });
      return;
    }

    const user = session.authenticatedUser;
    const event = result.value;
    if (!user) {
      return res.status(401).render("partials/error", {
        message: "Not authenticated",
      });
    }

    if (
      user.role !== "admin" && 
      (user.role !== "staff" || event.organizerID !== user.email) 
    ) 
    {
      return res.status(403).render("partials/error", {
        message: "Not authorized to edit this event",
      });
    }
    res.render("events/edit", {
      session,
      event: result.value,
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
    if (result.ok === false) {
      const error = result.value;
      res.status(400).render("partials/error", {
        message: error.message,
      });
      return;
    }

    res.redirect(`/home`);
  }
}

export function CreateEventController(service: EventService): IEventController {
  return new EventController(service);
}
