import express from "express";
import { RSVPController } from "./RSVPController";
import { RSVPService } from "./RSVPService";
import { InMemoryRSVPRepository } from "./InMemoryRSVPRepository";

export const rsvpRepository = new InMemoryRSVPRepository();
const rsvpService = new RSVPService(rsvpRepository);
const rsvpController = new RSVPController(rsvpService);

export const rsvpRouter = express.Router();

// GET dashboard
rsvpRouter.get("/dashboard", rsvpController.getDashboard);

// POST toggle RSVP (reuses Feature 4's endpoint)
rsvpRouter.post("/:eventId/toggle", rsvpController.toggleRSVP);