"""
Simple in-memory async job queue.
No Redis needed for a desktop app.
"""
from __future__ import annotations
import asyncio
import uuid
from enum import Enum
from typing import Any, Callable, Coroutine
from dataclasses import dataclass, field


class JobStatus(str, Enum):
    PENDING   = "pending"
    RUNNING   = "running"
    DONE      = "done"
    FAILED    = "failed"


@dataclass
class Job:
    id: str                = field(default_factory=lambda: str(uuid.uuid4()))
    status: JobStatus      = JobStatus.PENDING
    progress: int          = 0          # 0-100
    result: Any            = None
    error: str             = None


class JobQueue:
    def __init__(self):
        self._jobs: dict[str, Job] = {}

    def create(self) -> Job:
        job = Job()
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def update(self, job_id: str, **kwargs):
        job = self._jobs.get(job_id)
        if job:
            for k, v in kwargs.items():
                setattr(job, k, v)

    async def run(self, job_id: str, coro: Coroutine):
        self.update(job_id, status=JobStatus.RUNNING)
        try:
            result = await coro
            self.update(job_id, status=JobStatus.DONE, result=result, progress=100)
        except Exception as e:
            self.update(job_id, status=JobStatus.FAILED, error=str(e))


job_queue = JobQueue()
