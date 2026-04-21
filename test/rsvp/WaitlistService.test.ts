import { CreateRsvpService } from "../../src/service/RsvpService";
import { CreateInMemoryRsvpRepository } from "../../src/repository/InMemoryRsvpRepository";
import type { IEvent } from "../../src/model/Event";
import { Ok } from "../../src/lib/result";

function makeEvent(overrides: Partial<IEvent> = {}): IEvent {
  return {
    id: "event-1",
    title: "Test Event",
    description: "desc",
    location: "Room 101",
    category: "Social",
    status: "published",
    capacity: 2,             // small capacity to trigger waitlist easily
    organizerId: "organizer-1",
    startDatetime: new Date(Date.now() + 86400000).toISOString(),
    endDatetime: new Date(Date.now() + 90000000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeService(event: IEvent | null = makeEvent()) {
  const rsvpRepo = CreateInMemoryRsvpRepository();
  const eventRepo = { findById: async () => Ok(event) };
  const service = CreateRsvpService(rsvpRepo, eventRepo as any);
  return { service, rsvpRepo };
}

// Promotion

describe("Feature 9 — waitlist promotion", () => {
  it("promotes the earliest waitlisted user when a going RSVP is cancelled", async () => {
    const { service } = makeService(makeEvent({ capacity: 1 }));

    await service.toggleRSVP("event-1", "user-1"); // going (fills spot)
    await service.toggleRSVP("event-1", "user-2"); // waitlisted

    // user-1 cancels — user-2 should be promoted
    await service.toggleRSVP("event-1", "user-1");

    const statusResult = await service.getRsvpStatus("event-1", "user-2");
    expect(statusResult).toBe("going");
  });

  it("does not promote anyone when the waitlist is empty", async () => {
    const { service } = makeService(makeEvent({ capacity: 2 }));

    await service.toggleRSVP("event-1", "user-1"); // going
    await service.toggleRSVP("event-1", "user-2"); // going

    // user-1 cancels — no one on waitlist, nothing should break
    const result = await service.toggleRSVP("event-1", "user-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("cancelled");
    }
  });

  it("promotes users in FIFO order (earliest waitlisted first)", async () => {
    const { service } = makeService(makeEvent({ capacity: 1 }));

    await service.toggleRSVP("event-1", "user-1"); // going (fills spot)
    await service.toggleRSVP("event-1", "user-2"); // waitlisted first
    await service.toggleRSVP("event-1", "user-3"); // waitlisted second

    // Cancel user-1 — user-2 should be promoted, not user-3
    await service.toggleRSVP("event-1", "user-1");

    const user2Status = await service.getRsvpStatus("event-1", "user-2");
    const user3Status = await service.getRsvpStatus("event-1", "user-3");

    expect(user2Status).toBe("going");
    expect(user3Status).toBe("waitlisted");
  });
});

// Queue position 

describe("Feature 9 — waitlist position", () => {
  it("returns null for a user who is going (not on waitlist)", async () => {
    const { service } = makeService(makeEvent({ capacity: 10 }));

    await service.toggleRSVP("event-1", "user-1");

    const position = await service.getWaitlistPosition("event-1", "user-1");
    expect(position).toBeNull();
  });

  it("returns null for a user with no RSVP", async () => {
    const { service } = makeService();

    const position = await service.getWaitlistPosition("event-1", "user-99");
    expect(position).toBeNull();
  });

  it("returns position 1 for the first person on the waitlist", async () => {
    const { service } = makeService(makeEvent({ capacity: 1 }));

    await service.toggleRSVP("event-1", "user-1"); // fills spot
    await service.toggleRSVP("event-1", "user-2"); // position 1

    const position = await service.getWaitlistPosition("event-1", "user-2");
    expect(position).toBe(1);
  });

  it("returns correct positions for multiple waitlisted users", async () => {
    const { service } = makeService(makeEvent({ capacity: 1 }));

    await service.toggleRSVP("event-1", "user-1"); // fills spot
    await service.toggleRSVP("event-1", "user-2"); // position 1
    await service.toggleRSVP("event-1", "user-3"); // position 2
    await service.toggleRSVP("event-1", "user-4"); // position 3

    expect(await service.getWaitlistPosition("event-1", "user-2")).toBe(1);
    expect(await service.getWaitlistPosition("event-1", "user-3")).toBe(2);
    expect(await service.getWaitlistPosition("event-1", "user-4")).toBe(3);
  });
});