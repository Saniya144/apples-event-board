import { CreateInMemoryEventRepository } from "../../src/events/InMemoryEventRepository";
import type { IEvent } from "../../src/events/Event";

function makeEvent(overrides: Partial<IEvent> = {}): IEvent {
  return {
    id: "event-1",
    title: "Board Game Night",
    description: "Play games",
    location: "Campus Center",
    category: "Social",
    status: "draft",
    capacity: 20,
    startDatetime: "2026-04-16T18:00:00.000Z",
    endDatetime: "2026-04-16T20:00:00.000Z",
    organizerId: "user-1",
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
    ...overrides,
  };
}

describe("InMemoryEventRepository", () => {
  it("creates and finds an event by id", async () => {
    const repo = CreateInMemoryEventRepository();
    const event = makeEvent();

    const createResult = await repo.create(event);
    expect(createResult.ok).toBe(true);

    const findResult = await repo.findById("event-1");
    expect(findResult.ok).toBe(true);

    if (findResult.ok) {
      expect(findResult.value).toEqual(event);
    }
  });

  it("returns null when event does not exist", async () => {
    const repo = CreateInMemoryEventRepository();

    const result = await repo.findById("missing-id");
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });

  it("updates an existing event", async () => {
    const repo = CreateInMemoryEventRepository();
    const event = makeEvent();

    await repo.create(event);

    const updatedEvent = {
      ...event,
      title: "Updated Title",
      status: "published" as const,
    };

    const updateResult = await repo.update(updatedEvent);
    expect(updateResult.ok).toBe(true);

    const findResult = await repo.findById("event-1");
    expect(findResult.ok).toBe(true);

    if (findResult.ok) {
      expect(findResult.value?.title).toBe("Updated Title");
      expect(findResult.value?.status).toBe("published");
    }
  });

  it("lists all events", async () => {
    const repo = CreateInMemoryEventRepository();

    await repo.create(makeEvent({ id: "event-1", title: "First Event" }));
    await repo.create(makeEvent({ id: "event-2", title: "Second Event" }));

    const result = await repo.list();
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value.map((event) => event.id)).toEqual(
        expect.arrayContaining(["event-1", "event-2"]),
      );
    }
  });
});