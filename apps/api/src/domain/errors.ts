/** Base class for errors that express a broken business rule. */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_FAILED";
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
}
