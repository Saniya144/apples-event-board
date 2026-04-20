import { Ok, Err } from "../../src/lib/result";
import { EventService } from "../../src/service/EventService";
import type { IEvent } from "../../src/model/Event";
import type { IEventRepository } from "../../src/repository/EventRepository";
import { EventDependencyError } from "../../src/events/errors";

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
    organizerId: "user-staff",
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
    ...overrides,
  };
}

class FakeEventRepository implements IEventRepository {
  public storedEvent: IEvent | null;

  constructor(event: IEvent | null) {
    this.storedEvent = event;
  }

  async findById(_id: string) {
    return Ok(this.storedEvent);
  }

  async create(event: IEvent) {
    this.storedEvent = event;
    return Ok(event);
  }

  async update(event: IEvent) {
    this.storedEvent = event;
    return Ok(event);
  }

  async getAll() {
    return this.storedEvent ? [this.storedEvent] : [];
  }
}

function makeService(repo: IEventRepository) {
  return new EventService(
    repo,
    {
      findDisplayNameByUserId: async () => Ok("Sam Staff"),
    },
    {
      countGoingByEventId: async () => Ok(0),
    }
  );
}

describe("EventService.getEventDetail", () => {
  it("returns a published event for any authenticated user", async () => {
    const repo = new FakeEventRepository(makeEvent());
    const service = new EventService(
      repo,
      { findDisplayNameByUserId: async () => Ok("Sam Staff") },
      { countGoingByEventId: async () => Ok(5) }
    );

    const result = await service.getEventDetail({
      eventId: "event-1",
      actingUserId: "user-reader",
      actingUserRole: "user",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Board Game Night");
      expect(result.value.organizerName).toBe("Sam Staff");
      expect(result.value.attendeeCount).toBe(5);
      expect(result.value.canRsvp).toBe(true);
      expect(result.value.canEdit).toBe(false);
      expect(result.value.canCancel).toBe(false);
    }
  });

  it("returns EventNotFoundError when the event does not exist", async () => {
    const repo = new FakeEventRepository(null);
    const service = makeService(repo);

    const result = await service.getEventDetail({
      eventId: "missing-event",
      actingUserId: "user-reader",
      actingUserRole: "user",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFoundError");
      expect(result.value.message).toBe("Event not found.");
    }
  });

  it("returns EventNotFoundError for unauthorized draft access", async () => {
    const repo = new FakeEventRepository(makeEvent({ status: "draft" }));
    const service = makeService(repo);

    const result = await service.getEventDetail({
      eventId: "event-1",
      actingUserId: "user-reader",
      actingUserRole: "user",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFoundError");
      expect(result.value.message).toBe("Event not found.");
    }
  });

  it("allows the organizer to view a draft", async () => {
    const repo = new FakeEventRepository(
      makeEvent({ status: "draft", organizerId: "user-staff" })
    );
    const service = makeService(repo);

    const result = await service.getEventDetail({
      eventId: "event-1",
      actingUserId: "user-staff",
      actingUserRole: "staff",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.canEdit).toBe(true);
      expect(result.value.canCancel).toBe(true);
      expect(result.value.canPublish).toBe(true);
      expect(result.value.canRsvp).toBe(false);
    }
  });

  it("allows an admin to view a draft", async () => {
    const repo = new FakeEventRepository(makeEvent({ status: "draft" }));
    const service = makeService(repo);

    const result = await service.getEventDetail({
      eventId: "event-1",
      actingUserId: "user-admin",
      actingUserRole: "admin",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.canEdit).toBe(true);
      expect(result.value.canCancel).toBe(true);
    }
  });

  it("returns EventValidationError when eventId is blank", async () => {
    const repo = new FakeEventRepository(makeEvent());
    const service = makeService(repo);

    const result = await service.getEventDetail({
      eventId: "   ",
      actingUserId: "user-reader",
      actingUserRole: "user",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventValidationError");
      expect(result.value.message).toBe("Event id is required.");
    }
  });

  it("returns EventDependencyError when organizer lookup fails", async () => {
    const repo = new FakeEventRepository(makeEvent());
    const service = new EventService(
      repo,
      {
        findDisplayNameByUserId: async () =>
          Err(EventDependencyError("Organizer lookup failed.")),
      },
      {
        countGoingByEventId: async () => Ok(0),
      }
    );

    const result = await service.getEventDetail({
      eventId: "event-1",
      actingUserId: "user-reader",
      actingUserRole: "user",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventDependencyError");
      expect(result.value.message).toBe("Organizer lookup failed.");
    }
  });
});

describe("EventService.publishEvent", () => {
  it("allows the organizer to publish a draft", async () => {
    const repo = new FakeEventRepository(
      makeEvent({ status: "draft", organizerId: "user-staff" })
    );
    const service = makeService(repo);

    const result = await service.publishEvent({
      eventId: "event-1",
      actingUserId: "user-staff",
      actingUserRole: "staff",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("published");
      expect(result.value.canPublish).toBe(false);
      expect(result.value.canRsvp).toBe(true);
    }
  });

  it("returns EventAuthorizationError when non-owner tries to publish", async () => {
    const repo = new FakeEventRepository(
      makeEvent({ status: "draft", organizerId: "user-staff" })
    );
    const service = makeService(repo);

    const result = await service.publishEvent({
      eventId: "event-1",
      actingUserId: "user-reader",
      actingUserRole: "user",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventAuthorizationError");
      expect(result.value.message).toBe("Only the organizer can publish this event.");
    }
  });

  it("returns EventStateError when trying to publish a published event", async () => {
    const repo = new FakeEventRepository(
      makeEvent({ status: "published", organizerId: "user-staff" })
    );
    const service = makeService(repo);

    const result = await service.publishEvent({
      eventId: "event-1",
      actingUserId: "user-staff",
      actingUserRole: "staff",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventStateError");
      expect(result.value.message).toBe("Only draft events can be published.");
    }
  });

  it("returns EventNotFoundError when publishing a missing event", async () => {
    const repo = new FakeEventRepository(null);
    const service = makeService(repo);

    const result = await service.publishEvent({
      eventId: "missing-event",
      actingUserId: "user-staff",
      actingUserRole: "staff",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFoundError");
    }
  });
});

describe("EventService.cancelEvent", () => {
  it("allows the organizer to cancel a published event", async () => {
    const repo = new FakeEventRepository(
      makeEvent({ status: "published", organizerId: "user-staff" })
    );
    const service = makeService(repo);

    const result = await service.cancelEvent({
      eventId: "event-1",
      actingUserId: "user-staff",
      actingUserRole: "staff",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("cancelled");
      expect(result.value.canRsvp).toBe(false);
    }
  });

  it("allows an admin to cancel any published event", async () => {
    const repo = new FakeEventRepository(
      makeEvent({ status: "published", organizerId: "user-staff" })
    );
    const service = makeService(repo);

    const result = await service.cancelEvent({
      eventId: "event-1",
      actingUserId: "user-admin",
      actingUserRole: "admin",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("cancelled");
    }
  });

  it("returns EventAuthorizationError when unauthorized user tries to cancel", async () => {
    const repo = new FakeEventRepository(
      makeEvent({ status: "published", organizerId: "user-staff" })
    );
    const service = makeService(repo);

    const result = await service.cancelEvent({
      eventId: "event-1",
      actingUserId: "user-reader",
      actingUserRole: "user",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventAuthorizationError");
      expect(result.value.message).toBe(
        "Only the organizer or an admin can cancel this event."
      );
    }
  });

  it("returns EventStateError when trying to cancel a draft", async () => {
    const repo = new FakeEventRepository(
      makeEvent({ status: "draft", organizerId: "user-staff" })
    );
    const service = makeService(repo);

    const result = await service.cancelEvent({
      eventId: "event-1",
      actingUserId: "user-staff",
      actingUserRole: "staff",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventStateError");
      expect(result.value.message).toBe("Only published events can be cancelled.");
    }
  });

  it("returns EventNotFoundError when cancelling a missing event", async () => {
    const repo = new FakeEventRepository(null);
    const service = makeService(repo);

    const result = await service.cancelEvent({
      eventId: "missing-event",
      actingUserId: "user-admin",
      actingUserRole: "admin",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFoundError");
    }
  });
});