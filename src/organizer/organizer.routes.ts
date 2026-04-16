import { Router } from "express";
import { OrganizerController } from "./OrganizerController";
import { EventService } from "../event/EventService";
import { InMemoryEventRepository } from "../event/InMemoryEventRepository";

const eventRepository = new InMemoryEventRepository();
const eventService = new EventService(eventRepository);
const organizerController = new OrganizerController(eventService);

const router = Router();

// GET /organizer/dashboard — full page or HTMX partial
router.get("/dashboard", organizerController.getDashboard);

export { router as organizerRouter, eventRepository };
