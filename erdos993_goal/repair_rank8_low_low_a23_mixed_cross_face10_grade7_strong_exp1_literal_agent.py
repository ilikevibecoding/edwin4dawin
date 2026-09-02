#!/usr/bin/env python3
"""Replace one quarantined atom and rebuild the affected face10 exp1 rows."""

from __future__ import annotations

import hashlib
import heapq
import json
import os
from pathlib import Path

import probe_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent as producer


HERE = Path(__file__).resolve().parent
FACE = (1, 0)
FACE_TOKEN = "10"
DEGREE = 7
EXPONENT = 1
LIMIT = 500_000_000
DATE_TAG = "20260823literalfix"
TARGET = ("base", "derivative", "twice_c8_v8")
OLD_JOB = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_outer_factored_atom_stream_job_agent_20260823.json",
    "C45032D332BEEEC3D6B9E8E41F698805F1278B7BD368753BCC897FBFD7B0CB1F",
)
FAILURE = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_outer_factored_atom_stream_independent_audit_agent_20260823.json.failure.json",
    "44116F61A254AC44C882E9C2E4FCF364E56DD47756A702796867DB7F78DC2AF0",
)
DIAGNOSTIC = (
    HERE / "rank8_low_low_a23_mixed_cross_face10_grade7_strong_atom_mismatch_diagnostic_agent_20260823.json",
    "8FB966AACF61D105783FF556928B3E23F3EBD460DCE2B81E74D1DCB0DAC54226",
)
LITERAL_RERUN = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_base_derivative_twice_c8_v8_grade_7_b0_exp_1_literal_rerun_agent_20260823.json",
    "40BEDBD5472EDD6D263DEDEB0D248642C2FA20B673306B5EE9FB6C23BC339B53",
)
CORRECTED_ATOM = HERE / (
    "rank8_low_low_a23_mixed_cross_face_10_strong_base_derivative_twice_c8_v8_"
    "grade_7_b0_exp_1_literal_corrected_atom_stream_agent_20260823_manifest.json"
)
OUTPUT_JOB = HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_literal_corrected_job_agent_20260823.json"
FORMAL_DEPENDENCY = HERE / "probe_rank8_low_low_a23_mixed_cross_face_grade_outer_factored_agent.py"
STREAM_DEPENDENCY = HERE / "probe_rank8_low_low_a23_mixed_cross_curvature_outer_factored_atom_stream_agent.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned(item: tuple[Path, str]) -> dict:
    path, expected = item
    actual = sha256(path)
    assert actual == expected, (str(path), actual, expected)
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def full_record(manifest_record: dict) -> dict:
    path = Path(manifest_record["path"])
    assert sha256(path) == manifest_record["sha256"]
    manifest = json.loads(path.read_text(encoding="utf-8"))
    assert manifest["status"] == "PASS_EXACT_STRONG_ATOM_STREAM_COMPLETE"
    return {
        "piece": manifest["piece"], "part": manifest["part"], "atom": manifest["atom"],
        "component": manifest["component"], "outer_exponent": manifest["outer_exponent"],
        "manifest": str(path.resolve()), "manifest_sha256": manifest_record["sha256"],
        "stream": str(Path(manifest["coefficient_stream"]).resolve()),
        "stream_sha256": manifest["coefficient_stream_sha256"],
        "unfiltered_atom_terms": manifest["unfiltered_atom_terms"],
        "mixed_support_atom_terms": manifest["mixed_support_atom_terms"],
    }


def load_chunk(record: dict) -> dict:
    path = Path(record["path"])
    assert sha256(path) == record["sha256"]
    return json.loads(path.read_text(encoding="utf-8"))


def merge_stats(records: list[dict], scales: list[int], peak: list[int], stage: str,
                overall: hashlib._Hash) -> dict:
    cursors = [producer.StreamCursor(record, scale) for record, scale in zip(records, scales)]
    heap = []
    for index, cursor in enumerate(cursors):
        item = cursor.advance()
        if item is not None:
            key, monomial, coefficient = item
            heapq.heappush(heap, (key, index, monomial, coefficient))
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    try:
        while heap:
            key, index, monomial, coefficient = heapq.heappop(heap)
            combined, consumed = coefficient, [index]
            while heap and heap[0][0] == key:
                _, other, other_monomial, other_coefficient = heapq.heappop(heap)
                assert other_monomial == monomial
                combined += other_coefficient
                consumed.append(other)
            for item_index in consumed:
                item = cursors[item_index].advance()
                if item is not None:
                    next_key, next_monomial, next_coefficient = item
                    heapq.heappush(heap, (next_key, item_index, next_monomial, next_coefficient))
            if combined == 0:
                continue
            encoded = (",".join(map(str, monomial)) + ":" + str(combined) + "\n").encode()
            digest.update(encoded)
            overall.update(encoded)
            terms += 1
            minimum = combined if minimum is None else min(minimum, combined)
            if combined < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {"monomial": list(monomial), "coefficient": combined}
            if terms % 100_000 == 0:
                producer.guard(stage, peak, LIMIT)
    finally:
        for cursor in cursors:
            cursor.close()
    return {
        "mixed_support_terms": terms, "negative_terms": negative,
        "minimum": minimum, "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
    }


def row_manifest(label: str, old_manifest: dict, chunk_records: list[dict], overall_digest: str,
                 source_hash: str, peak: list[int], corrected_chunk: dict) -> tuple[Path, str, dict]:
    result = dict(old_manifest["result"])
    result["chunks"] = chunk_records
    result["mixed_support_terms"] = sum(item["mixed_support_terms"] for item in chunk_records)
    result["negative_terms"] = sum(item["negative_terms"] for item in chunk_records)
    result["ordered_coefficient_sha256"] = overall_digest
    assert result["negative_terms"] == 0
    path = HERE / (
        f"rank8_low_low_a23_mixed_cross_face_10_{label}_grade_7_"
        "literal_corrected_atom_stream_agent_20260823_manifest.json"
    )
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-atom-stream-row-manifest-literal-correction-agent-v1",
        "status": "PASS_EXACT_MIXED_CROSS_ROW_GRADE_LITERAL_CORRECTED_STRONG_ATOM_STREAM_CHUNKS_NONNEGATIVE",
        "face": list(FACE), "bridge_corner": [2, 0], "family": "strong", "auxiliary": label,
        "total_ordinary_slack_degree": DEGREE,
        "outer_variable": "b0", "outer_exponent_range": [0, 2],
        "global_row_assembly": False, "one_atom_live_at_a_time": True,
        "hard_private_memory_limit_bytes": LIMIT,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "result": result, "source_sha256": source_hash,
        "formal_dependency_sha256": sha256(FORMAL_DEPENDENCY),
        "stream_dependency_sha256": sha256(STREAM_DEPENDENCY),
        "correction": {
            "outer_exponent": EXPONENT,
            "target": {"piece": TARGET[0], "part": TARGET[1], "atom": TARGET[2]},
            "corrected_atom_manifest": str(CORRECTED_ATOM),
            "corrected_atom_manifest_sha256": sha256(CORRECTED_ATOM),
            "corrected_chunk": corrected_chunk,
            "quarantined_original_job": {"path": str(OLD_JOB[0]), "sha256": OLD_JOB[1]},
            "literal_rerun": {"path": str(LITERAL_RERUN[0]), "sha256": LITERAL_RERUN[1]},
        },
    }
    return path, atomic_json(path, payload), payload


def main() -> None:
    old_job = pinned(OLD_JOB)
    pinned(FAILURE); pinned(DIAGNOSTIC)
    literal = pinned(LITERAL_RERUN)
    assert literal["status"] == "PASS_BOUNDED_AFFECTED_ATOM_LITERAL_FORMAL_RERUN_AND_SPLIT_REBUILD_EXACT_MATCH"
    source_hash = sha256(Path(__file__))
    literal_result = literal["literal_formal_result"]
    literal_stream = Path(literal["literal_formal_stream"])
    assert sha256(literal_stream) == literal_result["stream_sha256"]

    old_rows = {item["auxiliary"]: item for item in old_job["completed_rows"]}
    old_manifests = {}
    old_chunks = {}
    for label, row in old_rows.items():
        path = Path(row["manifest"])
        assert sha256(path) == row["manifest_sha256"]
        manifest = json.loads(path.read_text(encoding="utf-8"))
        old_manifests[label] = manifest
        old_chunks[label] = [load_chunk(record) for record in manifest["result"]["chunks"]]

    far_records_by_outer = [
        [full_record(record) for record in chunk["atom_stream_manifests"]]
        for chunk in old_chunks["strong_far"]
    ]
    target_indices = [
        index for index, record in enumerate(far_records_by_outer[EXPONENT])
        if (record["piece"], record["part"], record["atom"]) == TARGET
    ]
    assert len(target_indices) == 1
    target_index = target_indices[0]
    quarantined = far_records_by_outer[EXPONENT][target_index]
    old_atom = json.loads(Path(quarantined["manifest"]).read_text(encoding="utf-8"))
    assert old_atom["mixed_support_atom_terms"] == literal_result["mixed_support_terms"]
    assert old_atom["unfiltered_atom_terms"] == literal_result["unfiltered_terms"]

    corrected_atom_payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-atom-coefficient-stream-literal-correction-agent-v1",
        "status": "PASS_EXACT_STRONG_ATOM_STREAM_COMPLETE",
        "face": list(FACE), "bridge_corner": [2, 0],
        "total_ordinary_slack_degree": DEGREE,
        "outer_variable": "b0", "outer_exponent": EXPONENT,
        "piece": TARGET[0], "part": TARGET[1], "atom": TARGET[2],
        "component": "_".join(TARGET),
        "unfiltered_atom_terms": literal_result["unfiltered_terms"],
        "mixed_support_atom_terms": literal_result["mixed_support_terms"],
        "negative_atom_terms": literal_result["negative_terms"],
        "minimum_atom_coefficient": literal_result["minimum"],
        "first_negative_atom_coefficient": literal_result["first_negative"],
        "ordered_atom_coefficient_sha256": literal_result["ordered_coefficient_sha256"],
        "coefficient_stream": str(literal_stream.resolve()),
        "coefficient_stream_sha256": literal_result["stream_sha256"],
        "coefficient_stream_encoding": "deterministic-gzip-mtime0-lines-full-exponents-colon-integer",
        "hard_private_memory_limit_bytes": LIMIT,
        "observed_peak_private_bytes_at_checkpoints": literal["observed_peak_private_bytes_at_checkpoints"],
        "source_sha256": source_hash,
        "literal_rerun_source_sha256": literal["source_sha256"],
        "literal_rerun_report": str(LITERAL_RERUN[0]),
        "literal_rerun_report_sha256": LITERAL_RERUN[1],
        "quarantined_original_atom_manifest": quarantined["manifest"],
        "quarantined_original_atom_manifest_sha256": quarantined["manifest_sha256"],
        "quarantined_original_atom_stream_sha256": quarantined["stream_sha256"],
    }
    corrected_atom_hash = atomic_json(CORRECTED_ATOM, corrected_atom_payload)
    far_records_by_outer[EXPONENT][target_index] = full_record({
        "path": str(CORRECTED_ATOM), "sha256": corrected_atom_hash,
    })

    components = producer.components_for_degree(DEGREE)
    middle_components = [item for item in components if item[0] in ("base", "linear")]
    middle_names = ["_".join(item) for item in middle_components]
    far_names = ["_".join(item) for item in components]
    middle_records_by_outer = [
        [record for record in records if record["piece"] in ("base", "linear")]
        for records in far_records_by_outer
    ]
    middle_scales = [4 if item[0] == "base" else 2 for item in middle_components]
    far_scales = [1] * len(components)
    peak = [0]
    middle_state = producer.new_row_state("strong_middle_times_4", middle_names, middle_scales)
    far_state = producer.new_row_state("strong_far", far_names, far_scales)
    producer.merge_row_chunk(
        HERE, DATE_TAG, FACE, FACE_TOKEN, DEGREE, EXPONENT,
        "strong_middle_times_4", middle_records_by_outer[EXPONENT], middle_scales,
        middle_state, source_hash, sha256(FORMAL_DEPENDENCY), sha256(STREAM_DEPENDENCY), peak, LIMIT,
    )
    producer.merge_row_chunk(
        HERE, DATE_TAG, FACE, FACE_TOKEN, DEGREE, EXPONENT,
        "strong_far", far_records_by_outer[EXPONENT], far_scales,
        far_state, source_hash, sha256(FORMAL_DEPENDENCY), sha256(STREAM_DEPENDENCY), peak, LIMIT,
    )
    corrected_exp1 = {
        "strong_middle_times_4": middle_state["chunks"][0],
        "strong_far": far_state["chunks"][0],
    }

    completed_rows = []
    replay_stats = {}
    for label, records_by_outer, scales in (
        ("strong_middle_times_4", middle_records_by_outer, middle_scales),
        ("strong_far", far_records_by_outer, far_scales),
    ):
        overall = hashlib.sha256()
        stats = []
        for exponent, records in enumerate(records_by_outer):
            stat = merge_stats(
                records, scales, peak, f"corrected complete digest {label} exp{exponent}", overall
            )
            chosen = (
                corrected_exp1[label]
                if exponent == EXPONENT
                else old_manifests[label]["result"]["chunks"][exponent]
            )
            for key in ("mixed_support_terms", "negative_terms", "minimum", "ordered_coefficient_sha256"):
                assert stat[key] == chosen[key]
            stats.append(stat)
        chosen_chunks = list(old_manifests[label]["result"]["chunks"])
        chosen_chunks[EXPONENT] = corrected_exp1[label]
        path, row_hash, row_payload = row_manifest(
            label, old_manifests[label], chosen_chunks, overall.hexdigest().upper(),
            source_hash, peak, corrected_exp1[label],
        )
        completed_rows.append({
            "family": "strong", "auxiliary": label,
            "manifest": str(path.resolve()), "manifest_sha256": row_hash,
            "mixed_support_terms": row_payload["result"]["mixed_support_terms"],
            "negative_terms": 0,
            "ordered_coefficient_sha256": row_payload["result"]["ordered_coefficient_sha256"],
        })
        replay_stats[label] = stats

    job_payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-atom-stream-literal-corrected-job-agent-v1",
        "status": "PASS_COMPLETE_STRONG_FACE_GRADE_ATOM_STREAM_ROWS",
        "face": list(FACE), "bridge_corner": [2, 0],
        "total_ordinary_slack_degree": DEGREE,
        "expected_rows": ["strong_middle_times_4", "strong_far"],
        "completed_rows": completed_rows, "missing_rows": [],
        "one_atom_live_at_a_time": True,
        "hard_private_memory_limit_bytes": LIMIT,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source_hash,
        "formal_dependency_sha256": sha256(FORMAL_DEPENDENCY),
        "stream_dependency_sha256": sha256(STREAM_DEPENDENCY),
        "quarantined_original_job": {"path": str(OLD_JOB[0]), "sha256": OLD_JOB[1]},
        "failure": {"path": str(FAILURE[0]), "sha256": FAILURE[1]},
        "diagnostic": {"path": str(DIAGNOSTIC[0]), "sha256": DIAGNOSTIC[1]},
        "literal_rerun": {"path": str(LITERAL_RERUN[0]), "sha256": LITERAL_RERUN[1]},
        "corrected_atom_manifest": {"path": str(CORRECTED_ATOM), "sha256": corrected_atom_hash},
        "corrected_exp1_row_chunks": corrected_exp1,
        "full_row_replay_stats": replay_stats,
    }
    print("PASS", OUTPUT_JOB, atomic_json(OUTPUT_JOB, job_payload), flush=True)


if __name__ == "__main__":
    main()
