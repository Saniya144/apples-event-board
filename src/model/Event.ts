export type EventStatus = "draft" | "published" | "cancelled" | "past";

export interface IEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: EventStatus;
  capacity: number | null;
  startDatetime: string;
  endDatetime: string;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}
export interface IEventDetailView {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: EventStatus;
  capacity: number | null;
  startDatetime: string;
  endDatetime: string;
  organizerId: string;
  organizerName: string;
  attendeeCount: number;
  canEdit: boolean;
  canCancel: boolean;
  canPublish: boolean;
  canRsvp: boolean;
}