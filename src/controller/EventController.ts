import { UnexpectedDependencyError } from "../event/errors";
import { EventError } from "../event/errors";
import { Err, Result,Ok } from "../lib/result";
import { IEvent } from "../model/Event";
import { IEventRepository } from "../repository/EventRepository";
import { EventService } from "../service/EventService";
import { IAppBrowserSession } from "../session/AppSession";
import type { Response } from "express";

export interface IEventController{
    createEventFromForm(
        res: Response,
        input: any,
        session: IAppBrowserSession,
      ): Promise<void>;
}

class EventController implements IEventController{
    constructor(private readonly service: EventService){}
    private mapErrorStatus(error: EventError):number{
        if (error.type==="EventNotFound") return 404;
        if (error.type==="UnexpectedDependencyError") return 400;
        return 500;
        
    }
        async createEventFromForm(res: Response,input:any, session: IAppBrowserSession): Promise<void>{
            const user=  session.authenticatedUser;
            const result = await this.service.createEvent(input,user);
            if(result.ok===false){
                const error= result.value;
                const status =  this.mapErrorStatus(error);
                res.status(status).render("partials/error",{
                    message: error.message
                });
                return
            }
            res.redirect("/home");
       }
        

}
    
export function CreateEventController(service: EventService): IEventController{
    return new EventController(service);
}