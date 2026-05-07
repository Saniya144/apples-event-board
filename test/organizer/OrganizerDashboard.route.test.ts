import request from "supertest";
import express from "express";
import path from "path";
import Layouts from "express-ejs-layouts";
import { CreateEventController } from "../../src/controller/EventController";
import { EventService } from "../../src/service/EventService";
import { CreateRsvpService } from "../../src/service/RsvpService";
import { createOrganizerRouter } from "../../src/organizer/organizer.routes";
import { createPrismaEventRepository, createPrismaRsvpRepository, setupPrismaRouteTests } from "../prismaRouteTestHelper";
import type { UserRole } from "../../src/auth/User";

setupPrismaRouteTests();

function buildApp(userId: string, role: UserRole) {
  const app = express();

  app.use((req, _res, next) => {
    (req as any).session = {
      app: {
        browserId: "test-browser",
        browserLabel: "Browser TEST",
        visitCount: 1,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        authenticatedUser: {
          userId,
          email: `${userId}@app.test`,
          displayName: `User ${userId}`,
          role,
          signedInAt: new Date().toISOString(),
        },
      },
    };
    next();
  });

  app.use(Layouts);
  app.set("view engine", "ejs");
  app.set("views", path.join(process.cwd(), "src/views"));
  app.set("layout", "layouts/base");

  const eventRepository = createPrismaEventRepository();
  const rsvpRepository = createPrismaRsvpRepository();
  const eventService = new EventService(eventRepository);
  const eventController = CreateEventController(eventService, CreateRsvpService(rsvpRepository, eventRepository));

  app.use("/organizer", createOrganizerRouter(eventRepository, rsvpRepository));

  app.post("/events/:id/publish", async (req, res) => {
    const session = (req as any).session.app;

    await eventController.publishEvent(req, res, {
      eventId: req.params.id,
      actingUserId: session.authenticatedUser.userId,
      actingUserRole: session.authenticatedUser.role,
      session,
    });
  });

  app.post("/events/:id/cancel", async (req, res) => {
    const session = (req as any).session.app;

    await eventController.cancelEvent(req, res, {
      eventId: req.params.id,
      actingUserId: session.authenticatedUser.userId,
      actingUserRole: session.authenticatedUser.role,
      session,
    });
  });

  return { app, rsvpRepository, eventRepository };
}

describe("GET /organizer/dashboard", () => {
  it("shows only own events for staff organizers", async () => {
    const { app } = buildApp("user-staff", "staff");

    const res = await request(app).get("/organizer/dashboard");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Open Mic Night");
    expect(res.text).not.toContain("Board Game Night");
  });

  it("shows all events for admins", async () => {
    const { app } = buildApp("user-admin", "admin");

    const res = await request(app).get("/organizer/dashboard");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Open Mic Night");
    expect(res.text).toContain("Board Game Night");
  });

  it("rejects members", async () => {
    const { app } = buildApp("user-reader", "user");

    const res = await request(app).get("/organizer/dashboard");

    expect(res.status).toBe(403);
    expect(res.text).toContain("Only staff and admins can access organizer dashboard.");
  });

  it("renders accurate attendee count", async () => {
    const { app, rsvpRepository } = buildApp("user-staff", "staff");

    await rsvpRepository.save({
      id: "rsvp-1",
      eventId: "event-2",
      userId: "user-1",
      status: "going",
      createdAt: new Date().toISOString(),
    });
    await rsvpRepository.save({
      id: "rsvp-2",
      eventId: "event-2",
      userId: "user-2",
      status: "going",
      createdAt: new Date().toISOString(),
    });
    await rsvpRepository.save({
      id: "rsvp-3",
      eventId: "event-2",
      userId: "user-3",
      status: "waitlisted",
      createdAt: new Date().toISOString(),
    });

    const res = await request(app).get("/organizer/dashboard");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Attendance: 2");
    expect(res.text).toContain("/ 50");
  });

  it("renders HTMX quick actions for status transitions", async () => {
    const { app } = buildApp("user-admin", "admin");

    const res = await request(app).get("/organizer/dashboard");

    expect(res.status).toBe(200);
    expect(res.text).toContain('hx-post="/events/event-1/publish"');
    expect(res.text).toContain('hx-post="/events/event-2/cancel"');
    expect(res.text).toContain("organizer-dashboard-refresh");
  });

  it("moves a draft event into the published section via HTMX", async () => {
    const { app, eventRepository } = buildApp("user-admin", "admin");

    await eventRepository.create({
      id: "future-draft-event",
      title: "Future Draft Event",
      description: "Draft event for publish testing",
      location: "Campus Center",
      category: "Social",
      status: "draft",
      capacity: 20,
      startDatetime: "2026-05-10T18:00:00.000Z",
      endDatetime: "2026-05-10T20:00:00.000Z",
      organizerId: "user-admin",
      createdAt: "2026-05-01T12:00:00.000Z",
      updatedAt: "2026-05-01T12:00:00.000Z",
    });

    const res = await request(app)
      .post("/events/future-draft-event/publish")
      .set("HX-Request", "true")
      .set("HX-Target", "event-list");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Published");
    expect(res.text).toContain("Future Draft Event");
    expect(res.text).toContain("Draft");
  });

  it("moves a published event into the cancelled-or-past section via HTMX", async () => {
    const { app } = buildApp("user-admin", "admin");

    const res = await request(app)
      .post("/events/event-2/cancel")
      .set("HX-Request", "true")
      .set("HX-Target", "event-list");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Cancelled Or Past");
    expect(res.text).toContain("Open Mic Night");
  });
});
