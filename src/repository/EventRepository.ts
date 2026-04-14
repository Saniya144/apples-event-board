import { Result } from "../lib/result";
import { IEvent } from "../model/Event";
import { EventError } from "../event/errors";

export interface IEventRepository{
    create(event: IEvent): Promise<Result<IEvent,EventError>>
    findById(id: string): Promise<Result<IEvent | null, EventError>> ;
    update(event: IEvent): Promise<Result<IEvent,EventError>>
    getAll(): Promise<IEvent[]>;
}