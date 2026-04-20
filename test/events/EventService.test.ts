import { Ok, Err } from "../../src/lib/result";
import { EventService } from "../../src/service/EventService";
import type { IEvent } from "../../src/model/Event";
import type { IEventRepository } from "../../src/repository/EventRepository";
import { EventDependencyError } from "../../src/events/errors";
import { InMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";

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
      expect(result.value.message).toBe(
        "Only the organizer can publish this event."
      );
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
      expect(result.value.message).toBe(
        "Only published events can be cancelled."
      );
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
  describe("EventSerivce createEvent", () => {
    let repo: IEventRepository;
    let service: EventService;

    const user = {
      userID: "user3",
      role: "member",
    };
    beforeEach(() => {
      repo = new InMemoryEventRepository();
      service = new EventService(repo);
    });
    it("returns title required when no title ", async () => {
      const result = await service.createEvent(
        {
          title: "",
          location: "Worcester DC",
          startTime: "2099-04-24T11:00",
          endTime: "2099-04-25T11:00",
        },
        user
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventTitleRequiredError");
        expect(result.value.message).toBe("Title is required.");
      }
    });

    it("returns location required when no location ", async () => {
      const result = await service.createEvent(
        {
          title: "",
          location: "hey",
          startTime: "2099-04-24T11:00",
          endTime: "2099-04-25T11:00",
        },
        user
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventTitleRequiredError");
      }
    });

    it("returns location required when no location ", async () => {
      const result = await service.createEvent(
        {
          title: "sports watch patry",
          location: "",
          startTime: "2099-04-24T11:00",
          endTime: "2099-04-25T11:00",
        },
        user
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventLocationRequiredError");
      }
    });

  

    it("returns EventStartTimeInPastError when start time is in the past", async () => {
      const result = await service.createEvent(
        {
          title: "Study Night",
          location: "Campus Center",
          startTime: "2020-01-01T10:00",
          endTime: "2099-04-25T11:00",
        },
        user
      );
  
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventStartTimeInPastError");
        expect(result.value.message).toBe("Start time cannot be in the past.");
      }
    });

    it("returns error when end time is before start time", async () => {
      const result = await service.createEvent(
        {
          title: "Study Night",
          location: "Campus Center",
          startTime: "2099-04-25T11:00",
          endTime: "2099-04-25T10:00",
        },
        user
      );
  
     
  
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventEndBeforeStartError");
        expect(result.value.message).toBe("End time must be after start time.");
      }
    });

    it("creates event successfully with valid input", async () => {
      const result = await service.createEvent(
        {
          title: "Study Night",
          location: "stu",
          category: "academic",
          startTime: "2026-04-25T10:00",
          endTime: "2026-04-25T11:00",
          description: "Finals study",
          capacity: 25,
        },
        user
      );
  
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe("Study Night");
        expect(result.value.location).toBe("stu");
        expect(result.value.category).toBe("academic");
        expect(result.value.description).toBe("Finals study");
        expect(result.value.capacity).toBe(25);
      }
    });


  
  });


  describe("EventSerivce update event", () => {
    let repo: IEventRepository;
    let service: EventService;

    const owner = {
      userId: "user1",
      role: "organizer",
    };

    const user = {
      userID: "user",
      role: "organizerID",
    };
    beforeEach(() => {
      repo = new InMemoryEventRepository();
      service = new EventService(repo);
    });
    it("returns title required when no title ", async () => {
      const result = await service.updateEvent(
        "missing-id",
        {
          title: "new ",
          location: "Worcester DC",
          startTime: "2099-04-24T11:00",
          endTime: "2099-04-25T11:00",
        },
        user
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventEditNotFoundError");
        expect(result.value.message).toBe("Event not found.");
      }
    });

    it("returns EventEditNotFoundError when event does not exist", async () => {
      const result = await service.updateEvent(
        "missing-id",
        {
          title: "Updated Event",
          location: "New Hall",
          startTime: "2099-04-26T10:00",
          endTime: "2099-04-26T11:00",
        },
        owner
      );
  
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventEditNotFoundError");
        expect(result.value.message).toBe("Event not found.");
      }
    });
  
    it("returns EventEditUnauthorizedError when non-owner tries to edit", async () => {
      const created = await service.createEvent(
        {
          title: "Original Event",
          location: "Campus Center",
          startTime: "2099-04-25T10:00",
          endTime: "2099-04-25T11:00",
        },
        owner
      );
  
      expect(created.ok).toBe(true);
      if (!created.ok) return;
  
      const result = await service.updateEvent(
        created.value.id,
        {
          title: "Updated Event",
          location: "New Hall",
          startTime: "2099-04-26T10:00",
          endTime: "2099-04-26T11:00",
        },
        user
      );
  
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventEditUnauthorizedError");
        expect(result.value.message).toBe("Not authorized to edit this event.");
      }
    });
  
    it("returns EventEditTitleRequiredError when updated title is empty", async () => {
      const created = await service.createEvent(
        {
          title: "Original Event",
          location: "Campus Center",
          startTime: "2026-04-25T10:00",
          endTime: "2026-04-25T11:00",
        },
        owner
      );
  
      expect(created.ok).toBe(true);
      if (!created.ok) return;
  
      const result = await service.updateEvent(
        created.value.id,
        {
          title: "",
          location: "New ",
          startTime: "2026-04-26T10:00",
          endTime: "2026-04-26T11:00",
        },
        owner
      );
  
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventEditTitleRequiredError");
       
      }
    });
  
    it("returns EventEditLocationRequiredError when updated location is empty", async () => {
      const created = await service.createEvent(
        {
          title: "Original Event",
          location: "Campus Center",
          startTime: "2026-04-25T10:00",
          endTime: "2026-04-25T11:00",
        },
        owner
      );
  
      expect(created.ok).toBe(true);
      if (!created.ok) return;
  
      const result = await service.updateEvent(
        created.value.id,
        {
          title: "Updated Event",
          location: "",
          startTime: "2026-04-26T10:00",
          endTime: "2026-04-26T11:00",
        },
        owner
      );
  
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventEditLocationRequiredError");
       
      }
    });
  
    it("returns EventEditTimeRequiredError when updated dates are invalid", async () => {
      const created = await service.createEvent(
        {
          title: "Original Event",
          location: "Campus Center",
          startTime: "2099-04-25T10:00",
          endTime: "2099-04-25T11:00",
        },
        owner
      );
  
      expect(created.ok).toBe(true);
      if (!created.ok) return;
  
      const result = await service.updateEvent(
        created.value.id,
        {
          title: "Updated Event",
          location: "New Hall",
          startTime: "bad-date",
          endTime: "bad-date",
        },
        owner
      );
  
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventEditTimeRequiredError");
        
      }
    });
  
    it("returns EventEditStartTimeInPastError when updated start time is in the past", async () => {
      const created = await service.createEvent(
        {
          title: "Original Event",
          location: "Campus Center",
          startTime: "2026-04-25T10:00",
          endTime: "2026-04-25T11:00",
        },
        owner
      );
  
      expect(created.ok).toBe(true);
      if (!created.ok) return;
  
      const result = await service.updateEvent(
        created.value.id,
        {
          title: "Updated Event",
          location: "New Hall",
          startTime: "2020-01-01T10:00",
          endTime: "2099-04-26T11:00",
        },
        owner
      );
  
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventEditStartTimeInPastError");

      }
    });
  
    it("returns EventEditEndBeforeStartError when updated end time is before start time", async () => {
      const created = await service.createEvent(
        {
          title: "Original Event",
          location: "Campus Center",
          startTime: "2026-04-25T10:00",
          endTime: "2026-04-25T11:00",
        },
        owner
      );
  
      expect(created.ok).toBe(true);
      if (!created.ok) return;
  
      const result = await service.updateEvent(
        created.value.id,
        {
          title: "Updated Event",
          location: "New Hall",
          startTime: "2026-04-25T11:00",
          endTime: "2025-04-26T10:00",
        },
        owner
      );
  
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventEditEndBeforeStartError");
        expect(result.value.message).toBe("End time must be after start time.");
      }
    });
  
    it("updates event successfully when input is valid and user is authorized", async () => {
      const created = await service.createEvent(
        {
          title: "Original Event",
          location: "Campus Center",
          startTime: "2099-04-25T10:00",
          endTime: "2099-04-25T11:00",
          category: "academic",
          description: "Old desc",
        },
        owner
      );
  
      expect(created.ok).toBe(true);
      if (!created.ok) return;
  
      const result = await service.updateEvent(
        created.value.id,
        {
          title: "Updated Event",
          location: "New Hall",
          category: "social",
          description: "Updated desc",
          startTime: "2099-04-26T10:00",
          endTime: "2099-04-26T11:00",
        },
        owner
      );
  
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe("Updated Event");
        expect(result.value.location).toBe("New Hall");
        expect(result.value.category).toBe("social");
        expect(result.value.description).toBe("Updated desc");
      }
    });

  
  });
});
