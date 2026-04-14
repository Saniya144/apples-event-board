import { UnexpectedDependencyError } from "../event/errors";
import { EventError } from "../event/errors";
import { Result ,Ok,Err} from "../lib/result";
import { IEvent } from "../model/Event";
import { IEventRepository } from "../repository/EventRepository";


export class EventService{
    constructor(private readonly repo: IEventRepository){}
    async createEvent(input: any,user:any): Promise<Result<IEvent,EventError>>{
        if(!input.title|| input.title.trim()==="") return Err(UnexpectedDependencyError("title is required"))
        if(!input.location|| input.location.trim()==="") return Err(UnexpectedDependencyError("location is required"))
        const begin =  new Date(input.startTime);
        const end = new Date(input.endTime);
        if(end<begin) return Err(UnexpectedDependencyError("invalid end is before start"))
        const event: IEvent={
            id: Math.random().toString(),
            title: input.title,
            description: input.description||"",
            location: input.location,
            startTime: begin,
            endTime: end,
            organizerID: user.email,
            status: "draft",
        };
        return await this.repo.create(event);



    }
    async getAllEvents(): Promise<Result<IEvent[], EventError>>{
        try {
            const events = await this.repo.getAll();
            return Ok(events);
        } catch  {
            return Err(UnexpectedDependencyError("failed to fetch"))
        }
    }
}