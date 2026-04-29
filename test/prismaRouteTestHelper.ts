import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaEventRepository } from "../src/repository/PrismaEventRepository";
import { PrismaRSVPRepository } from "../src/rsvp/PrismaRSVPRepository";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" }),
});

export { prisma };

export function createPrismaEventRepository(): PrismaEventRepository {
  return new PrismaEventRepository(prisma);
}

export function createPrismaRsvpRepository(): PrismaRSVPRepository {
  return new PrismaRSVPRepository(prisma);
}

export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export async function clearEvents(): Promise<void> {
  if (prisma.rsvp && typeof prisma.rsvp.deleteMany === "function") {
    await prisma.rsvp.deleteMany();
  }
  if (prisma.event && typeof prisma.event.deleteMany === "function") {
    await prisma.event.deleteMany();
    return;
  }

  // Fallback raw deletes if model helpers are unavailable
  await prisma.$executeRawUnsafe(`DELETE FROM "Rsvp"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Event"`);
}

export async function seedDefaultEvents(): Promise<void> {
  if (prisma.event && typeof prisma.event.createMany === "function") {
    await prisma.event.createMany({
      data: [
        {
          id: "event-1",
          title: "Board Game Night",
          description: "Games and snacks",
          location: "Campus Center",
          category: "Social",
          status: "draft",
          capacity: 20,
          startDatetime: "2026-12-16T18:00:00.000Z",
          endDatetime: "2026-12-16T20:00:00.000Z",
          organizerId: "user-admin",
          createdAt: "2026-12-13T10:00:00.000Z",
          updatedAt: "2026-12-13T10:00:00.000Z",
        },
        {
          id: "event-2",
          title: "Open Mic Night",
          description: "Music, poetry, and comedy",
          location: "Student Union",
          category: "Arts",
          status: "published",
          capacity: 50,
          startDatetime: "2026-12-22T19:00:00.000Z",
          endDatetime: "2026-12-22T21:00:00.000Z",
          organizerId: "user-staff",
          createdAt: "2026-04-14T10:00:00.000Z",
          updatedAt: "2026-04-14T10:00:00.000Z",
        },
      ],
    });
    return;
  }

  // Fallback to raw SQL if the generated client doesn't expose model helpers
  await prisma.$executeRawUnsafe(`DELETE FROM "Event" WHERE id IN ('event-1','event-2')`);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Event" ("id","title","description","location","category","status","capacity","startDatetime","endDatetime","organizerId","createdAt","updatedAt") VALUES
    ('event-1','Board Game Night','Games and snacks','Campus Center','Social','draft',20,'2026-12-16T18:00:00.000Z','2026-12-16T20:00:00.000Z','user-admin','2026-12-13T10:00:00.000Z','2026-12-13T10:00:00.000Z'),
    ('event-2','Open Mic Night','Music, poetry, and comedy','Student Union','Arts','published',50,'2026-12-22T19:00:00.000Z','2026-12-22T21:00:00.000Z','user-staff','2026-04-14T10:00:00.000Z','2026-04-14T10:00:00.000Z')`
  );
}

export function setupPrismaRouteTests(): void {
  beforeAll(async () => {
    await connectPrisma();
  });

  beforeEach(async () => {
    await clearEvents();
    await seedDefaultEvents();
  });

  afterAll(async () => {
    await clearEvents();
    await disconnectPrisma();
  });
}
