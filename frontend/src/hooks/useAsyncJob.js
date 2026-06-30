import { useState, useCallback } from "react";
import { pollJob } from "../api/jobs";

export function useAsyncJob() {
  const [progress, setProgress] = useState(0);
  const [running,  setRunning]  = useState(false);
  const [error,    setError]    = useState(null);

  const run = useCallback(async (jobId) => {
    setRunning(true);
    setError(null);
    setProgress(0);
    try {
      const result = await pollJob(jobId, p => setProgress(p));
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setRunning(false);
    }
  }, []);

  return { run, progress, running, error };
}
