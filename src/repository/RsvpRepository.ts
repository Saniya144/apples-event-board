import type { Rsvp, RsvpStatus } from "../model/Rsvp";

export type RsvpWithEvent = Rsvp & {
  event: {
    id: string;
    title: string;
    location: string;
    startDatetime: string;
    endDatetime: string;
    category: string;
    status: string;
  };
};

export interface IRsvpRepository {
  findByEventAndUser(eventId: string, userId: string): Promise<Rsvp | null>;
  create(input: Omit<Rsvp, "id" | "createdAt">): Promise<Rsvp>;
  updateStatus(id: string, status: RsvpStatus): Promise<Rsvp | null>;
  listByEvent(eventId: string): Promise<Rsvp[]>;
  countGoingByEvent(eventId: string): Promise<number>;
  findEarliestWaitlisted(eventId: string): Promise<Rsvp | null>;
  findByUserId(userId: string): Promise<RsvpWithEvent[]>;
  save(rsvp: Rsvp): Promise<Rsvp>;
  delete(id: string): Promise<void>;
}