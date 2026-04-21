import request from "supertest";
import express from "express";
import path from "path";
import Layouts from "express-ejs-layouts";
import { createOrganizerRouter } from "../../src/organizer/organizer.routes";
import { InMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";
import { CreateInMemoryRsvpRepository } from "../../src/repository/InMemoryRsvpRepository";
import type { UserRole } from "../../src/auth/User";

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

  const eventRepository = new InMemoryEventRepository();
  const rsvpRepository = CreateInMemoryRsvpRepository();

  app.use("/organizer", createOrganizerRouter(eventRepository, rsvpRepository));

  return { app, rsvpRepository };
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

    await rsvpRepository.create({
      eventId: "event-2",
      userId: "user-1",
      status: "going",
    });
    await rsvpRepository.create({
      eventId: "event-2",
      userId: "user-2",
      status: "going",
    });
    await rsvpRepository.create({
      eventId: "event-2",
      userId: "user-3",
      status: "waitlisted",
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
});
