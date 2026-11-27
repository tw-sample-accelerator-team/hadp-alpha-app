import { Link } from "react-router";

import { Button } from "@/shared/ui/button";

export const NotFoundPage = () => (
  <section className="flex flex-col items-start gap-4">
    <h1 className="text-2xl font-semibold">Page not found</h1>
    <p className="text-muted-foreground">The page you are looking for does not exist.</p>
    <Button asChild variant="outline">
      <Link to="/">Go home</Link>
    </Button>
  </section>
);
