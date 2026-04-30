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

  app.get("/events/search", async (req, res) => {
    const session = (req as any).session.app;

    if (!session?.authenticatedUser) {
      res.status(401).render("partials/error", {
        message: "Please log in to continue.",
        layout: false,
      });
      return;
    }

    await eventController.searchEvents(res, session, req.query.q);
  });

  return app;
}

describe("GET /events/search", () => {
  it("returns 200 and matching events for a valid query", async () => {
    const app = buildApp({
      userId: "user-reader",
      email: "user@app.test",
      displayName: "Una User",
      role: "user",
    });

    const res = await request(app).get("/events/search?q=music");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Open Mic Night");
    expect(res.text).toContain("Music, poetry, and comedy");
  });

  it("returns 200 for an empty query", async () => {
    const app = buildApp({
      userId: "user-reader",
      email: "user@app.test",
      displayName: "Una User",
      role: "user",
    });

    const res = await request(app).get("/events/search?q=");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Open Mic Night");
  });

  it("returns 200 when no matching events are found", async () => {
    const app = buildApp({
      userId: "user-reader",
      email: "user@app.test",
      displayName: "Una User",
      role: "user",
    });

    const res = await request(app).get("/events/search?q=zzzzzzzz");

    expect(res.status).toBe(200);
    expect(res.text).not.toContain("Open Mic Night");
  });

  it("returns 400 for invalid query input", async () => {
    const app = buildApp({
      userId: "user-reader",
      email: "user@app.test",
      displayName: "Una User",
      role: "user",
    });

    const res = await request(app).get("/events/search?q=bad&q=other");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Search query must be a string.");
  });

  it("returns 401 when not authenticated", async () => {
    const app = buildApp(null);

    const res = await request(app).get("/events/search?q=music");

    expect(res.status).toBe(401);
    expect(res.text).toContain("Please log in to continue.");
  });
});