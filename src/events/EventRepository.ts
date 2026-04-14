import type { Result } from "../lib/result";
import type { IEvent } from "./Event";

export interface IEventRepository {
  findById(eventId: string): Promise<Result<IEvent | null, Error>>;
  create(event: IEvent): Promise<Result<IEvent, Error>>;
  update(event: IEvent): Promise<Result<IEvent, Error>>;
  list(): Promise<Result<IEvent[], Error>>;
}