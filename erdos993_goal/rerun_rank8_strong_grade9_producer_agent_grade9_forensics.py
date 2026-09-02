#!/usr/bin/env python3
"""Fail-isolated wrapper for a fresh canonical strong grade-9 producer run.

The canonical producer is imported unchanged, so all successful artifacts keep
its pinned source hash.  Only the fixed-name failure sidecar is redirected to a
forensics-specific name; existing producer/auditor artifacts are never touched.
"""

from pathlib import Path

import probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent as canonical


if __name__ == "__main__":
    try:
        canonical.main()
    except BaseException as error:
        canonical.atomic_json(
            Path(__file__).resolve().parent
            / "rank8_strong_grade9_producer_agent_grade9_forensics.failure.json",
            {
                "schema": "rank8-strong-grade9-producer-forensics-wrapper-v1",
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_STOP",
                "exception_type": type(error).__name__,
                "exception": str(error),
                "context": canonical.FAILURE_CONTEXT,
                "canonical_source_sha256": canonical.sha256(
                    Path(canonical.__file__).resolve()
                ),
                "wrapper_source_sha256": canonical.sha256(Path(__file__)),
            },
        )
        raise
