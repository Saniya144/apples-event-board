export type RsvpStatus = "going" | "waitlisted" | "cancelled";

export type Rsvp = {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
  createdAt: string;
};