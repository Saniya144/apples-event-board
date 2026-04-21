import { Router } from "express";
import { OrganizerController } from "./OrganizerController";
import { EventService } from "../event/EventService";
import type { IEventRepository } from "../repository/EventRepository";
import type { IRsvpRepository } from "../repository/RsvpRepository";

export function createOrganizerRouter(
  eventRepository: IEventRepository,
  rsvpRepository: IRsvpRepository,
) {
  const eventService = new EventService(eventRepository, rsvpRepository);
  const organizerController = new OrganizerController(eventService);

  const router = Router();

  // GET /organizer/dashboard — full page or HTMX partial
  router.get("/dashboard", organizerController.getDashboard);

  return router;
}
