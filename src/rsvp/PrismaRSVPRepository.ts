import { PrismaClient } from "@prisma/client";
import {
  RSVP,
  RSVPRepository,
  RSVPWithEvent,
  EventSummary,
} from "./RSVPRepository";

export class PrismaRSVPRepository implements RSVPRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<RSVPWithEvent[]> {
    const rsvps = await this.prisma.rsvp.findMany({
      where: { userId },
      include: { event: true },
      orderBy: { createdAt: "desc" },
    });

    return rsvps.map((rsvp) => ({
      id: rsvp.id,
      eventId: rsvp.eventId,
      userId: rsvp.userId,
      status: rsvp.status as "going" | "waitlisted" | "cancelled",
      createdAt: rsvp.createdAt,
      event: {
        id: rsvp.event.id,
        title: rsvp.event.title,
        location: rsvp.event.location,
        startDatetime: new Date(rsvp.event.startDatetime),
        endDatetime: new Date(rsvp.event.endDatetime),
        category: rsvp.event.category,
        status: rsvp.event.status as "draft" | "published" | "cancelled" | "past",
      },
    }));
  }

  async findByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<RSVP | null> {
    const rsvp = await this.prisma.rsvp.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!rsvp) return null;

    return {
      id: rsvp.id,
      eventId: rsvp.eventId,
      userId: rsvp.userId,
      status: rsvp.status as "going" | "waitlisted" | "cancelled",
      createdAt: rsvp.createdAt,
    };
  }

  async save(rsvp: RSVP): Promise<RSVP> {
    const createdAt =
      rsvp.createdAt instanceof Date ? rsvp.createdAt.toISOString() : rsvp.createdAt;

    const created = await this.prisma.rsvp.upsert({
      where: { id: rsvp.id },
      update: {
        status: rsvp.status,
      },
      create: {
        id: rsvp.id,
        eventId: rsvp.eventId,
        userId: rsvp.userId,
        status: rsvp.status,
        createdAt,
      },
    });

    return {
      id: created.id,
      eventId: created.eventId,
      userId: created.userId,
      status: created.status as "going" | "waitlisted" | "cancelled",
      createdAt: created.createdAt,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.rsvp.delete({
      where: { id },
    });
  }
}
