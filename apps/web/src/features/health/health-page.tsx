import { useHealthQuery } from "@/features/health/api/health-queries";
import { HealthStatusCard } from "@/features/health/components/health-status-card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

export const HealthPage = () => {
  const { data, isPending, isError, error, refetch, isFetching } = useHealthQuery();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Health</h1>
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? "Checking…" : "Check again"}
        </Button>
      </div>

      {isPending && <Skeleton aria-label="Loading health status" className="h-32 w-full" />}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Could not reach the backend</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && <HealthStatusCard health={data} />}
    </section>
  );
};
