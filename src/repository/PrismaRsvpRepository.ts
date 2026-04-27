import { PrismaClient } from "@prisma/client";
import type { IRsvpRepository } from "./RsvpRepository";
import type { Rsvp, RsvpStatus } from "../model/Rsvp";

export class PrismaRsvpRepository implements IRsvpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEventAndUser(eventId: string, userId: string): Promise<Rsvp | null> {
    const rsvp = await this.prisma.rsvp.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    return rsvp as Rsvp | null;
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
    return rsvp as Rsvp;
  }

  async updateStatus(id: string, status: RsvpStatus): Promise<Rsvp | null> {
    try {
      const updated = await this.prisma.rsvp.update({
        where: { id },
        data: { status },
      });
      return updated as Rsvp;
    } catch {
      return null;
    }
  }

  async listByEvent(eventId: string): Promise<Rsvp[]> {
    const rsvps = await this.prisma.rsvp.findMany({
      where: { eventId },
    });
    return rsvps as Rsvp[];
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
    return rsvp as Rsvp | null;
  }
}

export function CreatePrismaRsvpRepository(prisma: PrismaClient): IRsvpRepository {
  return new PrismaRsvpRepository(prisma);
}