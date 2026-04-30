import request from "supertest";
import express from "express";
import path from "path";
import Layouts from "express-ejs-layouts";
import { rsvpRouter, rsvpRepository } from "../../src/rsvp/rsvp.routes";

function buildApp(
  userId?: string,
  role: "admin" | "staff" | "user" = "user"
) {
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
              role,
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

  it("returns 403 for organizers and admins", async () => {
    const staffApp = buildApp("staff-user", "staff");
    const adminApp = buildApp("admin-user", "admin");

    const staffRes = await request(staffApp).get("/rsvps/dashboard");
    const adminRes = await request(adminApp).get("/rsvps/dashboard");

    expect(staffRes.status).toBe(403);
    expect(adminRes.status).toBe(403);
  });

  it("returns 200 with empty list for user with no RSVPs", async () => {
    const app = buildApp("user-with-no-rsvps");
    const res = await request(app).get("/rsvps/dashboard");
    expect(res.status).toBe(200);
    expect(res.text).toContain("You have no RSVPs yet.");
  });

  it("groups upcoming and past/cancelled RSVPs", async () => {
    const userId = "grouping-user";

    rsvpRepository.upsertEventStub({
      id: "upcoming-event",
      title: "Upcoming Event",
      location: "Amherst, MA",
      category: "social",
      status: "published",
      startDatetime: new Date("2026-05-01T10:00:00Z"),
      endDatetime: new Date("2026-05-01T12:00:00Z"),
    });

    rsvpRepository.upsertEventStub({
      id: "cancelled-event",
      title: "Cancelled Event",
      location: "Amherst, MA",
      category: "social",
      status: "cancelled",
      startDatetime: new Date("2026-05-03T10:00:00Z"),
      endDatetime: new Date("2026-05-03T12:00:00Z"),
    });

    rsvpRepository.upsertEventStub({
      id: "past-event",
      title: "Past Event",
      location: "Amherst, MA",
      category: "social",
      status: "published",
      startDatetime: new Date("2026-04-01T10:00:00Z"),
      endDatetime: new Date("2026-04-01T12:00:00Z"),
    });

    await rsvpRepository.save({
      id: "rsvp-upcoming",
      eventId: "upcoming-event",
      userId,
      status: "going",
      createdAt: new Date(),
    });

    await rsvpRepository.save({
      id: "rsvp-cancelled",
      eventId: "cancelled-event",
      userId,
      status: "going",
      createdAt: new Date(),
    });

    await rsvpRepository.save({
      id: "rsvp-past",
      eventId: "past-event",
      userId,
      status: "going",
      createdAt: new Date(),
    });

    const app = buildApp(userId);
    const res = await request(app).get("/rsvps/dashboard");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Upcoming Events");
    expect(res.text).toContain("Past Events");
    expect(res.text).toContain("Upcoming Event");
    expect(res.text).toContain("Cancelled Event");
    expect(res.text).toContain("Past Event");
  });

  it("sorts upcoming RSVPs by event start time", async () => {
    const userId = "sorted-user";

    rsvpRepository.upsertEventStub({
      id: "later-upcoming-event",
      title: "Later Upcoming Event",
      location: "Amherst, MA",
      category: "social",
      status: "published",
      startDatetime: new Date("2026-06-02T10:00:00Z"),
      endDatetime: new Date("2026-06-02T12:00:00Z"),
    });

    rsvpRepository.upsertEventStub({
      id: "earlier-upcoming-event",
      title: "Earlier Upcoming Event",
      location: "Amherst, MA",
      category: "social",
      status: "published",
      startDatetime: new Date("2026-06-01T10:00:00Z"),
      endDatetime: new Date("2026-06-01T12:00:00Z"),
    });

    await rsvpRepository.save({
      id: "rsvp-later-upcoming",
      eventId: "later-upcoming-event",
      userId,
      status: "going",
      createdAt: new Date(),
    });

    await rsvpRepository.save({
      id: "rsvp-earlier-upcoming",
      eventId: "earlier-upcoming-event",
      userId,
      status: "going",
      createdAt: new Date(),
    });

    const app = buildApp(userId);
    const res = await request(app).get("/rsvps/dashboard");

    expect(res.status).toBe(200);
    expect(res.text.indexOf("Earlier Upcoming Event")).toBeLessThan(
      res.text.indexOf("Later Upcoming Event")
    );
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

  it("cancels an RSVP when cancel button is clicked", async () => {
    const userId = "user-to-cancel";

    // Seed an event and RSVP
    rsvpRepository.upsertEventStub({
      id: "cancel-test-event",
      title: "Event to Cancel",
      location: "Test Location",
      category: "test",
      status: "published",
      startDatetime: new Date("2026-06-01T10:00:00Z"),
      endDatetime: new Date("2026-06-01T12:00:00Z"),
    });

    await rsvpRepository.save({
      id: "rsvp-to-cancel",
      eventId: "cancel-test-event",
      userId: userId,
      status: "going",
      createdAt: new Date(),
    });

    const app = buildApp(userId);

    // Verify RSVP exists initially
    const beforeRes = await request(app).get("/rsvps/dashboard");
    expect(beforeRes.text).toContain("Event to Cancel");
    expect(beforeRes.text).toContain('hx-swap="delete"');
    expect(beforeRes.text).toContain('hx-target="closest li"');

    // Cancel the RSVP
    const cancelRes = await request(app)
      .post("/rsvps/cancel-test-event/toggle")
      .set("hx-request", "true");

    expect(cancelRes.status).toBe(200);

    // Verify RSVP is gone from dashboard
    const afterRes = await request(app).get("/rsvps/dashboard");
    expect(afterRes.text).not.toContain("Event to Cancel");
  });

});