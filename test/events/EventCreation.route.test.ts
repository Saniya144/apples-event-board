import request from "supertest";
import express from "express";
import path from "path";
import Layouts from "express-ejs-layouts";
import { CreateEventController } from "../../src/controller/EventController";
import { EventService } from "../../src/service/EventService";
import { CreateRsvpService } from "../../src/service/RsvpService";
import { createPrismaEventRepository, setupPrismaRouteTests } from "../prismaRouteTestHelper";
import { CreateInMemoryRsvpRepository } from "../../src/repository/InMemoryRsvpRepository";

setupPrismaRouteTests();

function buildApp(user: any | null) {
  const app = express();
  app.use(express.urlencoded({ extended: true }));

  app.use((req, _res, next) => {
    (req as any).session = {
      app: {
        authenticatedUser: user,
      },
    };
    next();
  });

  app.use(Layouts);
  app.use(express.json());
  app.set("view engine", "ejs");
  app.set("views", path.join(process.cwd(), "src/views"));
  app.set("layout", "layouts/base");

  const eventRepo = createPrismaEventRepository();
  const rsvpRepo = CreateInMemoryRsvpRepository();
  const rsvpService = CreateRsvpService(rsvpRepo, eventRepo);
  const eventService = new EventService(eventRepo);
  const eventController = CreateEventController(eventService, rsvpService);

  app.post("/events/new", async (req, res) => {
    const session = (req as any).session.app;

    if (!session?.authenticatedUser) {
      res.status(401).render("partials/error", {
        message: "Please log in to continue.",
        layout: false,
      });
      return;
    }

    await eventController.createEventFromForm(res, req.body, session);
  });

  return app;
}

describe("POST /events/new", () => {
  const user = {
    userId: "user1",
    email: "staff@app.test",
    displayName: "Staff User",
    role: "admin",
  };

  it("redirects on successful create", async () => {
    const app = buildApp(user);

    const response = await request(app).post("/events/new").send({
      title: "Study Session",
      location: "Campus",
      startTime: "2026-04-25T10:00",
      endTime: "2026-04-25T11:00",
    });

    expect(response.status).toBe(302);
    expect(response.header.location).toBe("/home");
  });

  it("renders partial error when end time is before start time", async () => {
    const app = buildApp(user);

    const response = await request(app).post("/events/new").send({
      title: "Study Night",
      location: "Campus Center",
      startTime: "2026-04-25T11:00",
      endTime: "2026-04-25T10:00",
    });

    expect(response.status).toBe(400);
    expect(response.text).toContain("EventEndBeforeStartError");
    expect(response.text).toContain("End time must be after start time.");
  });

  it("renders partial error when title is missing", async () => {
    const app = buildApp(user);

    const response = await request(app).post("/events/new").send({
      title: "",
      location: "Campus Center",
      startTime: "2026-04-25T10:00",
      endTime: "2026-04-25T11:00",
    });

    expect(response.status).toBe(400);
    expect(response.text).toContain("EventTitleRequiredError");
    expect(response.text).toContain("Title is required.");
  });

  it("renders partial error when location is missing", async () => {
    const app = buildApp(user);

    const response = await request(app).post("/events/new").send({
      title: "Study Night",
      location: "",
      startTime: "2026-04-25T10:00",
      endTime: "2026-04-25T11:00",
    });

    expect(response.status).toBe(400);
    expect(response.text).toContain("EventLocationRequiredError");
    expect(response.text).toContain("Location is required.");
  });

  it("renders partial error when start time is in the past", async () => {
    const app = buildApp(user);

    const response = await request(app).post("/events/new").send({
      title: "Study Night",
      location: "Campus Center",
      startTime: "2009-04-28T11:00",
      endTime: "2026-04-25T10:00",
    });

    expect(response.status).toBe(400);
    expect(response.text).toContain("EventStartTimeInPastError");
    expect(response.text).toContain("Start time cannot be in the past.");
  });

  it("blocks unauthenticated users", async () => {
    const app = buildApp(null);

    const response = await request(app).post("/events/new").send({
      title: "Study Night",
      location: "Campus Center",
      startTime: "2026-04-25T10:00",
      endTime: "2026-04-25T11:00",
    });

    expect(response.status).toBe(401);
    expect(response.text).toContain("Please log in to continue.");
  });
});