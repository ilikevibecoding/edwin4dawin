#!/usr/bin/env python3
"""One exact face/outer shard of the independent multidegree replay.

The mathematical reconstruction and merge primitives come from the pinned
independent auditor, never from the producer.  Sharding changes only scheduling:
the six disjoint (face, b0-exponent) slices can run concurrently.
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import os
import tempfile
from pathlib import Path

import audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent as base


HERE = Path(__file__).resolve().parent
BASE_AUDITOR = (
    "audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent.py",
    "A0FA1D4C66A17B7D1030E8B0908EF0C5A700C2D1DFD4E5A35EC6FDF31B7D5F9F",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--family", choices=("curvature", "strong"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--face-token", choices=("01", "10"), required=True)
    parser.add_argument("--outer-exponent", type=int, choices=range(3), required=True)
    parser.add_argument("--producer-job", required=True)
    parser.add_argument("--expected-producer-job-sha256", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--scratch-directory")
    parser.add_argument("--hard-private-limit-bytes", type=int, default=10_000_000_000)
    args = parser.parse_args()

    assert sha256(HERE / BASE_AUDITOR[0]) == BASE_AUDITOR[1]
    assert sha256(HERE / base.PRODUCER[0]) == base.PRODUCER[1]
    for name, expected in base.DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    maximum = base.FAMILY_MAXIMUM[args.family]
    assert args.degree <= maximum
    job_path = Path(args.producer_job).resolve()
    job_hash = args.expected_producer_job_sha256.upper()
    assert sha256(job_path) == job_hash
    job = json.loads(job_path.read_text(encoding="utf-8"))
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE"
    assert job["family"] == args.family
    assert job["total_ordinary_slack_degree"] == args.degree
    assert job["exact_base_degree"] == maximum - args.degree
    assert job["source_sha256"] == base.PRODUCER[1]
    job_cells = {
        (cell["face_token"], cell["auxiliary"]): cell
        for cell in job["completed_cells"]
    }
    expected_keys = {
        (token, label)
        for token, _ in base.FACES
        for label in (
            f"{args.family}_middle_times_4", f"{args.family}_far"
        )
    }
    assert set(job_cells) == expected_keys

    face = dict(base.FACES)[args.face_token]
    labels = (f"{args.family}_middle_times_4", f"{args.family}_far")
    loaded = {
        label: base.load_cell(
            job_cells, args.face_token, args.family, label, args.degree
        )
        for label in labels
    }
    components, constructor = base.components_and_constructor(args.family, args.degree)
    peak = [0]
    common = base.build_formal_common(
        face, args.degree, peak, args.hard_private_limit_bytes
    )
    scratch = (
        Path(args.scratch_directory).resolve()
        if args.scratch_directory else Path(args.output).resolve().parent
    )
    scratch.mkdir(parents=True, exist_ok=True)
    atom_summaries = []
    replays = []
    with tempfile.TemporaryDirectory(
        prefix=(
            f"rank8_{args.family}_g{args.degree}_{args.face_token}_"
            f"o{args.outer_exponent}_shard_"
        ),
        dir=scratch,
    ) as temporary:
        records = []
        for component in components:
            polynomial = constructor(
                common, *component, args.degree, args.outer_exponent,
                peak, args.hard_private_limit_bytes,
            )
            stream_path = Path(temporary) / (
                base.component_name(component) + ".txt.gz"
            )
            record = base.write_atom_stream(
                polynomial, component, args.outer_exponent, args.degree,
                stream_path, peak, args.hard_private_limit_bytes,
            )
            records.append(record)
            del polynomial
            gc.collect()
            base.guard(
                f"released sharded atom {base.component_name(component)}",
                peak, args.hard_private_limit_bytes,
            )
        for label in labels:
            selected, scales = base.row_records_and_scales(
                args.family, label, records
            )
            expected_chunk = loaded[label][2][args.outer_exponent]
            local_digest = hashlib.sha256()
            replay = base.replay_row_chunk(
                selected, scales, expected_chunk, local_digest,
                peak, args.hard_private_limit_bytes,
            )
            assert local_digest.hexdigest().upper() == replay["ordered_coefficient_sha256"]
            replays.append({
                "auxiliary": label,
                "producer_manifest": loaded[label][0]["manifest"],
                "producer_manifest_sha256": loaded[label][0]["manifest_sha256"],
                "replay": replay,
            })
        atom_summaries = [
            {
                key: value for key, value in record.items()
                if not key.startswith("temporary_")
            }
            for record in records
        ]

    assert all(item["replay"]["negative_terms"] == 0 for item in replays)
    payload = {
        "schema": (
            "rank8-low-low-a23-mixed-cross-multidegree-family-"
            "independent-shard-root-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_FACE_OUTER_SHARD_BOTH_ROWS",
        "family": args.family,
        "total_ordinary_slack_degree": args.degree,
        "exact_base_degree": maximum - args.degree,
        "face_token": args.face_token,
        "face": list(face),
        "outer_exponent": args.outer_exponent,
        "producer_job": str(job_path),
        "producer_job_sha256": job_hash,
        "producer_source_sha256": base.PRODUCER[1],
        "replays": replays,
        "atom_summaries": atom_summaries,
        "checks": {
            "producer_imported": False,
            "pinned_independent_reconstruction_primitives": True,
            "one_natural_bilinear_atom_live_at_a_time": True,
            "temporary_external_merge": True,
            "temporary_streams_removed": True,
            "both_rows_replayed_exactly": True,
            "chunk_counts_signs_minima_witnesses_and_ordered_hashes_exact": True,
        },
        "base_auditor_source": {"path": BASE_AUDITOR[0], "sha256": BASE_AUDITOR[1]},
        "hard_private_memory_limit_bytes": args.hard_private_limit_bytes,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
