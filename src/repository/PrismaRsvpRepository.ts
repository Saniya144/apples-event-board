import { PrismaClient } from "@prisma/client";
import type {
  RSVPRepository,
  RSVP,
  RSVPStatus,
  RSVPWithEvent,
} from "../rsvp/RSVPRepository";

export class PrismaRsvpRepository implements RSVPRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEventAndUser(
    eventId: string,
    userId: string
  ): Promise<RSVP | null> {
    const rsvp = await this.prisma.rsvp.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    return rsvp as unknown as RSVP | null;
  }

  async create(input: Omit<RSVP, "id" | "createdAt">): Promise<RSVP> {
    const rsvp = await this.prisma.rsvp.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        status: input.status,
        createdAt: new Date().toISOString(),
      },
    });

    return rsvp as unknown as RSVP;
  }

  async updateStatus(id: string, status: RSVPStatus): Promise<RSVP | null> {
    try {
      const updated = await this.prisma.rsvp.update({
        where: { id },
        data: { status },
      });

      return updated as unknown as RSVP;
    } catch {
      return null;
    }
  }

  async listByEvent(eventId: string): Promise<RSVP[]> {
    const rsvps = await this.prisma.rsvp.findMany({
      where: { eventId },
    });

    return rsvps as unknown as RSVP[];
  }

  async countGoingByEvent(eventId: string): Promise<number> {
    return this.prisma.rsvp.count({
      where: { eventId, status: "going" },
    });
  }

  async findEarliestWaitlisted(eventId: string): Promise<RSVP | null> {
    const rsvp = await this.prisma.rsvp.findFirst({
      where: { eventId, status: "waitlisted" },
      orderBy: { createdAt: "asc" },
    });

    return rsvp as unknown as RSVP | null;
  }

  async findByUserId(userId: string): Promise<RSVPWithEvent[]> {
    const rsvps = await this.prisma.rsvp.findMany({
      where: { userId },
      include: {
        event: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return rsvps as unknown as RSVPWithEvent[];
  }

  async save(rsvp: RSVP): Promise<RSVP> {
    const saved = await this.prisma.rsvp.upsert({
      where: {
        eventId_userId: {
          eventId: rsvp.eventId,
          userId: rsvp.userId,
        },
      },
      update: {
        status: rsvp.status,
        createdAt: rsvp.createdAt.toISOString(),
      },
      create: {
        id: rsvp.id,
        eventId: rsvp.eventId,
        userId: rsvp.userId,
        status: rsvp.status,
        createdAt: rsvp.createdAt.toISOString(),
      },
    });

    return saved as unknown as RSVP;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.rsvp.delete({
      where: { id },
    });
  }
}

export function CreatePrismaRsvpRepository(
  prisma: PrismaClient
): RSVPRepository {
  return new PrismaRsvpRepository(prisma);
}