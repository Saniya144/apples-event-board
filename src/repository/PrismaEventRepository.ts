import { PrismaClient } from "@prisma/client";
import type { IEventRepository } from "./EventRepository";
import type { IEvent } from "../model/Event";
import { Ok, Err, type Result } from "../lib/result";
import {
  EventDependencyError,
  EventNotFoundError,
  type EventError,
} from "../events/errors";

export class PrismaEventRepository implements IEventRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(event: IEvent): Promise<Result<IEvent, EventError>> {
    try {
      const created = await this.prisma.event.create({
        data: {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          category: event.category,
          status: event.status,
          capacity: event.capacity,
          startDatetime: event.startDatetime,
          endDatetime: event.endDatetime,
          organizerId: event.organizerId,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        },
      });
      return Ok(created as IEvent);
    } catch (error) {
      return Err(EventDependencyError("Unable to create event."));
    }
  }

  async findById(id: string): Promise<Result<IEvent | null, EventError>> {
    try {
      const match = await this.prisma.event.findUnique({
        where: { id },
      });
      return Ok(match as IEvent | null);
    } catch (error) {
      return Err(EventDependencyError("Unable to find event."));
    }
  }

  async update(event: IEvent): Promise<Result<IEvent, EventError>> {
    try {
      const existing = await this.prisma.event.findUnique({
        where: { id: event.id },
      });

      if (!existing) {
        return Err(EventNotFoundError("Event not found."));
      }

      const updated = await this.prisma.event.update({
        where: { id: event.id },
        data: {
          title: event.title,
          description: event.description,
          location: event.location,
          category: event.category,
          status: event.status,
          capacity: event.capacity,
          startDatetime: event.startDatetime,
          endDatetime: event.endDatetime,
          organizerId: event.organizerId,
          updatedAt: event.updatedAt,
        },
      });
      return Ok(updated as IEvent);
    } catch (error) {
      return Err(EventDependencyError("Unable to update event."));
    }
  }

  async findFilteredPublishedUpcoming(filters: {
    category?: string;
    date?: "all" | "week" | "weekend";
  }): Promise<IEvent[]> {
    const now = new Date();

    const where: any = {
      status: "published",
    };

    if (filters.category?.trim()) {
      where.category = filters.category.trim();
    }

    if (filters.date === "week") {
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      where.startDatetime = {
        gte: now.toISOString(),
        lte: endOfWeek.toISOString(),
      };
    }

    if (filters.date === "weekend") {
      const saturday = new Date(now);
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
      saturday.setDate(now.getDate() + daysUntilSaturday);
      saturday.setHours(0, 0, 0, 0);

      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      sunday.setHours(23, 59, 59, 999);

      where.startDatetime = {
        gte: saturday.toISOString(),
        lte: sunday.toISOString(),
      };
    }

    return this.prisma.event.findMany({
      where,
      orderBy: {
        startDatetime: "asc",
      },
    }) as Promise<IEvent[]>;
  }

  async getAll(): Promise<IEvent[]> {
    const events = await this.prisma.event.findMany();
    return events as IEvent[];
  }
}

export function CreatePrismaEventRepository(prisma: PrismaClient): IEventRepository {
  return new PrismaEventRepository(prisma);
}