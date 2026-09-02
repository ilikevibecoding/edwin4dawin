#!/usr/bin/env python3
"""Independent strong-row replay for the exact three-chunk b0 support."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

from audit_rank8_low_low_a23_mixed_cross_strong_outer_agent import (
    HARD_PRIVATE_LIMIT,
    independently_construct_pieces,
    independent_merge,
)


DEPENDENCY = "audit_rank8_low_low_a23_mixed_cross_strong_outer_agent.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_write(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--label", choices=("strong_middle_times_4", "strong_far"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--expected-manifest-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    peak = [0]
    names, pieces = independently_construct_pieces(face, args.label, args.degree, peak)
    replay = independent_merge(names, pieces, args.degree, peak)

    # The independent legacy merge deliberately enumerates 0..degree.  The
    # exact source inspection proves b0 exponent <=2, so all later replay
    # slots must be empty before they may be dropped from the new manifest.
    assert len(replay["chunks"]) == args.degree + 1
    for item in replay["chunks"][3:]:
        assert item["mixed_support_terms"] == 0
        assert item["negative_terms"] == 0
        assert item["minimum"] is None
        assert item["first_negative"] is None
        assert item["ordered_coefficient_sha256"] == hashlib.sha256().hexdigest().upper()
    replay_chunks = replay["chunks"][:3]

    manifest_path = Path(args.manifest).resolve()
    expected_hash = args.expected_manifest_sha256.upper()
    assert sha256(manifest_path) == expected_hash
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
    assert manifest["face"] == list(face)
    assert manifest["family"] == "strong"
    assert manifest["auxiliary"] == args.label
    assert manifest["total_ordinary_slack_degree"] == args.degree
    assert manifest["outer_exponent_range"] == [0, 2]
    assert manifest["global_row_assembly"] is False
    result = manifest["result"]
    assert result["mixed_support_terms"] == replay["mixed_support_terms"]
    assert result["negative_terms"] == replay["negative_terms"] == 0
    assert result["ordered_coefficient_sha256"] == replay["ordered_coefficient_sha256"]
    assert result["piece_lengths"] == replay["piece_lengths"]
    records = result["chunks"]
    assert [item["outer_exponent"] for item in records] == [0, 1, 2]
    chunk_audit = []
    for record, actual in zip(records, replay_chunks):
        chunk_path = Path(record["path"]).resolve()
        assert sha256(chunk_path) == record["sha256"]
        chunk = json.loads(chunk_path.read_text(encoding="utf-8"))
        assert chunk["outer_exponent"] == actual["outer_exponent"]
        for key in (
            "mixed_support_terms",
            "negative_terms",
            "minimum",
            "first_negative",
            "ordered_coefficient_sha256",
        ):
            assert chunk["chunk"][key] == actual[key]
        chunk_audit.append({
            "outer_exponent": actual["outer_exponent"],
            "path": str(chunk_path),
            "sha256": record["sha256"],
            "replay_exact_match": True,
        })
    here = Path(__file__).resolve().parent
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-outer-three-chunk-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_EXACT_STRONG_THREE_CHUNK_AND_ORDERED_ROW_REPLAY",
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "family": "strong",
        "auxiliary": args.label,
        "total_ordinary_slack_degree": args.degree,
        "manifest": str(manifest_path),
        "manifest_sha256": expected_hash,
        "replayed_mixed_support_terms": replay["mixed_support_terms"],
        "replayed_negative_terms": replay["negative_terms"],
        "replayed_ordered_coefficient_sha256": replay["ordered_coefficient_sha256"],
        "piece_lengths": replay["piece_lengths"],
        "chunk_audit": chunk_audit,
        "outer_support_bound": [0, 2],
        "discarded_legacy_empty_exponents": list(range(3, args.degree + 1)),
        "global_row_assembly": False,
        "hard_private_memory_limit_bytes": HARD_PRIVATE_LIMIT,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
        "independent_replay_dependency_sha256": sha256(here / DEPENDENCY),
        "producer_source_sha256_from_manifest": manifest["source_sha256"],
    }
    output = Path(args.output).resolve()
    atomic_write(output, payload)
    print("PASS", output, sha256(output), flush=True)


if __name__ == "__main__":
    main()
