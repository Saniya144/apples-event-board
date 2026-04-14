export type RSVPStatus = "going" | "waitlisted" | "cancelled";

export type RSVP = {
  id: string;
  eventId: string;
  userId: string;
  status: RSVPStatus;
  createdAt: Date;
};

export type EventSummary = {
  id: string;
  title: string;
  location: string;
  startDatetime: Date;
  endDatetime: Date;
  category: string;
  status: "draft" | "published" | "cancelled" | "past";
};

export type RSVPWithEvent = RSVP & { event: EventSummary };

export interface RSVPRepository {
  findByUserId(userId: string): Promise<RSVPWithEvent[]>;
  findByEventAndUser(eventId: string, userId: string): Promise<RSVP | null>;
  save(rsvp: RSVP): Promise<RSVP>;
}
