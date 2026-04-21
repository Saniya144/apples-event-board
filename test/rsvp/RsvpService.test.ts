import { CreateRsvpService } from "../../src/service/RsvpService";
import { CreateInMemoryRsvpRepository } from "../../src/repository/InMemoryRsvpRepository";
import type { IEvent } from "../../src/model/Event";
import { Ok } from "../../src/lib/result";

//Helpers 

function makeEvent(overrides: Partial<IEvent> = {}): IEvent {
  return {
    id: "event-1",
    title: "Test Event",
    description: "A test event",
    location: "Room 101",
    category: "Social",
    status: "published",
    capacity: 10,
    organizerId: "organizer-1",
    startDatetime: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    endDatetime: new Date(Date.now() + 90000000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Fake event repo with only findById for RsvpService
function makeFakeEventRepo(event: IEvent | null) {
  return {
    findById: async () => Ok(event),
  };
}

// Each test calls this to get a fresh service + fresh repo
function makeService(event: IEvent | null = makeEvent()) {
  const rsvpRepo = CreateInMemoryRsvpRepository();
  const eventRepo = makeFakeEventRepo(event);
  const service = CreateRsvpService(rsvpRepo, eventRepo as any);
  return { service, rsvpRepo };
}

// Happy path 

describe("RsvpService.toggleRSVP — happy path", () => {
  it("creates a new going RSVP when the event has capacity", async () => {
    const { service } = makeService(makeEvent({ capacity: 10 }));

    const result = await service.toggleRSVP("event-1", "user-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("going");
    }
  });

  it("places user on waitlist when event is at capacity", async () => {
    const { service, rsvpRepo } = makeService(makeEvent({ capacity: 1 }));

    // Fill the one spot
    await service.toggleRSVP("event-1", "user-1");

    // Second user should be waitlisted
    const result = await service.toggleRSVP("event-1", "user-2");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("waitlisted");
    }
  });

  it("cancels an existing going RSVP on second toggle", async () => {
    const { service } = makeService();

    await service.toggleRSVP("event-1", "user-1");
    const result = await service.toggleRSVP("event-1", "user-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("cancelled");
    }
  });

  it("cancels a waitlisted RSVP on second toggle", async () => {
    const { service } = makeService(makeEvent({ capacity: 1 }));

    await service.toggleRSVP("event-1", "user-1"); // fills the spot
    await service.toggleRSVP("event-1", "user-2"); // user-2 gets waitlisted

    const result = await service.toggleRSVP("event-1", "user-2"); // cancel

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("cancelled");
    }
  });

  it("reactivates a cancelled RSVP as going when space is available", async () => {
    const { service } = makeService(makeEvent({ capacity: 10 }));

    await service.toggleRSVP("event-1", "user-1"); // going
    await service.toggleRSVP("event-1", "user-1"); // cancelled
    const result = await service.toggleRSVP("event-1", "user-1"); // reactivate

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("going");
    }
  });
});

// Error cases
describe("RsvpService.toggleRSVP — error cases", () => {
  it("returns EventNotFoundError when event does not exist", async () => {
    const { service } = makeService(null); // null = event not found

    const result = await service.toggleRSVP("event-1", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFoundError");
    }
  });

  it("returns RsvpNotAllowedError for a cancelled event", async () => {
    const { service } = makeService(makeEvent({ status: "cancelled" }));

    const result = await service.toggleRSVP("event-1", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpNotAllowedError");
    }
  });

  it("returns RsvpNotAllowedError for a draft event", async () => {
    const { service } = makeService(makeEvent({ status: "draft" }));

    const result = await service.toggleRSVP("event-1", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpNotAllowedError");
    }
  });

  it("returns RsvpNotAllowedError for a past event", async () => {
    const { service } = makeService(
      makeEvent({
        startDatetime: new Date(Date.now() - 90000000).toISOString(),
        endDatetime: new Date(Date.now() - 86400000).toISOString(), // yesterday
      })
    );

    const result = await service.toggleRSVP("event-1", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpNotAllowedError");
    }
  });
});

// Edge case

describe("RsvpService.toggleRSVP — edge cases", () => {
  it("treats null capacity as unlimited — never waitlists", async () => {
    const { service } = makeService(makeEvent({ capacity: null as any }));

    // Add many users, none should be waitlisted
    for (let i = 1; i <= 5; i++) {
      const result = await service.toggleRSVP("event-1", `user-${i}`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("going");
      }
    }
  });
});