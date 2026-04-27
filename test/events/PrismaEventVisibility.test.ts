import { createPrismaEventRepository, connectPrisma, disconnectPrisma, clearEvents, prisma } from "../prismaRouteTestHelper";
import { EventService } from "../../src/service/EventService";

describe("PrismaEventRepository visibility", () => {
  let service: EventService;

  beforeAll(async () => {
    await connectPrisma();
    const repository = createPrismaEventRepository();
    service = new EventService(repository);
  });

  afterAll(async () => {
    await clearEvents();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    await clearEvents();
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
