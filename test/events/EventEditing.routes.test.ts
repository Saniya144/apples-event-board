import request from "supertest";
import express from "express";
import path from "path";
import Layouts from "express-ejs-layouts";
import { CreateEventController } from "../../src/controller/EventController";
import { EventService } from "../../src/service/EventService";
import { CreateRsvpService } from "../../src/service/RsvpService";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";
import { CreateInMemoryRsvpRepository } from "../../src/repository/InMemoryRsvpRepository";

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

  const eventRepo = CreateInMemoryEventRepository();
  const rsvpRepo = CreateInMemoryRsvpRepository();
  const rsvpService = CreateRsvpService(rsvpRepo, eventRepo);
  const eventService = new EventService(eventRepo);
  const eventController = CreateEventController(eventService, rsvpService);

  app.post("/events/:id/edit", async (req, res) => {
    const session = (req as any).session.app;

    if (!session?.authenticatedUser) {
      res.status(401).render("partials/error", {
        message: "Please log in to continue.",
        layout: false,
      });
      return;
    }

    await eventController.updateEventFromForm(
      res,
      req.params.id,
      req.body,
      session
    );
  });

  return app;
}

describe("POST /events/:id/edit", () => {
  const user = {
    userId: "user-staff",
    email: "staff@app.test",
    displayName: "Staff User",
    role: "staff",
  };

  const user2 = {
    userId: "user2@app.test",
    email: "user2@app.test",
    displayName: "Staff User 2",
    role: "staff",
  };

  it("redirects on successful edit", async () => {
    const app = buildApp(user);

    const response = await request(app).post("/events/event-2/edit").send({
      title: "Studying",
      location: "Woo",
      startTime: "2026-04-22T19:00",
      endTime: "2026-04-22T21:00",
      description: "Updated description",
    });

    expect(response.status).toBe(302);
    expect(response.header.location).toBe("/home");
  });

  it("renders partial error when end time is before start time", async () => {
    const app = buildApp(user);

    const response = await request(app).post("/events/event-2/edit").send({
      title: "Study Night",
      location: "Campus Center",
      startTime: "2026-04-22T21:00",
      endTime: "2026-04-22T19:00",
    });

    expect(response.status).toBe(200);
    expect(response.text).toContain("EventEditEndBeforeStartError");
    expect(response.text).toContain("End time must be after start time.");
  });

  it("renders partial error when title is missing", async () => {
    const app = buildApp(user);

    const response = await request(app).post("/events/event-2/edit").send({
      title: "",
      location: "Campus Center",
      startTime: "2026-04-22T19:00",
      endTime: "2026-04-22T21:00",
    });

    expect(response.status).toBe(200);
    expect(response.text).toContain("EventEditTitleRequiredError");
    expect(response.text).toContain("Title is required.");
  });

  it("renders partial error when location is missing", async () => {
    const app = buildApp(user);

    const response = await request(app).post("/events/event-2/edit").send({
      title: "Study Night",
      location: "",
      startTime: "2026-04-22T19:00",
      endTime: "2026-04-22T21:00",
    });

    expect(response.status).toBe(200);
    expect(response.text).toContain("EventEditLocationRequiredError");
    expect(response.text).toContain("Location is required.");
  });

  it("renders partial error when user is not authorized to edit", async () => {
    const app = buildApp(user2);

    const response = await request(app).post("/events/event-2/edit").send({
      title: "basketball",
      location: "rec",
      startTime: "2026-04-22T19:00",
      endTime: "2026-04-22T21:00",
    });

    expect(response.status).toBe(200);
    expect(response.text).toContain("EventEditUnauthorizedError");
    expect(response.text).toContain("Not authorized to edit this event.");
  });

  it("blocks unauthenticated users", async () => {
    const app = buildApp(null);

    const response = await request(app).post("/events/event-2/edit").send({
      title: "club meeting",
      location: "LGRC",
      startTime: "2026-04-22T19:00",
      endTime: "2026-04-22T21:00",
    });

    expect(response.status).toBe(401);
    expect(response.text).toContain("Please log in to continue.");
  });
});