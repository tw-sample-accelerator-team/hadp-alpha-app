import { DomainError, NotFoundError, ValidationError } from "../../../domain/errors";

export interface ErrorBody {
  readonly error: { readonly code: string; readonly message: string };
}

export const errorResponse = (status: number, code: string, message: string): Response =>
  Response.json({ error: { code, message } } satisfies ErrorBody, { status });

export class BadRequestError extends Error {}

const statusFor = (error: DomainError): number => {
  if (error instanceof ValidationError) return 400;
  if (error instanceof NotFoundError) return 404;
  return 422;
};

/** Translates thrown errors into HTTP responses so handlers stay on the happy path. */
export const toErrorResponse = (error: unknown): Response => {
  if (error instanceof DomainError) {
    return errorResponse(statusFor(error), error.code, error.message);
  }
  if (error instanceof BadRequestError) {
    return errorResponse(400, "BAD_REQUEST", error.message);
  }
  console.error("unhandled error", error);
  return errorResponse(500, "INTERNAL_ERROR", "internal server error");
};

export const handle =
  <Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) =>
  async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };

export const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw new BadRequestError("request body must be valid JSON");
  }
};
