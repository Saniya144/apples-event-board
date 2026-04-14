export class EventNotFoundError extends Error {
  constructor(message = "Event not found.") {
    super(message);
    this.name = "EventNotFoundError";
  }
}

export class RsvpNotAllowedError extends Error {
  constructor(message = "RSVP is not allowed for this event.") {
    super(message);
    this.name = "RsvpNotAllowedError";
  }
}