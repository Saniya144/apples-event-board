import { StringLiteral } from "typescript";

export type EventStatus = "draft" | "published" | "cancelled";

export interface IEvent{
    id: string;
    title: string;
    description: string;
    location: string;
    category: string;
    startTime: Date;
    endTime : Date;
    organizerID: string;
    status: EventStatus;
    capacity?: number;
}