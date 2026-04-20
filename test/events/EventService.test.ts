// import { Ok, Err } from "../../src/lib/result";
// import { CreateEventService } from "../../src/events/EventService";
// import type { IEvent } from "../../src/events/Event";
// import type { IEventRepository } from "../../src/events/EventRepository";

// function makeEvent(overrides: Partial<IEvent> = {}): IEvent {
//   return {
//     id: "event-1",
//     title: "Board Game Night",
//     description: "Games and snacks",
//     location: "Campus Center",
//     category: "Social",
//     status: "published",
//     capacity: 20,
//     startDatetime: "2026-04-16T18:00:00.000Z",
//     endDatetime: "2026-04-16T20:00:00.000Z",
//     organizerId: "user-1",
//     createdAt: "2026-04-13T10:00:00.000Z",
//     updatedAt: "2026-04-13T10:00:00.000Z",
//     ...overrides,
//   };
// }

// class FakeEventRepository implements IEventRepository {
//   constructor(private readonly event: IEvent | null) {}

//   async findById() {
//     return Ok(this.event);
//   }

//   async create(event: IEvent) {
//     return Ok(event);
//   }

//   async update(event: IEvent) {
//     return Ok(event);
//   }

//   async list() {
//     return Ok(this.event ? [this.event] : []);
//   }
// }

// describe("EventService.getEventDetail", () => {
//   it("returns a published event for any authenticated user", async () => {
//     const repo = new FakeEventRepository(makeEvent());
//     const service = CreateEventService(
//       repo,
//       {
//         findDisplayNameByUserId: async () => Ok("Una User"),
//       },
//       {
//         countGoingByEventId: async () => Ok(5),
//       },
//     );

//     const result = await service.getEventDetail({
//       eventId: "event-1",
//       actingUserId: "user-2",
//       actingUserRole: "user",
//     });

//     expect(result.ok).toBe(true);
//     if (result.ok) {
//       expect(result.value.title).toBe("Board Game Night");
//       expect(result.value.organizerName).toBe("Una User");
//       expect(result.value.attendeeCount).toBe(5);
//       expect(result.value.canRsvp).toBe(true);
//     }
//   });

//   it("returns not found for unauthorized draft access", async () => {
//     const repo = new FakeEventRepository(makeEvent({ status: "draft" }));
//     const service = CreateEventService(
//       repo,
//       {
//         findDisplayNameByUserId: async () => Ok("Una User"),
//       },
//       {
//         countGoingByEventId: async () => Ok(0),
//       },
//     );

//     const result = await service.getEventDetail({
//       eventId: "event-1",
//       actingUserId: "user-2",
//       actingUserRole: "user",
//     });

//     expect(result.ok).toBe(false);
//     if (!result.ok) {
//       expect(result.value.name).toBe("EventNotFoundError");
//     }
//   });

//   it("allows organizer to view a draft", async () => {
//     const repo = new FakeEventRepository(makeEvent({ status: "draft" }));
//     const service = CreateEventService(
//       repo,
//       {
//         findDisplayNameByUserId: async () => Ok("Una User"),
//       },
//       {
//         countGoingByEventId: async () => Ok(0),
//       },
//     );

//     const result = await service.getEventDetail({
//       eventId: "event-1",
//       actingUserId: "user-1",
//       actingUserRole: "user",
//     });

//     expect(result.ok).toBe(true);
//   });

//   it("allows admin to view a draft", async () => {
//     const repo = new FakeEventRepository(makeEvent({ status: "draft" }));
//     const service = CreateEventService(
//       repo,
//       {
//         findDisplayNameByUserId: async () => Ok("Una User"),
//       },
//       {
//         countGoingByEventId: async () => Ok(0),
//       },
//     );

//     const result = await service.getEventDetail({
//       eventId: "event-1",
//       actingUserId: "admin-1",
//       actingUserRole: "admin",
//     });

//     expect(result.ok).toBe(true);
//   });
// });

import { Ok, Err } from "../../src/lib/result";
import { EventService } from "../../src/service/EventService";
import type { IEvent } from "../../src/model/Event";
import type { IEventRepository } from "../../src/repository/EventRepository";
import { EventDependencyError } from "../../src/events/errors";
import { InMemoryEventRepository } from "../../src/event/InMemoryEventRepository";

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
  constructor(private readonly event: IEvent | null) {}

  async findById(_id: string) {
    return Ok(this.event);
  }

  async create(event: IEvent) {
    return Ok(event);
  }

  async update(event: IEvent) {
    return Ok(event);
  }

  async getAll() {
    return this.event ? [this.event] : [];
  }
}

describe("EventService.getEventDetail", () => {
  it("returns a published event for any authenticated user", async () => {
    const repo = new FakeEventRepository(makeEvent());
    const service = new EventService(
      repo,
      {
        findDisplayNameByUserId: async () => Ok("Sam Staff"),
      },
      {
        countGoingByEventId: async () => Ok(5),
      }
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
    const service = new EventService(
      repo,
      {
        findDisplayNameByUserId: async () => Ok("Sam Staff"),
      },
      {
        countGoingByEventId: async () => Ok(0),
      }
    );

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
    const service = new EventService(
      repo,
      {
        findDisplayNameByUserId: async () => Ok("Sam Staff"),
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
      expect(result.value.name).toBe("EventNotFoundError");
      expect(result.value.message).toBe("Event not found.");
    }
  });

  it("allows the organizer to view a draft", async () => {
    const repo = new FakeEventRepository(
      makeEvent({ status: "draft", organizerId: "user-staff" })
    );
    const service = new EventService(
      repo,
      {
        findDisplayNameByUserId: async () => Ok("Sam Staff"),
      },
      {
        countGoingByEventId: async () => Ok(0),
      }
    );

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
    const service = new EventService(
      repo,
      {
        findDisplayNameByUserId: async () => Ok("Sam Staff"),
      },
      {
        countGoingByEventId: async () => Ok(0),
      }
    );

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
    const service = new EventService(
      repo,
      {
        findDisplayNameByUserId: async () => Ok("Sam Staff"),
      },
      {
        countGoingByEventId: async () => Ok(0),
      }
    );

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


describe("EventService.createEvent", () => {
  let repo: IEventRepository;
  let service: EventService;

  const user = {
    userId: "user-123",
    role: "member",
  };

  beforeEach(() => {
    repo = new InMemoryEventRepository();
    service = new EventService(repo);
  });

  it("returns title required error when title is empty", async () => {
    const result = await service.createEvent(
      {
        title: "",
        location: "Campus Center",
        startTime: "2099-04-25T10:00",
        endTime: "2099-04-25T11:00",
      },
      user
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventValidationError");
      expect(result.value.message).toBe("Title is required.");
    }
  });

  it("returns location required error when location is empty", async () => {
    const result = await service.createEvent(
      {
        title: "Study Night",
        location: "",
        startTime: "2099-04-25T10:00",
        endTime: "2099-04-25T11:00",
      },
      user
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventValidationError");
      expect(result.value.message).toBe("Location is required.");
    }
  });

  it("returns time required error when start and end times are invalid", async () => {
    const result = await service.createEvent(
      {
        title: "Study Night",
        location: "Campus Center",
        startTime: "bad-date",
        endTime: "bad-date",
      },
      user
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventValidationError");
      expect(result.value.message).toBe("Valid start and end times are required.");
    }
  });

  it("returns start time in past error when start time is before now", async () => {
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
      expect(result.value.name).toBe("EventValidationError");
      expect(result.value.message).toBe("Start time cannot be in the past.");
    }
  });

  it("returns end before start error when end time is before start time", async () => {
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
      expect(result.value.name).toBe("EventValidationError");
      expect(result.value.message).toBe("End time must be after start time.");
    }
  });


});