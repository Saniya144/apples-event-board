import { EOF } from "node:dns";
import { Result, Ok, Err } from "../lib/result";
import { RSVP, RSVPRepository, RSVPWithEvent } from "./RSVPRepository";
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


  async toggleRSVP(
    eventId: string,
    userId: string
  ): Promise<Result<RSVP, RSVPError>> {
    if (!userId) {
      return Err({ type: "USER_NOT_FOUND" });
    }

    try {
      // Check if RSVP exists
      const existing = await this.rsvpRepository.findByEventAndUser(eventId, userId);
      
      if (existing) {
        // Cancel existing RSVP
        await this.rsvpRepository.delete(existing.id);
        return Ok(existing);
      } else {
        // Create new RSVP with 'going' status
        const newRSVP = await this.rsvpRepository.save({
          id: crypto.randomUUID(),
          eventId,
          userId,
          status: "going",
          createdAt: new Date(),
        });
        return Ok(newRSVP);
      }
    } catch (e) {
      return Err({
        type: "UNEXPECTED_ERROR",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }


}
