import express from "express";
import { CreateRsvpController } from "../controller/RsvpController";
import { CreateRsvpService } from "../service/RsvpService";
import { CreateLoggingService } from "../service/LoggingService";
import type { IRsvpRepository } from "../repository/RsvpRepository";
import type { IEventRepository } from "../repository/EventRepository";
import { CreateInMemoryRsvpRepository } from "../repository/InMemoryRsvpRepository";
import { CreateInMemoryEventRepository } from "../repository/InMemoryEventRepository";

export function createRsvpRouter(
  rsvpRepository: IRsvpRepository,
  eventRepository: IEventRepository
): express.Router {
  const logger = CreateLoggingService();
  const service = CreateRsvpService(rsvpRepository, eventRepository);
  const controller = CreateRsvpController(service, logger);

  const router = express.Router();
  router.get("/dashboard", controller.getDashboard);
  router.post("/:eventId/toggle", controller.toggleRSVP);

  return router;
}

export const rsvpRepository = CreateInMemoryRsvpRepository();
export const eventRepository = CreateInMemoryEventRepository();
export const rsvpRouter = createRsvpRouter(rsvpRepository, eventRepository);