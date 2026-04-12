import { StringLiteral } from "typescript";

export type EventStatus = "draft" | "published" | "cancelled";

export interface IEvent{
    id: string;
    title: string;
    description: string;
    location: string;
    startTime: Date;
    endTime : Date;
    organzierID: string;
    status: EventStatus;
}