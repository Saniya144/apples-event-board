export type RSVPError =
  | { type: "USER_NOT_FOUND" }
  | { type: "EVENT_NOT_FOUND" }
  | { type: "UNEXPECTED_ERROR"; message: string }
  | { type: "RSVP_NOT_ALLOWED" }
  | { type: "UNAUTHORIZED" };

export class EventNotFoundError extends Error {
  constructor(message?: string) {
    super(message || "Event not found");
    this.name = "EventNotFoundError";
  }
}

export class RsvpNotAllowedError extends Error {
  constructor(message?: string) {
    super(message || "RSVP not allowed");
    this.name = "RsvpNotAllowedError";
  }
}
