import { Router } from "express";
import { RSVPController } from "./RSVPController";
import { RSVPService } from "./RSVPService";
import { InMemoryRSVPRepository } from "./InMemoryRSVPRepository";

const rsvpRepository = new InMemoryRSVPRepository();
const rsvpService = new RSVPService(rsvpRepository);
const rsvpController = new RSVPController(rsvpService);

const router = Router();

// GET /rsvps/dashboard — full page or HTMX partial
router.get("/dashboard", rsvpController.getDashboard);

export { router as rsvpRouter, rsvpRepository };
