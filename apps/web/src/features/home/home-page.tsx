import { Link } from "react-router";

import { Button } from "@/shared/ui/button";

export const HomePage = () => (
  <section className="flex flex-col items-start gap-4">
    <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
    <p className="text-muted-foreground">
      React, Vite, TypeScript, shadcn/ui, React Router and TanStack Query, ready to build on.
    </p>
    <Button asChild>
      <Link to="/health">Check backend health</Link>
    </Button>
  </section>
);
