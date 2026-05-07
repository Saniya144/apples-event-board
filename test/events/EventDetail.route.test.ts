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

function buildApp(
  user:
    | {
        userId: string;
        email: string;
        displayName: string;
        role: "admin" | "staff" | "user";
      }
    | null
) {
  const app = express();
  app.use(express.urlencoded({ extended: true }));

  app.use((req, _res, next) => {
    (req as any).session = {
      app: {
        browserId: "test-browser",
        browserLabel: "Browser TEST",
        visitCount: 1,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        authenticatedUser: user
          ? {
              userId: user.userId,
              email: user.email,
              displayName: user.displayName,
              role: user.role,
              signedInAt: new Date().toISOString(),
            }
          : null,
      },
    };
    next();
  });

  app.use(Layouts);
  app.set("view engine", "ejs");
  app.set("views", path.join(process.cwd(), "src/views"));
  app.set("layout", "layouts/base");

  const eventRepository = createPrismaEventRepository();
  const rsvpRepository = CreateInMemoryRsvpRepository();
  const rsvpService = CreateRsvpService(rsvpRepository, eventRepository);
  const eventService = new EventService(eventRepository);
  const eventController = CreateEventController(eventService, rsvpService);

  app.get("/events/:id", async (req, res) => {
    const session = (req as any).session.app;

    if (!session?.authenticatedUser) {
      res.status(401).render("partials/error", {
        message: "Please log in to continue.",
        layout: false,
      });
      return;
    }

    await eventController.showEventDetail(res, {
      eventId: req.params.id,
      actingUserId: session.authenticatedUser.userId,
      actingUserRole: session.authenticatedUser.role,
      session,
    });
  });

  app.post("/events/:id/publish", async (req, res) => {
    const session = (req as any).session.app;

    if (!session?.authenticatedUser) {
      res.status(401).render("partials/error", {
        message: "Please log in to continue.",
        layout: false,
      });
      return;
    }

    await eventController.publishEvent(req, res, {
      eventId: req.params.id,
      actingUserId: session.authenticatedUser.userId,
      actingUserRole: session.authenticatedUser.role,
      session,
    });
  });

  app.post("/events/:id/cancel", async (req, res) => {
    const session = (req as any).session.app;

    if (!session?.authenticatedUser) {
      res.status(401).render("partials/error", {
        message: "Please log in to continue.",
        layout: false,
      });
      return;
    }

    await eventController.cancelEvent(req, res, {
      eventId: req.params.id,
      actingUserId: session.authenticatedUser.userId,
      actingUserRole: session.authenticatedUser.role,
      session,
    });
  });

  return app;
}

describe("GET /events/:id", () => {
  it("returns 200 for a published event", async () => {
    const app = buildApp({
      userId: "user-reader",
      email: "user@app.test",
      displayName: "Una User",
      role: "user",
    });

    const res = await request(app).get("/events/event-2");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Open Mic Night");
    expect(res.text).toContain("Student Union");
  });

  it("returns 404 for a missing event", async () => {
    const app = buildApp({
      userId: "user-reader",
      email: "user@app.test",
      displayName: "Una User",
      role: "user",
    });

    const res = await request(app).get("/events/missing-event");

    expect(res.status).toBe(404);
    expect(res.text).toContain("Event not found.");
  });

  it("returns 404 for unauthorized draft access", async () => {
    const app = buildApp({
      userId: "user-reader",
      email: "user@app.test",
      displayName: "Una User",
      role: "user",
    });

    const res = await request(app).get("/events/event-1");

    expect(res.status).toBe(404);
    expect(res.text).toContain("Event not found.");
  });

  it("returns 200 when organizer views their own draft", async () => {
    const app = buildApp({
      userId: "user-admin",
      email: "admin@app.test",
      displayName: "Avery Admin",
      role: "admin",
    });

    const res = await request(app).get("/events/event-1");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Board Game Night");
    expect(res.text).toContain("Draft");
  });

  it("returns 200 when admin views a draft", async () => {
    const app = buildApp({
      userId: "user-admin",
      email: "admin@app.test",
      displayName: "Avery Admin",
      role: "admin",
    });

    const res = await request(app).get("/events/event-1");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Board Game Night");
    expect(res.text).toContain("Draft");
  });

  it("returns 401 when not authenticated", async () => {
    const app = buildApp(null);

    const res = await request(app).get("/events/event-2");

    expect(res.status).toBe(401);
    expect(res.text).toContain("Please log in to continue.");
  });
});

describe("POST /events/:id/publish", () => {
  it("publishes a draft event inline for the organizer", async () => {
    const app = buildApp({
      userId: "user-admin",
      email: "admin@app.test",
      displayName: "Avery Admin",
      role: "admin",
    });

    const res = await request(app)
      .post("/events/event-1/publish")
      .set("HX-Request", "true");

    expect(res.status).toBe(200);
    expect(res.text).toContain('id="lifecycle-controls"');
    expect(res.text).toContain("Current status:");
    expect(res.text).toContain("published");
    expect(res.text).toContain("Cancel Event");
    expect(res.text).not.toContain("Publish Event");
  });

  it("returns 403 for unauthorized publish attempt", async () => {
    const app = buildApp({
      userId: "user-reader",
      email: "user@app.test",
      displayName: "Una User",
      role: "user",
    });

    const res = await request(app)
      .post("/events/event-1/publish")
      .set("HX-Request", "true");

    expect(res.status).toBe(403);
    expect(res.text).toContain("Only the organizer can publish this event.");
  });

  it("returns 400 for invalid publish transition", async () => {
    const app = buildApp({
      userId: "user-staff",
      email: "staff@app.test",
      displayName: "Sam Staff",
      role: "staff",
    });

    const res = await request(app)
      .post("/events/event-2/publish")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Only draft events can be published.");
  });
});

describe("POST /events/:id/cancel", () => {
  it("cancels a published event inline for the organizer", async () => {
    const app = buildApp({
      userId: "user-staff",
      email: "staff@app.test",
      displayName: "Sam Staff",
      role: "staff",
    });

    const res = await request(app)
      .post("/events/event-2/cancel")
      .set("HX-Request", "true");

    expect(res.status).toBe(200);
    expect(res.text).toContain('id="lifecycle-controls"');
    expect(res.text).toContain("Current status:");
    expect(res.text).toContain("cancelled");
    expect(res.text).not.toContain("Cancel Event");
  });

  it("allows admin to cancel any published event", async () => {
    const app = buildApp({
      userId: "user-admin",
      email: "admin@app.test",
      displayName: "Avery Admin",
      role: "admin",
    });

    const res = await request(app)
      .post("/events/event-2/cancel")
      .set("HX-Request", "true");

    expect(res.status).toBe(200);
    expect(res.text).toContain("cancelled");
  });

  it("returns 403 for unauthorized cancel attempt", async () => {
    const app = buildApp({
      userId: "user-reader",
      email: "user@app.test",
      displayName: "Una User",
      role: "user",
    });

    const res = await request(app)
      .post("/events/event-2/cancel")
      .set("HX-Request", "true");

    expect(res.status).toBe(403);
    expect(res.text).toContain(
      "Only the organizer or an admin can cancel this event."
    );
  });

  it("returns 400 for invalid cancel transition", async () => {
    const app = buildApp({
      userId: "user-admin",
      email: "admin@app.test",
      displayName: "Avery Admin",
      role: "admin",
    });

    const res = await request(app)
      .post("/events/event-1/cancel")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Only published events can be cancelled.");
  });
});