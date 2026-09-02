#!/usr/bin/env python3
"""Independent face10 grade7 strong audit after one literal atom repair.

The original independent auditor reached outer exponent 1 before detecting the
single quarantined stream mismatch.  This audit pins that fail-closed run and
its exact localization, inherits only the already completed exponent-0 audit,
then independently reconstructs every exponent-1 and exponent-2 formal atom.
Both corrected rows are replayed at those exponents and all three exponents are
merged once more to verify the complete ordered row digests.
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
from pathlib import Path

import audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent as audit
from audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent import (
    DEFAULT_PRIVATE_LIMIT,
    atomic_json,
    build_formal_common,
    private_bytes,
    sha256,
)


HERE = Path(__file__).resolve().parent
FACE_TUPLE = (1, 0)
FACE = [1, 0]
DEGREE = 7
REPAIR_SOURCE_SHA256 = "AD4ECE92ADA937452DAFA93AD1E900F4B2D32B64A2219C743A7A85E9C31E01E2"
ORIGINAL_AUDITOR = (
    HERE / "audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent.py",
    "89E7C481D169ACE01DC101F4B068BF4A117AF502AE2F97870D0E84DDC834DD2A",
)
ORIGINAL_JOB = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_outer_factored_atom_stream_job_agent_20260823.json",
    "C45032D332BEEEC3D6B9E8E41F698805F1278B7BD368753BCC897FBFD7B0CB1F",
)
ORIGINAL_FAILURE = (
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
FAILURE_CONTEXT: dict = {}


def pinned(item: tuple[Path, str]) -> dict | None:
    path, expected = item
    actual = sha256(path)
    assert actual == expected, (str(path), actual, expected)
    if path.suffix == ".json":
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def load_original_chunks() -> dict[str, list[dict]]:
    """Pin the immutable original row chunks used by the exponent-0 audit."""
    job = pinned(ORIGINAL_JOB)
    assert job is not None
    rows = {row["auxiliary"]: row for row in job["completed_rows"]}
    assert list(rows) == ["strong_middle_times_4", "strong_far"]
    result: dict[str, list[dict]] = {}
    for label, row in rows.items():
        manifest_path = Path(row["manifest"]).resolve()
        assert sha256(manifest_path) == row["manifest_sha256"]
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        chunks = []
        for record in manifest["result"]["chunks"]:
            chunk_path = Path(record["path"]).resolve()
            assert sha256(chunk_path) == record["sha256"]
            chunks.append(json.loads(chunk_path.read_text(encoding="utf-8")))
        result[label] = chunks
    return result


def inherited_atom_record(
    manifest_record: dict,
    expected_component: tuple[str, str, str],
) -> dict:
    """Normalize and hash-pin an exponent-0 stream already formally replayed."""
    piece, part, atom = expected_component
    manifest_path = Path(manifest_record["path"]).resolve()
    assert sha256(manifest_path) == manifest_record["sha256"]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["status"] == "PASS_EXACT_STRONG_ATOM_STREAM_COMPLETE"
    assert manifest["face"] == FACE
    assert manifest["total_ordinary_slack_degree"] == DEGREE
    assert manifest["outer_exponent"] == 0
    assert (manifest["piece"], manifest["part"], manifest["atom"]) == expected_component
    stream_path = Path(manifest["coefficient_stream"]).resolve()
    assert sha256(stream_path) == manifest["coefficient_stream_sha256"]
    return {
        "piece": piece,
        "part": part,
        "atom": atom,
        "component": f"{piece}_{part}_{atom}",
        "outer_exponent": 0,
        "manifest": str(manifest_path),
        "manifest_sha256": manifest_record["sha256"],
        "stream": str(stream_path),
        "stream_sha256": manifest["coefficient_stream_sha256"],
        "unfiltered_atom_terms": manifest["unfiltered_atom_terms"],
        "mixed_support_atom_terms": manifest["mixed_support_atom_terms"],
        "exact_coefficient_stream_match": True,
        "audit_mode": "inherited_from_sequentially_completed_original_exponent_0",
    }


def replay_row_chunk_and_update_complete(
    records: list[dict],
    scales: list[int],
    expected_chunk: dict,
    complete: hashlib._Hash,
    peak: list[int],
    limit: int,
    stage: str,
) -> dict:
    """Replay one row chunk and append its exact lines to the full-row hash."""
    cursors = [audit.Cursor(record, scale) for record, scale in zip(records, scales)]
    current = [cursor.advance() for cursor in cursors]
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    try:
        while any(item is not None for item in current):
            smallest = min(item[0] for item in current if item is not None)
            active = [
                index for index, item in enumerate(current)
                if item is not None and item[0] == smallest
            ]
            monomial = current[active[0]][1]
            coefficient = 0
            for index in active:
                assert current[index][1] == monomial
                coefficient += current[index][2]
                current[index] = cursors[index].advance()
            if coefficient == 0:
                continue
            encoded = (",".join(map(str, monomial)) + ":" + str(coefficient) + "\n").encode()
            digest.update(encoded)
            complete.update(encoded)
            terms += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {"monomial": list(monomial), "coefficient": coefficient}
            if terms % 100_000 == 0:
                audit.guard(stage, peak, limit)
    finally:
        for cursor in cursors:
            cursor.close()
    replay = {
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
    }
    for key, value in replay.items():
        assert expected_chunk["chunk"][key] == value
    return replay


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strong-job", required=True)
    parser.add_argument("--expected-strong-job-sha256", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--hard-private-limit-bytes", type=int, default=DEFAULT_PRIVATE_LIMIT)
    args = parser.parse_args()
    peak = [0]
    output = Path(args.output).resolve()
    FAILURE_CONTEXT.update({
        "output": output,
        "peak": peak,
        "stage": "pinning correction provenance",
    })

    pinned(ORIGINAL_AUDITOR)
    failure = pinned(ORIGINAL_FAILURE)
    diagnostic = pinned(DIAGNOSTIC)
    literal = pinned(LITERAL_RERUN)
    assert failure is not None and diagnostic is not None and literal is not None
    assert failure["status"] == "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD"
    assert failure["source_sha256"] == ORIGINAL_AUDITOR[1]
    assert diagnostic["status"] == "DIAGNOSED_BOTH_LITERAL_REBUILDS_VS_SAVED_STREAM_MISMATCH"
    assert diagnostic["outer_exponent"] == 1
    assert diagnostic["target"] == {
        "piece": "base", "part": "derivative", "atom": "twice_c8_v8",
    }
    assert diagnostic["formal_auditor_source_sha256"] == ORIGINAL_AUDITOR[1]
    assert literal["status"] == "PASS_BOUNDED_AFFECTED_ATOM_LITERAL_FORMAL_RERUN_AND_SPLIT_REBUILD_EXACT_MATCH"

    job_path = Path(args.strong_job).resolve()
    expected_job_hash = args.expected_strong_job_sha256.upper()
    assert sha256(job_path) == expected_job_hash
    job = json.loads(job_path.read_text(encoding="utf-8"))
    assert job["status"] == "PASS_COMPLETE_STRONG_FACE_GRADE_ATOM_STREAM_ROWS"
    assert job["face"] == FACE and job["total_ordinary_slack_degree"] == DEGREE
    assert job["source_sha256"] == REPAIR_SOURCE_SHA256
    assert job["quarantined_original_job"]["sha256"] == ORIGINAL_JOB[1]
    assert job["failure"]["sha256"] == ORIGINAL_FAILURE[1]
    assert job["diagnostic"]["sha256"] == DIAGNOSTIC[1]
    assert job["literal_rerun"]["sha256"] == LITERAL_RERUN[1]
    rows = {row["auxiliary"]: row for row in job["completed_rows"]}
    assert list(rows) == ["strong_middle_times_4", "strong_far"]
    middle_manifest, middle_chunks = audit.load_row(rows["strong_middle_times_4"], FACE, DEGREE)
    far_manifest, far_chunks = audit.load_row(rows["strong_far"], FACE, DEGREE)
    original_chunks = load_original_chunks()
    for label, corrected_chunks in (
        ("strong_middle_times_4", middle_chunks),
        ("strong_far", far_chunks),
    ):
        # The repair is deliberately confined to exponent 1.  Exponents 0 and
        # 2 must remain byte-for-byte identical to the immutable original rows.
        assert corrected_chunks[0] == original_chunks[label][0]
        assert corrected_chunks[2] == original_chunks[label][2]

    common = build_formal_common(FACE_TUPLE, DEGREE, peak, args.hard_private_limit_bytes)
    expected_components = audit.components_for_degree(DEGREE)
    assert len(expected_components) == 42
    audited_by_outer = []
    row_replays = {"strong_middle_times_4": [], "strong_far": []}
    complete = {
        "strong_middle_times_4": hashlib.sha256(),
        "strong_far": hashlib.sha256(),
    }

    # The original auditor loops exponents in order and performs both row
    # replays before entering the next exponent.  The pinned mismatch is at
    # exponent 1, so only exponent 0 is inherited from that prior run.
    exp0_records = far_chunks[0]["atom_stream_manifests"]
    assert len(exp0_records) == len(expected_components)
    inherited = [
        inherited_atom_record(record, expected)
        for expected, record in zip(expected_components, exp0_records)
    ]
    audited_by_outer.append({
        "outer_exponent": 0,
        "audit_mode": "inherited_prior_sequential_pass",
        "components": inherited,
    })
    inherited_middle = [record for record in inherited if record["piece"] in ("base", "linear")]
    inherited_middle_scales = [4 if record["piece"] == "base" else 2 for record in inherited_middle]
    for label, records, scales, chunk in (
        ("strong_middle_times_4", inherited_middle, inherited_middle_scales, middle_chunks[0]),
        ("strong_far", inherited, [1] * len(inherited), far_chunks[0]),
    ):
        FAILURE_CONTEXT["stage"] = f"fresh inherited-formal row replay exponent 0 {label}"
        replay = replay_row_chunk_and_update_complete(
            records, scales, chunk, complete[label], peak,
            args.hard_private_limit_bytes, FAILURE_CONTEXT["stage"],
        )
        replay["audit_mode"] = "fresh_row_merge_from_prior_formally_audited_atom_streams"
        row_replays[label].append(replay)
        print("ROW_REPLAY", 0, label, replay["mixed_support_terms"], replay["negative_terms"], flush=True)

    for exponent in (1, 2):
        producer_records = far_chunks[exponent]["atom_stream_manifests"]
        assert len(producer_records) == len(expected_components)
        audited = []
        for (piece, part, atom), manifest_record in zip(expected_components, producer_records):
            FAILURE_CONTEXT["stage"] = f"formal atom {piece}/{part}/{atom} exponent {exponent}"
            polynomial = audit.construct_atom(
                common, piece, part, atom, DEGREE, exponent,
                peak, args.hard_private_limit_bytes,
            )
            audited.append(audit.audit_atom_stream(
                polynomial, manifest_record, FACE, DEGREE, exponent,
                piece, part, atom, peak, args.hard_private_limit_bytes,
            ))
            print(
                "AUDITED", exponent, piece, part, atom,
                audited[-1]["mixed_support_atom_terms"],
                flush=True,
            )
            del polynomial
            gc.collect()
            audit.guard(
                f"corrected formal atom {piece} {part} {atom} outer {exponent} released",
                peak, args.hard_private_limit_bytes,
            )
        audited_by_outer.append({
            "outer_exponent": exponent,
            "audit_mode": "fresh_independent_formal_reconstruction",
            "components": audited,
        })
        middle_records = [record for record in audited if record["piece"] in ("base", "linear")]
        middle_scales = [4 if record["piece"] == "base" else 2 for record in middle_records]
        FAILURE_CONTEXT["stage"] = f"middle row replay exponent {exponent}"
        row_replays["strong_middle_times_4"].append(replay_row_chunk_and_update_complete(
            middle_records, middle_scales, middle_chunks[exponent],
            complete["strong_middle_times_4"], peak, args.hard_private_limit_bytes,
            FAILURE_CONTEXT["stage"],
        ))
        print(
            "ROW_REPLAY", exponent, "strong_middle_times_4",
            row_replays["strong_middle_times_4"][-1]["mixed_support_terms"],
            row_replays["strong_middle_times_4"][-1]["negative_terms"],
            flush=True,
        )
        FAILURE_CONTEXT["stage"] = f"far row replay exponent {exponent}"
        row_replays["strong_far"].append(replay_row_chunk_and_update_complete(
            audited, [1] * len(audited), far_chunks[exponent],
            complete["strong_far"], peak, args.hard_private_limit_bytes,
            FAILURE_CONTEXT["stage"],
        ))
        print(
            "ROW_REPLAY", exponent, "strong_far",
            row_replays["strong_far"][-1]["mixed_support_terms"],
            row_replays["strong_far"][-1]["negative_terms"],
            flush=True,
        )

    FAILURE_CONTEXT["stage"] = "complete corrected row digests"
    for label, manifest in (
        ("strong_middle_times_4", middle_manifest),
        ("strong_far", far_manifest),
    ):
        assert complete[label].hexdigest().upper() == manifest["result"]["ordered_coefficient_sha256"]
        assert sum(item["mixed_support_terms"] for item in row_replays[label]) == manifest["result"]["mixed_support_terms"]
        assert sum(item["negative_terms"] for item in row_replays[label]) == manifest["result"]["negative_terms"] == 0

    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-exp1-literal-corrected-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_STRONG_ROW_REPLAY",
        "face": FACE,
        "bridge_corner": [2, 0],
        "total_ordinary_slack_degree": DEGREE,
        "strong_job": str(job_path),
        "strong_job_sha256": expected_job_hash,
        "atom_stream_audit": audited_by_outer,
        "row_replays": row_replays,
        "replayed_negative_terms": {
            label: sum(item["negative_terms"] for item in replays)
            for label, replays in row_replays.items()
        },
        "audit_scope": {
            "outer_exponent_0": "inherited from pinned prior sequential independent audit before localized exponent-1 failure",
            "outer_exponents_1_and_2": "fresh independent formal reconstruction of every atom and both row merges",
            "complete_rows": "fresh three-exponent ordered digest accumulated during one independent replay of every row chunk",
        },
        "correction_provenance": {
            "original_auditor": {"path": str(ORIGINAL_AUDITOR[0]), "sha256": ORIGINAL_AUDITOR[1]},
            "original_job": {"path": str(ORIGINAL_JOB[0]), "sha256": ORIGINAL_JOB[1]},
            "original_failure": {"path": str(ORIGINAL_FAILURE[0]), "sha256": ORIGINAL_FAILURE[1]},
            "diagnostic": {"path": str(DIAGNOSTIC[0]), "sha256": DIAGNOSTIC[1]},
            "literal_rerun": {"path": str(LITERAL_RERUN[0]), "sha256": LITERAL_RERUN[1]},
            "repair_source_sha256": REPAIR_SOURCE_SHA256,
        },
        "imports_producer": False,
        "one_formal_atom_live_at_a_time": True,
        "hard_private_memory_limit_bytes": args.hard_private_limit_bytes,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
        "formal_dependency_sha256": sha256(HERE / audit.FORMAL_DEPENDENCY),
        "merge_dependency_sha256": sha256(HERE / audit.MERGE_DEPENDENCY),
        "producer_source_sha256_from_job": job["source_sha256"],
    }
    FAILURE_CONTEXT["stage"] = "atomic report write"
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        if FAILURE_CONTEXT:
            requested = FAILURE_CONTEXT["output"]
            current = private_bytes()
            atomic_json(requested.with_suffix(requested.suffix + ".failure.json"), {
                "schema": "rank8-low-low-a23-mixed-cross-strong-exp1-literal-corrected-independent-audit-agent-v1",
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
                "face": FACE,
                "total_ordinary_slack_degree": DEGREE,
                "stage": FAILURE_CONTEXT.get("stage"),
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": current,
                "observed_peak_private_bytes_at_checkpoints": max(FAILURE_CONTEXT["peak"][0], current),
                "source_sha256": sha256(Path(__file__)),
            })
        raise
