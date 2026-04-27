import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";
import type { IEvent } from "../../src/model/Event";

function makeEvent(overrides: Partial<IEvent> = {}): IEvent {
  return {
    id: "event-test",
    title: "Test Event",
    description: "Testing repository behavior",
    location: "Test Hall",
    category: "Testing",
    status: "draft",
    capacity: 25,
    startDatetime: "2026-12-25T18:00:00.000Z",
    endDatetime: "2026-12-25T20:00:00.000Z",
    organizerId: "user-staff",
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-04-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("InMemoryEventRepository", () => {
  it("finds a seeded event by id", async () => {
    const repo = CreateInMemoryEventRepository();
    const result = await repo.findById("event-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toBeNull();
      expect(result.value?.id).toBe("event-1");
    }
  });

  it("returns null for a missing event id", async () => {
    const repo = CreateInMemoryEventRepository();
    const result = await repo.findById("missing-event");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });

  it("creates a new event", async () => {
    const repo = CreateInMemoryEventRepository();
    const event = makeEvent();

    const createResult = await repo.create(event);
    expect(createResult.ok).toBe(true);

    const findResult = await repo.findById("event-test");
    expect(findResult.ok).toBe(true);
    if (findResult.ok) {
      expect(findResult.value).not.toBeNull();
      expect(findResult.value?.title).toBe("Test Event");
    }
  });

  it("updates an existing event", async () => {
    const repo = CreateInMemoryEventRepository();

    const original = await repo.findById("event-1");
    expect(original.ok).toBe(true);
    if (!original.ok || !original.value) {
      throw new Error("Expected seeded event-1 to exist");
    }

    const updatedEvent: IEvent = {
      ...original.value,
      title: "Updated Board Game Night",
      updatedAt: "2026-04-21T12:00:00.000Z",
    };

    const updateResult = await repo.update(updatedEvent);
    expect(updateResult.ok).toBe(true);

    const findAgain = await repo.findById("event-1");
    expect(findAgain.ok).toBe(true);
    if (findAgain.ok) {
      expect(findAgain.value?.title).toBe("Updated Board Game Night");
    }
  });

  it("returns EventNotFoundError when updating a missing event", async () => {
    const repo = CreateInMemoryEventRepository();

    const missingEvent = makeEvent({ id: "does-not-exist" });
    const result = await repo.update(missingEvent);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFoundError");
      expect(result.value.message).toBe("Event not found.");
    }
  });

  it("returns all events", async () => {
    const repo = CreateInMemoryEventRepository();
    const events = await repo.getAll();

    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });
});