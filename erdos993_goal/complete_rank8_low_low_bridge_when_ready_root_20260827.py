#!/usr/bin/env python3
"""Fail-closed orchestration of the prepared rank-eight bridge chain.

The exact shard auditors remain the mathematical work.  This script only
waits for their six atomic PASS reports per grade, runs the already pinned
assemblers/auditors in dependency order, and stops immediately on any error.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


HERE = Path(__file__).resolve().parent
SHARD_SOURCE = (
    "audit_rank8_low_low_a23_mixed_cross_multidegree_family_"
    "independent_shard_root.py"
)
SHARD_ASSEMBLER = (
    "assemble_rank8_low_low_a23_mixed_cross_multidegree_"
    "sharded_independent_audit_root.py"
)
GRADE_ASSEMBLER = (
    "assemble_rank8_low_low_a23_mixed_cross_multidegree_"
    "family_grade_sharded_root.py"
)
SHARD_SOURCE_SHA256 = (
    "1D91B64A0526A32802CDC0F0226161199E68C5883E511EF20320802D54C17608"
)
SHARD_ASSEMBLER_SHA256 = (
    "C155926342472CD7CDD7FD1A8E25431761FCEBB492AC590241A4528724ABF1D6"
)

GRADES = {
    11: {
        "producer": (
            "_multidegree_grades8_13_20260825/"
            "rank8_low_low_a23_mixed_cross_strong_grade11_"
            "multidegree_family_job_agent_20260823.json"
        ),
        "sha256": (
            "8A981FE51C03831C124DC2A8843EEFA40EBED03EE1DEA6260746C5725D1BEFFA"
        ),
    },
    12: {
        "producer": (
            "_multidegree_grades8_13_20260825/"
            "rank8_low_low_a23_mixed_cross_strong_grade12_"
            "multidegree_family_job_agent_20260823.json"
        ),
        "sha256": (
            "AD7D701FBD5FC9192B190877ADF8C62F3ACB171C6215B9D8FAAB5D08014516F3"
        ),
    },
    13: {
        "producer": (
            "_multidegree_strong_grade13_root_20260827/"
            "rank8_low_low_a23_mixed_cross_strong_grade13_"
            "multidegree_family_job_agent_20260823.json"
        ),
        "sha256": (
            "49EDC023B59A284A7B596A65D9A44DF71D0BE147201AEBD399885A486E77F652"
        ),
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_status(path: Path) -> str | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))["status"]
    except (OSError, KeyError, json.JSONDecodeError):
        return None


def require_hash(path: Path, expected: str) -> None:
    actual = sha256(path)
    if actual != expected:
        raise RuntimeError(f"hash mismatch for {path.name}: {actual} != {expected}")


def run(script: str, *arguments: str) -> None:
    command = [sys.executable, str(HERE / script), *arguments]
    print("RUN", " ".join(command), flush=True)
    subprocess.run(command, cwd=HERE, check=True)


def shard_paths(grade: int) -> list[Path]:
    return [
        HERE / (
            "rank8_low_low_a23_mixed_cross_strong_grade"
            f"{grade}_independent_shard_{face}_o{outer}_root_20260827.json"
        )
        for face in ("01", "10")
        for outer in range(3)
    ]


def aggregate_path(grade: int) -> Path:
    return HERE / (
        "rank8_low_low_a23_mixed_cross_multidegree_strong_grade"
        f"{grade}_sharded_independent_audit_root_20260827.json"
    )


def certificate_path(grade: int) -> Path:
    return HERE / (
        "rank8_low_low_a23_mixed_cross_multidegree_strong_grade"
        f"{grade}_assembler_root_20260827.json"
    )


def assemble_ready_grade(grade: int) -> bool:
    certificate = certificate_path(grade)
    if load_status(certificate) == (
        "PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_INDEPENDENTLY_AUDITED"
    ):
        return True
    shards = shard_paths(grade)
    if not all(
        load_status(path) == "PASS_INDEPENDENT_EXACT_FACE_OUTER_SHARD_BOTH_ROWS"
        for path in shards
    ):
        return False

    data = GRADES[grade]
    producer = HERE / data["producer"]
    require_hash(producer, data["sha256"])
    require_hash(HERE / SHARD_SOURCE, SHARD_SOURCE_SHA256)
    require_hash(HERE / SHARD_ASSEMBLER, SHARD_ASSEMBLER_SHA256)
    aggregate = aggregate_path(grade)
    run(
        SHARD_ASSEMBLER,
        "--family", "strong",
        "--degree", str(grade),
        "--producer-job", str(producer),
        "--expected-producer-job-sha256", data["sha256"],
        "--shard-directory", str(HERE),
        "--shard-source", str(HERE / SHARD_SOURCE),
        "--expected-shard-source-sha256", SHARD_SOURCE_SHA256,
        "--output", str(aggregate),
    )
    if load_status(aggregate) != (
        "PASS_INDEPENDENT_SHARDED_FORMAL_TWO_GRADING_ATOM_EXTERNAL_"
        "MERGE_ALL_FOUR_CELLS_EXACT"
    ):
        raise RuntimeError(f"unexpected aggregate status for grade {grade}")
    run(
        GRADE_ASSEMBLER,
        "--family", "strong",
        "--degree", str(grade),
        "--producer-job", str(producer),
        "--expected-producer-job-sha256", data["sha256"],
        "--independent-audit", str(aggregate),
        "--expected-independent-audit-sha256", sha256(aggregate),
        "--independent-audit-source", str(HERE / SHARD_ASSEMBLER),
        "--expected-independent-audit-source-sha256", SHARD_ASSEMBLER_SHA256,
        "--output", str(certificate),
    )
    if load_status(certificate) != (
        "PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_INDEPENDENTLY_AUDITED"
    ):
        raise RuntimeError(f"unexpected certificate status for grade {grade}")
    print("GRADE_COMPLETE", grade, sha256(certificate), flush=True)
    return True


def finish_chain() -> None:
    block_script = (
        "assemble_rank8_low_low_a23_mixed_cross_multidegree_"
        "grades8_13_block_root_20260827.py"
    )
    block = HERE / (
        "rank8_low_low_a23_mixed_cross_multidegree_"
        "grades8_13_block_assembler_root_20260827.json"
    )
    if load_status(block) != "PASS_HASH_PINNED_ALL_48_LOW_LOW_REGISTRY_CELLS_GRADES8_13":
        run(block_script)

    registry_builder = "merge_rank8_low_low_a23_mixed_cross_outer_registry_root_20260827.py"
    registry = HERE / "rank8_low_low_a23_mixed_cross_outer_registry_root_20260827.json"
    if load_status(registry) != "CHECKPOINT_124_AUDITED_0_PRODUCER_ONLY_0_MISSING":
        run(
            registry_builder,
            "--block", str(block),
            "--expected-block-sha256", sha256(block),
            "--output", str(registry),
        )

    registry_auditor = (
        "audit_rank8_low_low_a23_mixed_cross_outer_registry_"
        "repaired_root_20260827.py"
    )
    registry_audit = HERE / (
        "rank8_low_low_a23_mixed_cross_outer_registry_"
        "independent_audit_root_20260827.json"
    )
    if load_status(registry_audit) != (
        "PASS_INDEPENDENT_HASH_PINNED_REGISTRY_EXACT_124_CELL_"
        "DOMAIN_AND_EVIDENCE_REPLAY"
    ):
        run(
            registry_auditor,
            "--registry", str(registry),
            "--expected-registry-sha256", sha256(registry),
            "--builder-source", str(HERE / registry_builder),
            "--expected-builder-source-sha256", sha256(HERE / registry_builder),
            "--output", str(registry_audit),
        )

    mixed_script = "assemble_rank8_low_low_a23_mixed_support_complete_root.py"
    mixed = HERE / "rank8_low_low_a23_mixed_support_complete_root_20260826.json"
    single = HERE / (
        "rank8_low_low_a23_mixed_single_support_nonnegative_"
        "independent_audit_root_20260827.json"
    )
    if load_status(mixed) != (
        "PASS_EXACT_AND_INDEPENDENT_BOTH_MIXED_ENDPOINT_FACES_"
        "ALL_FOUR_AUXILIARIES_ARBITRARY_NONNEGATIVE_SLACKS"
    ):
        run(
            mixed_script,
            "--registry", str(registry),
            "--expected-registry-sha256", sha256(registry),
            "--registry-audit", str(registry_audit),
            "--expected-registry-audit-sha256", sha256(registry_audit),
            "--single-support-audit", str(single),
            "--expected-single-support-audit-sha256", sha256(single),
            "--output", str(mixed),
        )

    mixed_audit_script = "audit_rank8_low_low_a23_mixed_support_complete_root.py"
    mixed_audit = HERE / (
        "rank8_low_low_a23_mixed_support_complete_"
        "independent_audit_root_20260826.json"
    )
    if load_status(mixed_audit) != (
        "PASS_INDEPENDENT_FAIL_CLOSED_Z_EA_EB_X_PARTITION_"
        "BOTH_MIXED_FACES_NO_ROW_OR_GRADE_GAP"
    ):
        run(
            mixed_audit_script,
            "--theorem", str(mixed),
            "--expected-theorem-sha256", sha256(mixed),
            "--output", str(mixed_audit),
        )

    bridge_script = "assemble_rank8_low_low_a23_full_bridge_root.py"
    bridge = HERE / "rank8_low_low_a23_full_bridge_root_20260826.json"
    if load_status(bridge) != "PASS_EXACT_AND_INDEPENDENT_RANK8_LOW_LOW_FULL_CONVOLUTION_CONE":
        run(
            bridge_script,
            "--mixed-theorem", str(mixed),
            "--expected-mixed-theorem-sha256", sha256(mixed),
            "--mixed-audit", str(mixed_audit),
            "--expected-mixed-audit-sha256", sha256(mixed_audit),
            "--output", str(bridge),
        )

    bridge_audit_script = "audit_rank8_low_low_a23_full_bridge_root.py"
    bridge_audit = HERE / (
        "rank8_low_low_a23_full_bridge_independent_audit_root_20260826.json"
    )
    if load_status(bridge_audit) != (
        "PASS_INDEPENDENT_FAIL_CLOSED_RANK8_LOW_LOW_FULL_BRIDGE_EXACT_521_POSITION_UNIVERSE"
    ):
        run(
            bridge_audit_script,
            "--theorem", str(bridge),
            "--expected-theorem-sha256", sha256(bridge),
            "--output", str(bridge_audit),
        )

    forest_script = "assemble_rank8_forest_q8_pgc_complete_root.py"
    forest = HERE / "rank8_forest_q8_pgc_complete_root_20260826.json"
    if load_status(forest) != "PASS_EXACT_AND_INDEPENDENT_RANK8_FOREST_Q8_AND_PGC_COMPLETE":
        run(
            forest_script,
            "--low-low-theorem", str(bridge),
            "--expected-low-low-theorem-sha256", sha256(bridge),
            "--low-low-audit", str(bridge_audit),
            "--expected-low-low-audit-sha256", sha256(bridge_audit),
            "--output", str(forest),
        )

    forest_audit_script = "audit_rank8_forest_q8_pgc_complete_root.py"
    forest_audit = HERE / (
        "rank8_forest_q8_pgc_complete_independent_audit_root_20260826.json"
    )
    if load_status(forest_audit) != (
        "PASS_INDEPENDENT_FAIL_CLOSED_RANK8_FOREST_Q8_"
        "AND_PGC_NO_PARTITION_GAP"
    ):
        run(
            forest_audit_script,
            "--theorem", str(forest),
            "--expected-theorem-sha256", sha256(forest),
            "--output", str(forest_audit),
        )
    print("RANK8_CHAIN_COMPLETE", sha256(forest), sha256(forest_audit), flush=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--poll-seconds", type=int, default=30)
    parser.add_argument("--no-wait", action="store_true")
    args = parser.parse_args()
    require_hash(HERE / SHARD_SOURCE, SHARD_SOURCE_SHA256)
    require_hash(HERE / SHARD_ASSEMBLER, SHARD_ASSEMBLER_SHA256)
    while True:
        ready = [assemble_ready_grade(grade) for grade in sorted(GRADES)]
        if all(ready):
            finish_chain()
            return 0
        if args.no_wait:
            print("NOT_READY", ready, flush=True)
            return 2
        print("WAITING_FOR_GRADE_SHARDS", ready, flush=True)
        time.sleep(max(1, args.poll_seconds))


if __name__ == "__main__":
    raise SystemExit(main())
