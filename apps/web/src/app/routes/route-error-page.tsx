import { isRouteErrorResponse, Link, useRouteError } from "react-router";

import { Button } from "@/shared/ui/button";

const describe = (error: unknown): string => {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

export const RouteErrorPage = () => {
  const error = useRouteError();

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">{describe(error)}</p>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
    </main>
  );
};
