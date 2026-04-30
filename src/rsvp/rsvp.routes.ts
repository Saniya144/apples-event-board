import express from "express";
import { PrismaClient } from "@prisma/client";
import { RSVPController } from "./RSVPController";
import { RSVPService } from "./RSVPService";
import { InMemoryRSVPRepository } from "./InMemoryRSVPRepository";
import { PrismaRsvpRepository } from "../repository/PrismaRsvpRepository";

// Default export for backward compatibility (in-memory, for tests that don't pass Prisma)
export const rsvpRepository = new InMemoryRSVPRepository();
const rsvpService = new RSVPService(rsvpRepository);
const rsvpController = new RSVPController(rsvpService);

export const rsvpRouter = express.Router();

// GET dashboard
rsvpRouter.get("/dashboard", rsvpController.getDashboard);

// POST toggle RSVP (reuses Feature 4's endpoint)
rsvpRouter.post("/:eventId/toggle", rsvpController.toggleRSVP);

// Factory function for Prisma-backed router (used by the composed app in Sprint 3)
export function createRsvpRouter(prisma: PrismaClient): express.Router {
  const prismaRepository = new PrismaRsvpRepository(prisma);
  const prismaService = new RSVPService(prismaRepository);
  const prismaController = new RSVPController(prismaService);

  const router = express.Router();
  
  // GET dashboard
  router.get("/dashboard", prismaController.getDashboard);

  // POST toggle RSVP (reuses Feature 4's endpoint)
  router.post("/:eventId/toggle", prismaController.toggleRSVP);

  return router;
}