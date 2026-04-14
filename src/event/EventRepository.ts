export type EventStatus = "draft" | "published" | "cancelled" | "past";

export type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  capacity: number | null;
  status: EventStatus;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface EventRepository {
  findByOrganizerId(organizerId: string): Promise<Event[]>;
  findById(id: string): Promise<Event | null>;
  save(event: Event): Promise<Event>;
}
