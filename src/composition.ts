import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { CreatePrismaEventRepository } from "./repository/PrismaEventRepository";
import { CreatePrismaRsvpRepository } from "./repository/PrismaRsvpRepository";
import { CreateEventController } from "./controller/EventController";
import { CreateRsvpController } from "./controller/RsvpController";
import { createOrganizerRouter } from "./organizer/organizer.routes";
import { createRsvpRouter } from "./rsvp/rsvp.routes";

import { EventService } from "./service/EventService";
import { CreateRsvpService } from "./service/RsvpService";

import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  // Prisma client
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
  });

  // Event wiring (Prisma-backed)
  const eventRepository = CreatePrismaEventRepository(prisma);
  const eventService = new EventService(eventRepository);

  // RSVP wiring (Prisma-backed for Sprint 3)
  const rsvpRepository = CreatePrismaRsvpRepository(prisma);
  const rsvpService = CreateRsvpService(rsvpRepository, eventRepository);

  const eventController = CreateEventController(eventService, rsvpService);
  const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);

  // Organizer wiring
  const organizerRouter = createOrganizerRouter(eventRepository, rsvpRepository);

  // RSVP Dashboard wiring (Prisma-backed for Feature 7, Sprint 3)
  const rsvpRouter = createRsvpRouter(rsvpRepository, eventRepository);

  return CreateApp(authController, eventController, rsvpController, organizerRouter, rsvpRouter, resolvedLogger);
}