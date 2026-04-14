// =========================
// SERVICE CONTRACTS
// =========================

// All service methods return Result<T, E>
// - Ok(value) on success
// - Err(error) on failure


// =========================
// EVENT SERVICE
// =========================

// Creates a new event owned by the given user
createEvent(input: CreateEventInput, userId: string): Promise<Result<Event, EventError>>

// Retrieves a single event by ID with visibility rules applied
getEventById(id: string, userId: string): Promise<Result<Event, EventError>>

// Edits an existing event if the user has permission
editEvent(id: string, input: UpdateEventInput, userId: string): Promise<Result<Event, EventError>>


// =========================
// RSVP SERVICE
// =========================

// Toggles a user's RSVP for an event.
//
// Handles:
// - No existing RSVP → creates one (going or waitlisted)
// - Existing active RSVP → changes to cancelled
// - Existing cancelled RSVP → reactivates (going or waitlisted)
//
// Also enforces:
// - Event existence
// - Event state (not cancelled/past)
// - Capacity constraints
toggleRSVP(eventId: string, userId: string): Promise<Result<RsvpToggleResult, RsvpError>>

// Returns all RSVPs for a user (used for dashboards)
getRSVPsForUser(userId: string): Promise<Result<Rsvp[], RsvpError>>


// =========================
// TYPES
// =========================

type Event = {
  id: string
  title: string
  description: string
  location: string
  category: string
  status: 'draft' | 'published' | 'cancelled' | 'past'
  capacity?: number
  startDatetime: string
  endDatetime: string
  organizerId: string
}

type Rsvp = {
  id: string
  eventId: string
  userId: string
  status: 'going' | 'waitlisted' | 'cancelled'
  createdAt: string
}

type RsvpToggleResult = {
  eventId: string
  userId: string
  status: 'going' | 'waitlisted' | 'cancelled'
  attendeeCount: number
}


// =========================
// INPUT TYPES
// =========================

type CreateEventInput = {
  title: string
  description: string
  location: string
  category: string
  capacity?: number
  startDatetime: string
  endDatetime: string
}

type UpdateEventInput = Partial<CreateEventInput>


// =========================
// ERROR TYPES
// =========================

type EventError =
  | 'EVENT_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'INVALID_INPUT'
  | 'INVALID_EVENT_STATE'

type RsvpError =
  | 'EVENT_NOT_FOUND'
  | 'RSVP_NOT_ALLOWED'
  | 'UNAUTHORIZED'