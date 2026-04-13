import { IEventRepository } from "./EventRepository";
import { IEvent } from "../model/Event";
import { Result, Ok, Err } from "../lib/result";
import { EventError, EventNotFound, UnexpectedDependencyError } from "../event/errors";


export class InMemoryEventRepository implements IEventRepository{
    private events: IEvent[] = [];
    async create(event: IEvent): Promise<Result<IEvent,EventError>>{
        try{
            this.events.push(event);
            return Ok(event);
        }
        catch{
            return Err(UnexpectedDependencyError("Unable to create event"))
        } 
    }

    async findById(id: string): Promise<Result<IEvent | null, EventError>> {
        try {
            const match = this.events.find(e=> e.id === id)?? null;
            return Ok(match)
            
        } catch  {
            return Err(UnexpectedDependencyError("Unable to find event"))
        }
    }

    async update(event: IEvent): Promise<Result<IEvent,EventError>>{
        try {
            const index = this.events.findIndex(e => e.id === event.id);
            if(index===-1) return Err(EventNotFound("not found"));
            this.events[index] =event;
            return Ok(event);
        } catch (error) {
            return Err(UnexpectedDependencyError("Unable to update event"));
        }
    }
    async getAll(): Promise<IEvent[]> {
        return this.events;
    } 

}