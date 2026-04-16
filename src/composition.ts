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

import { EventService } from "./service/EventService";
import { CreateRsvpService } from "./service/RsvpService";

import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";
// Removed unused imports

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  // Event wiring
  const eventRepository = CreateInMemoryEventRepository();
  const eventService = new EventService(eventRepository);

  // RSVP wiring
  const rsvpRepository = CreateInMemoryRsvpRepository();
  const rsvpService = CreateRsvpService(rsvpRepository, eventRepository);
  const eventController = CreateEventController(eventService);
  const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);

  return CreateApp(authController, eventController, rsvpController, resolvedLogger);
}
