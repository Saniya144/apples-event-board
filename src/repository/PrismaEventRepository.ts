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

  async getAll(): Promise<IEvent[]> {
    const events = await this.prisma.event.findMany();
    return events as IEvent[];
  }
}