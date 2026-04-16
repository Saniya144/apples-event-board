import { Ok, Err } from "../../src/lib/result";
import { CreateEventService } from "../../src/events/EventService";
import type { IEvent } from "../../src/events/Event";
import type { IEventRepository } from "../../src/events/EventRepository";

function makeEvent(overrides: Partial<IEvent> = {}): IEvent {
  return {
    id: "event-1",
    title: "Board Game Night",
    description: "Games and snacks",
    location: "Campus Center",
    category: "Social",
    status: "published",
    capacity: 20,
    startDatetime: "2026-04-16T18:00:00.000Z",
    endDatetime: "2026-04-16T20:00:00.000Z",
    organizerId: "user-1",
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
    ...overrides,
  };
}

class FakeEventRepository implements IEventRepository {
  constructor(private readonly event: IEvent | null) {}

  async findById() {
    return Ok(this.event);
  }

  async create(event: IEvent) {
    return Ok(event);
  }

  async update(event: IEvent) {
    return Ok(event);
  }

  async list() {
    return Ok(this.event ? [this.event] : []);
  }
}

describe("EventService.getEventDetail", () => {
  it("returns a published event for any authenticated user", async () => {
    const repo = new FakeEventRepository(makeEvent());
    const service = CreateEventService(
      repo,
      {
        findDisplayNameByUserId: async () => Ok("Una User"),
      },
      {
        countGoingByEventId: async () => Ok(5),
      },
    );

    const result = await service.getEventDetail({
      eventId: "event-1",
      actingUserId: "user-2",
      actingUserRole: "user",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Board Game Night");
      expect(result.value.organizerName).toBe("Una User");
      expect(result.value.attendeeCount).toBe(5);
      expect(result.value.canRsvp).toBe(true);
    }
  });

  it("returns not found for unauthorized draft access", async () => {
    const repo = new FakeEventRepository(makeEvent({ status: "draft" }));
    const service = CreateEventService(
      repo,
      {
        findDisplayNameByUserId: async () => Ok("Una User"),
      },
      {
        countGoingByEventId: async () => Ok(0),
      },
    );

    const result = await service.getEventDetail({
      eventId: "event-1",
      actingUserId: "user-2",
      actingUserRole: "user",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFoundError");
    }
  });

  it("allows organizer to view a draft", async () => {
    const repo = new FakeEventRepository(makeEvent({ status: "draft" }));
    const service = CreateEventService(
      repo,
      {
        findDisplayNameByUserId: async () => Ok("Una User"),
      },
      {
        countGoingByEventId: async () => Ok(0),
      },
    );

    const result = await service.getEventDetail({
      eventId: "event-1",
      actingUserId: "user-1",
      actingUserRole: "user",
    });

    expect(result.ok).toBe(true);
  });

  it("allows admin to view a draft", async () => {
    const repo = new FakeEventRepository(makeEvent({ status: "draft" }));
    const service = CreateEventService(
      repo,
      {
        findDisplayNameByUserId: async () => Ok("Una User"),
      },
      {
        countGoingByEventId: async () => Ok(0),
      },
    );

    const result = await service.getEventDetail({
      eventId: "event-1",
      actingUserId: "admin-1",
      actingUserRole: "admin",
    });

    expect(result.ok).toBe(true);
  });
});