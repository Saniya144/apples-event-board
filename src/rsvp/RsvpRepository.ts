import type { Rsvp, RsvpStatus } from "./Rsvp";

export interface IRsvpRepository {
  findByEventAndUser(eventId: string, userId: string): Promise<Rsvp | null>;
  create(input: Omit<Rsvp, "id" | "createdAt">): Promise<Rsvp>;
  updateStatus(id: string, status: RsvpStatus): Promise<Rsvp | null>;
  listByEvent(eventId: string): Promise<Rsvp[]>;
  countGoingByEvent(eventId: string): Promise<number>;
}