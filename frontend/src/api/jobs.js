import client from "./client";

export const getJob = (jobId) => client.get(`/jobs/${jobId}`).then(r => r.data);

export const pollJob = (jobId, onProgress, interval = 500) =>
  new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const job = await getJob(jobId);
        if (onProgress) onProgress(job.progress);
        if (job.status === "done")   { clearInterval(timer); resolve(job.result); }
        if (job.status === "failed") { clearInterval(timer); reject(new Error(job.error)); }
      } catch (err) { clearInterval(timer); reject(err); }
    }, interval);
  });
