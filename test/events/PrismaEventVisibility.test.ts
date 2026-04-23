import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaEventRepository } from "../../src/repository/PrismaEventRepository";
import { EventService } from "../../src/service/EventService";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" }),
});

describe("PrismaEventRepository visibility", () => {
  let service: EventService;

  beforeAll(async () => {
    await prisma.$connect();
    const repository = new PrismaEventRepository(prisma);
    service = new EventService(repository);
  });

  afterAll(async () => {
    await prisma.event.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.event.deleteMany({});
  });

  it("returns only published events for the public event listing", async () => {
    const now = new Date().toISOString();

    await prisma.event.createMany({
      data: [
        {
          id: "visible-published-event",
          title: "Published Event",
          description: "Visible publicly",
          location: "Main Hall",
          category: "Social",
          status: "published",
          capacity: 10,
          startDatetime: now,
          endDatetime: now,
          organizerId: "user-staff",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "hidden-draft-event",
          title: "Draft Event",
          description: "Not visible yet",
          location: "Back Room",
          category: "Social",
          status: "draft",
          capacity: 15,
          startDatetime: now,
          endDatetime: now,
          organizerId: "user-staff",
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    const result = await service.getFilteredPublishedEvents({});

    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(result.value[0].id).toBe("visible-published-event");
  });
});
