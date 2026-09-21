"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="wrap">
      <div className="error-state">
        <h2>Something went wrong</h2>
        <p>
          An unexpected error occurred. You can try again — if it keeps
          happening, refresh the page.
        </p>
        <button className="btn" type="button" onClick={reset}>
          <RefreshCw size={15} />
          Try again
        </button>
      </div>
    </main>
  );
}
