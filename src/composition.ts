import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";

import { CreateInMemoryEventRepository } from "./repository/InMemoryEventRepository";
import { CreateInMemoryRsvpRepository } from "./repository/InMemoryRsvpRepository";
import { CreateEventController } from "./controller/EventController";
import { CreateRsvpController } from "./controller/RsvpController";
import { createOrganizerRouter } from "./organizer/organizer.routes";

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

  // Event wiring (created but not passed to CreateApp)
  const eventRepository = CreateInMemoryEventRepository();
  const eventService = new EventService(eventRepository);
  

  // RSVP wiring (created but not passed to CreateApp)
  const rsvpRepository = CreateInMemoryRsvpRepository();
  const rsvpService = CreateRsvpService(rsvpRepository, eventRepository);
  const eventController = CreateEventController(eventService, rsvpService);
  const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);

  // Organizer wiring - pass the shared event repository
  const organizerRouter = createOrganizerRouter(eventRepository);

  // CreateApp only expects authController and logger
  // The other controllers need to be registered another way (likely in app.ts routes)
  return CreateApp(authController, eventController, rsvpController, organizerRouter, resolvedLogger);
}
