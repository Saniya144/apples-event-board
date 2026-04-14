export type EventError= |{type:"EventNotFound";message:string}|{type: "UnexpectedDependencyError";message: string}


export const EventNotFound = (message: string): EventError => ({
  type: "EventNotFound",
  message,
});

export const UnexpectedDependencyError = (message: string): EventError => ({
    type: "UnexpectedDependencyError",
    message,
  });