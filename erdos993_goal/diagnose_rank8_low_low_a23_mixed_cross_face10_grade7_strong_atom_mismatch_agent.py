#!/usr/bin/env python3
"""Target the first face10 grade7 strong atom replay mismatch exactly."""

from __future__ import annotations

import gc
import gzip
import hashlib
import json
import os
from pathlib import Path

import audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent as audit
import probe_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent as producer


HERE = Path(__file__).resolve().parent
JOB = HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_outer_factored_atom_stream_job_agent_20260823.json"
JOB_SHA256 = "C45032D332BEEEC3D6B9E8E41F698805F1278B7BD368753BCC897FBFD7B0CB1F"
OUTPUT = HERE / "rank8_low_low_a23_mixed_cross_face10_grade7_strong_atom_mismatch_diagnostic_agent_20260823.json"
FACE = (1, 0)
DEGREE = 7
EXPONENT = 1
TARGET = ("base", "derivative", "twice_c8_v8")
LIMIT = 500_000_000


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def polynomial_signature(polynomial) -> dict:
    digest = hashlib.sha256()
    for index in range(len(polynomial)):
        monomial = tuple(map(int, polynomial.monomial(index)))
        coefficient = int(polynomial.coefficient(index))
        digest.update((",".join(map(str, monomial)) + ":" + str(coefficient) + "\n").encode())
    return {"terms": len(polynomial), "ordered_sha256": digest.hexdigest().upper()}


def formal_component_signatures(common: dict) -> dict:
    result = {}
    for name in ("base_c", "base_v"):
        row = common[name][8]
        for degree in range(DEGREE + 1):
            for exponent in range(2):
                result[f"{name}_rank8_degree{degree}_outer{exponent}"] = polynomial_signature(
                    row.c[degree][exponent]
                )
    return result


def split_component_signatures(common: dict) -> dict:
    result = {}
    for name in ("base_c", "base_v"):
        for degree in range(DEGREE + 1):
            for exponent in range(2):
                result[f"{name}_rank8_degree{degree}_outer{exponent}"] = polynomial_signature(
                    common[name][exponent][8].c[degree]
                )
    return result


def compare_stream(polynomial, stream_path: Path) -> dict:
    indices = {item: audit.REDUCED_NAMES.index(item) for item in audit.REDUCED_NAMES}
    group_a = tuple(indices[item] for item in audit.GROUP_A)
    group_b = tuple(indices[item] for item in audit.GROUP_B if item != "b0")
    compared = 0
    previous_expected = previous_saved = None
    with gzip.open(stream_path, "rb") as saved:
        for term_index in range(len(polynomial)):
            reduced = tuple(map(int, polynomial.monomial(term_index)))
            if not any(reduced[index] for index in group_a):
                continue
            if EXPONENT == 0 and not any(reduced[index] for index in group_b):
                continue
            coefficient = int(polynomial.coefficient(term_index))
            full = reduced + (EXPONENT,)
            expected = (",".join(map(str, full)) + ":" + str(coefficient) + "\n").encode()
            observed = saved.readline()
            if observed != expected:
                return {
                    "exact_match": False,
                    "stream_line_index_zero_based": compared,
                    "formal_term_index": term_index,
                    "expected_line": expected.decode().rstrip("\n"),
                    "observed_line": observed.decode(errors="replace").rstrip("\n"),
                    "expected_monomial": list(full),
                    "expected_coefficient": coefficient,
                    "previous_expected_line": previous_expected,
                    "previous_observed_line": previous_saved,
                    "observed_eof": observed == b"",
                }
            previous_expected = expected.decode().rstrip("\n")
            previous_saved = observed.decode().rstrip("\n")
            compared += 1
        extra = saved.readline()
    return {
        "exact_match": extra == b"",
        "stream_lines_compared": compared,
        "first_extra_observed_line": extra.decode(errors="replace").rstrip("\n"),
    }


def target_record() -> tuple[dict, dict]:
    assert sha256(JOB) == JOB_SHA256
    job = json.loads(JOB.read_text(encoding="utf-8"))
    rows = {row["auxiliary"]: row for row in job["completed_rows"]}
    far_path = Path(rows["strong_far"]["manifest"])
    assert sha256(far_path) == rows["strong_far"]["manifest_sha256"]
    far = json.loads(far_path.read_text(encoding="utf-8"))
    chunk_record = far["result"]["chunks"][EXPONENT]
    chunk_path = Path(chunk_record["path"])
    assert sha256(chunk_path) == chunk_record["sha256"]
    chunk = json.loads(chunk_path.read_text(encoding="utf-8"))
    target_fragment = f"strong_{TARGET[0]}_{TARGET[1]}_{TARGET[2]}_grade_{DEGREE}_"
    matches = [
        record for record in chunk["atom_stream_manifests"]
        if target_fragment in Path(record["path"]).name
    ]
    assert len(matches) == 1
    return matches[0], job


def main() -> None:
    record, job = target_record()
    manifest_path = Path(record["path"])
    assert sha256(manifest_path) == record["sha256"]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    stream_path = Path(manifest["coefficient_stream"])
    assert sha256(stream_path) == manifest["coefficient_stream_sha256"]

    peak = [0]
    formal_common = audit.build_formal_common(FACE, DEGREE, peak, LIMIT)
    formal_signatures = formal_component_signatures(formal_common)
    formal_polynomial = audit.construct_atom(
        formal_common, *TARGET, DEGREE, EXPONENT, peak, LIMIT
    )
    formal_comparison = compare_stream(formal_polynomial, stream_path)
    del formal_polynomial, formal_common
    gc.collect()

    split_common = producer.build_split_common(FACE, DEGREE, peak, LIMIT)
    split_signatures = split_component_signatures(split_common)
    signature_mismatches = {
        key: {"formal": formal_signatures[key], "split": split_signatures[key]}
        for key in formal_signatures
        if formal_signatures[key] != split_signatures[key]
    }
    split_polynomial = producer.construct_atom(
        split_common, *TARGET, DEGREE, EXPONENT, peak, LIMIT
    )
    split_comparison = compare_stream(split_polynomial, stream_path)
    del split_polynomial, split_common
    gc.collect()

    assert not formal_comparison["exact_match"]
    status = (
        "DIAGNOSED_FORMAL_REPLAY_VS_PRODUCER_STREAM_MISMATCH"
        if split_comparison["exact_match"]
        else "DIAGNOSED_BOTH_LITERAL_REBUILDS_VS_SAVED_STREAM_MISMATCH"
    )
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face10-grade7-strong-atom-mismatch-diagnostic-agent-v1",
        "status": status,
        "face": list(FACE),
        "total_ordinary_slack_degree": DEGREE,
        "outer_exponent": EXPONENT,
        "target": {"piece": TARGET[0], "part": TARGET[1], "atom": TARGET[2]},
        "job": str(JOB), "job_sha256": JOB_SHA256,
        "producer_source_sha256": job["source_sha256"],
        "atom_manifest": str(manifest_path), "atom_manifest_sha256": record["sha256"],
        "atom_stream": str(stream_path), "atom_stream_sha256": manifest["coefficient_stream_sha256"],
        "formal_replay_vs_saved": formal_comparison,
        "split_rebuild_vs_saved": split_comparison,
        "rank8_base_c_v_component_signature_mismatch_count": len(signature_mismatches),
        "rank8_base_c_v_component_signature_mismatches": signature_mismatches,
        "hard_private_memory_limit_bytes": LIMIT,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
        "formal_auditor_source_sha256": sha256(HERE / "audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent.py"),
        "producer_source_sha256_live": sha256(HERE / "probe_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent.py"),
    }
    print("DIAGNOSED", OUTPUT, atomic_json(OUTPUT, payload), flush=True)


if __name__ == "__main__":
    main()
