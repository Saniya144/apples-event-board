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

  app.get("/home", async (req, res) => {
    const session = (req as any).session.app;

    if (!session?.authenticatedUser) {
      res.status(401).render("partials/error", {
        message: "Please log in to continue.",
        layout: false,
      });
      return;
    }

    const { category, date } = req.query;

    await eventController.getAllEvents(res, session, {
      category,
      date,
    });
  });

  return app;
}

describe("GET /home filter route", () => {
  const user = {
    userId: "user-reader",
    email: "user@app.test",
    displayName: "Una User",
    role: "user" as const,
  };

  it("returns 200 with no filters", async () => {
    const app = buildApp(user);

    const res = await request(app).get("/home");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Open Mic Night");
  });

  it("returns 200 for a valid category filter", async () => {
    const app = buildApp(user);

    const res = await request(app).get("/home?category=Arts");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Open Mic Night");
  });

  it("returns 200 for a valid week filter", async () => {
    const app = buildApp(user);

    const res = await request(app).get("/home?date=week");

    expect(res.status).toBe(200);
  });

  it("returns 200 for a valid category and date combination", async () => {
    const app = buildApp(user);

    const res = await request(app).get("/home?category=Arts&date=week");

    expect(res.status).toBe(200);
  });

  it("returns 400 for an invalid date filter", async () => {
    const app = buildApp(user);

    const res = await request(app).get("/home?date=invalid");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Invalid date filter.");
  });

  it("returns 200 when category filter matches no events", async () => {
    const app = buildApp(user);

    const res = await request(app).get("/home?category=NoSuchCategory");

    expect(res.status).toBe(200);
    expect(res.text).toContain("No matching events found.");
  });

  it("returns 401 when not authenticated", async () => {
    const app = buildApp(null);

    const res = await request(app).get("/home");

    expect(res.status).toBe(401);
    expect(res.text).toContain("Please log in to continue.");
  });
});