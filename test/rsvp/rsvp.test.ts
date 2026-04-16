import request from "supertest";
import express from "express";
import path from "path";
import Layouts from "express-ejs-layouts";
import { rsvpRouter, rsvpRepository } from "../../src/rsvp/rsvp.routes";

function buildApp(userId?: string) {
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    (req as any).session = {
      app: {
        browserId: "test-browser",
        browserLabel: "Browser TEST",
        visitCount: 1,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        authenticatedUser: userId
          ? {
              userId,
              email: "test@test.com",
              displayName: "Test User",
              role: "user",
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

  app.use("/rsvps", rsvpRouter);
  return app;
}

describe("GET /rsvps/dashboard", () => {
  it("returns 403 when user is not logged in", async () => {
    const app = buildApp(undefined);
    const res = await request(app).get("/rsvps/dashboard");
    expect(res.status).toBe(403);
  });

  it("returns 200 with empty list for user with no RSVPs", async () => {
    const app = buildApp("user-with-no-rsvps");
    const res = await request(app).get("/rsvps/dashboard");
    expect(res.status).toBe(200);
  });

  it("returns RSVP list for a user who has RSVPs", async () => {
    const userId = "user-with-rsvps";

    rsvpRepository.upsertEventStub({
      id: "event-1",
      title: "Test Event",
      location: "Amherst, MA",
      category: "social",
      status: "published",
      startDatetime: new Date("2025-06-01T10:00:00Z"),
      endDatetime: new Date("2025-06-01T12:00:00Z"),
    });

    await rsvpRepository.save({
      id: "rsvp-1",
      eventId: "event-1",
      userId,
      status: "going",
      createdAt: new Date(),
    });

    const app = buildApp(userId);
    const res = await request(app).get("/rsvps/dashboard");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Test Event");
    expect(res.text).toContain("Going");
  });

  it("returns HTML partial when request is from HTMX", async () => {
    const app = buildApp("htmx-user");
    const res = await request(app)
      .get("/rsvps/dashboard")
      .set("hx-request", "true");

    expect(res.status).toBe(200);
    expect(res.text).not.toContain("<html");
  });

  it("shows waitlisted status with correct label", async () => {
    const userId = "waitlisted-user";

    rsvpRepository.upsertEventStub({
      id: "event-2",
      title: "Popular Event",
      location: "Northampton, MA",
      category: "volunteer",
      status: "published",
      startDatetime: new Date("2025-07-01T09:00:00Z"),
      endDatetime: new Date("2025-07-01T11:00:00Z"),
    });

    await rsvpRepository.save({
      id: "rsvp-2",
      eventId: "event-2",
      userId,
      status: "waitlisted",
      createdAt: new Date(),
    });

    const app = buildApp(userId);
    const res = await request(app).get("/rsvps/dashboard");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Waitlisted");
  });
});