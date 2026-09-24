import { LoadingSpinner } from "./components/LoadingSpinner";

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-deep-accent" role="status" aria-label="Loading">
      <LoadingSpinner className="h-7 w-7" />
    </div>
  );
}
