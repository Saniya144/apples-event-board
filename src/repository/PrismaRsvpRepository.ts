import { PrismaClient } from "@prisma/client";
import type { IRsvpRepository, RsvpWithEvent } from "./RsvpRepository";
import type { Rsvp, RsvpStatus } from "../model/Rsvp";

export class PrismaRsvpRepository implements IRsvpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEventAndUser(
    eventId: string,
    userId: string
  ): Promise<Rsvp | null> {
    const rsvp = await this.prisma.rsvp.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    return rsvp as unknown as Rsvp | null;
  }

  async create(input: Omit<Rsvp, "id" | "createdAt">): Promise<Rsvp> {
    const rsvp = await this.prisma.rsvp.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        status: input.status,
        createdAt: new Date().toISOString(),
      },
    });

    return rsvp as unknown as Rsvp;
  }

  async updateStatus(id: string, status: RsvpStatus): Promise<Rsvp | null> {
    try {
      const updated = await this.prisma.rsvp.update({
        where: { id },
        data: { status },
      });

      return updated as unknown as Rsvp;
    } catch {
      return null;
    }
  }

  async listByEvent(eventId: string): Promise<Rsvp[]> {
    const rsvps = await this.prisma.rsvp.findMany({
      where: { eventId },
    });

    return rsvps as unknown as Rsvp[];
  }

  async countGoingByEvent(eventId: string): Promise<number> {
    return this.prisma.rsvp.count({
      where: { eventId, status: "going" },
    });
  }

  async findEarliestWaitlisted(eventId: string): Promise<Rsvp | null> {
    const rsvp = await this.prisma.rsvp.findFirst({
      where: { eventId, status: "waitlisted" },
      orderBy: { createdAt: "asc" },
    });

    return rsvp as unknown as Rsvp | null;
  }

  async findByUserId(userId: string): Promise<RsvpWithEvent[]> {
    const rsvps = await this.prisma.rsvp.findMany({
      where: { userId },
      include: {
        event: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return rsvps as unknown as RsvpWithEvent[];
  }

  async save(rsvp: Rsvp): Promise<Rsvp> {
    const saved = await this.prisma.rsvp.upsert({
      where: {
        eventId_userId: {
          eventId: rsvp.eventId,
          userId: rsvp.userId,
        },
      },
      update: {
        status: rsvp.status,
        createdAt: rsvp.createdAt,
      },
      create: {
        id: rsvp.id,
        eventId: rsvp.eventId,
        userId: rsvp.userId,
        status: rsvp.status,
        createdAt: rsvp.createdAt,
      },
    });

    return saved as unknown as Rsvp;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.rsvp.delete({
      where: { id },
    });
  }
}

export function CreatePrismaRsvpRepository(
  prisma: PrismaClient
): IRsvpRepository {
  return new PrismaRsvpRepository(prisma);
}