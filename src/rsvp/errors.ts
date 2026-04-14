export type RSVPError =
  | { type: "USER_NOT_FOUND" }
  | { type: "EVENT_NOT_FOUND" }
  | { type: "UNEXPECTED_ERROR"; message: string };
