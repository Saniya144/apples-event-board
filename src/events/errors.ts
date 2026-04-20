export interface EventError extends Error {
  name: string;
}

function makeEventError(name: string, message: string): EventError {
  const error = new Error(message) as EventError;
  error.name = name;
  return error;
}

function makeEvent(name: string, message: string): EventError {
  const error = new Error(message) as EventError;
  error.name = name;
  return error;
}

export function EventValidationError(message: string): EventError {
  return makeEventError("EventValidationError", message);
}

export function EventNotFoundError(message: string): EventError {
  return makeEventError("EventNotFoundError", message);
}

export function EventDependencyError(message: string): EventError {
  return makeEventError("EventDependencyError", message);
}

export function EventAuthorizationError(message: string): EventError {
  return makeEventError("EventAuthorizationError", message);
}

export function EventStateError(message: string): EventError {
  return makeEventError("EventStateError", message);
}

export function EventTitleRequiredError(): EventError {
  return makeEvent("EventTitleRequiredError", "Title is required.");
}

export function EventLocationRequiredError(): EventError {
  return makeEvent("EventLocationRequiredError", "Location is required.");
}

export function EventTimeRequiredError(): EventError {
  return makeEvent(
    "EventTimeRequiredError",
    "Valid start and end times are required."
  );
}

export function EventStartTimeInPastError(): EventError {
  return makeEvent(
    "EventStartTimeInPastError",
    "Start time cannot be in the past."
  );
}

export function EventEndBeforeStartError(): EventError {
  return makeEvent(
    "EventEndBeforeStartError",
    "End time must be after start time."
  );
}

export function EventCreateFailedError(): EventError {
  return makeEvent("EventCreateFailedError", "Failed to create event.");
}

