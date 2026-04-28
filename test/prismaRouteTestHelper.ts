import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaEventRepository } from "../src/repository/PrismaEventRepository";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" }),
});

export { prisma };

export function createPrismaEventRepository(): PrismaEventRepository {
  return new PrismaEventRepository(prisma);
}

export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export async function clearEvents(): Promise<void> {
  await prisma.event.deleteMany();
}

export async function seedDefaultEvents(): Promise<void> {
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
