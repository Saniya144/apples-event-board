import { Router } from "express";
import { OrganizerController } from "./OrganizerController";
import { EventService } from "../event/EventService";
import type { IEventRepository } from "../repository/EventRepository";

export function createOrganizerRouter(eventRepository: IEventRepository) {
  const eventService = new EventService(eventRepository);
  const organizerController = new OrganizerController(eventService);

  const router = Router();

  // GET /organizer/dashboard — full page or HTMX partial
  router.get("/dashboard", organizerController.getDashboard);

  return router;
}
