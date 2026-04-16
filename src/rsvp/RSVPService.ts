import { Result, Ok, Err } from "../lib/result";
import { RSVPRepository, RSVPWithEvent } from "./RSVPRepository";
import { RSVPError } from "./errors";

export class RSVPService {
  constructor(private readonly rsvpRepository: RSVPRepository) {}

  async getRSVPsForUser(
    userId: string,
  ): Promise<Result<RSVPWithEvent[], RSVPError>> {
    if (!userId) {
      return Err({ type: "USER_NOT_FOUND" } as RSVPError);
    }

    try {
      const rsvps = await this.rsvpRepository.findByUserId(userId);
      return Ok(rsvps);
    } catch (e) {
      return Err({
        type: "UNEXPECTED_ERROR" as const,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }
}
