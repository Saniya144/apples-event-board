export interface EventError extends Error {
  name: string;
}

function makeEventError(name: string, message: string): EventError {
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