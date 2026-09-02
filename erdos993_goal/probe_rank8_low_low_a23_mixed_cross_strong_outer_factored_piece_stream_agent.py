#!/usr/bin/env python3
"""Low-memory strong-row producer using durable one-piece coefficient streams.

For each b0 exponent, each base/linear/direction piece is split into its three
exact summands (capacity-grade-zero margin, capacity-grade-one margin, and
derivative term).  One summand at a time is written as a deterministic gzip
coefficient stream and released.  The two strong rows are then exact merged
from those streams.  Common state plus more than one output summand never
coexist.
"""

from __future__ import annotations

import argparse
import gc
import gzip
import hashlib
import heapq
import json
import os
from pathlib import Path

from probe_rank8_low_low_a23_mixed_cross_truncated_agent import (
    BASE_NAMES,
    GROUP_A,
    GROUP_B,
    SLACK_NAMES,
)
from probe_rank8_low_low_a23_mixed_cross_face_grade_outer_factored_agent import (
    DEFAULT_PRIVATE_LIMIT,
    REDUCED_NAMES,
    atomic_json,
    build_split_common,
    guard,
    outer_cross,
    outer_curvature,
    outer_derivative,
    outer_derivative_cross,
    private_bytes,
    sha256,
)


DEPENDENCY = "probe_rank8_low_low_a23_mixed_cross_face_grade_outer_factored_agent.py"
FULL_NAMES = BASE_NAMES + SLACK_NAMES
FAILURE_CONTEXT: dict = {}


def piece_names_for_degree(degree: int) -> list[str]:
    names = ["base"]
    if degree <= 16:
        names.append("linear")
    if degree <= 15:
        names.append("direction")
    return names


def construct_subpiece(
    common: dict,
    name: str,
    part: str,
    degree: int,
    exponent: int,
    peak: list[int],
    limit: int,
):
    zero, h = common["zero_raw"], common["raw"]["h"]
    capacity = common["capacity"]
    c0, c1 = common["base_c"], common["direction_c"]
    v0, v1 = common["base_v"], common["direction_v"]
    assert part in ("margin_degree_d", "margin_degree_d_minus_1", "derivative")
    if name == "base":
        if part == "margin_degree_d":
            piece = capacity.c[0] * outer_curvature(c0, degree, exponent, zero, h)
        elif part == "margin_degree_d_minus_1":
            piece = capacity.c[1] * outer_curvature(c0, degree - 1, exponent, zero, h)
        else:
            piece = h * outer_derivative(c0, v0, degree, exponent, zero, h)
    elif name == "linear":
        assert degree <= 16
        if part == "margin_degree_d":
            piece = capacity.c[0] * outer_cross(c0, c1, degree, exponent, zero, h)
        elif part == "margin_degree_d_minus_1":
            piece = capacity.c[1] * outer_cross(c0, c1, degree - 1, exponent, zero, h)
        else:
            piece = h * outer_derivative_cross(
                c0, c1, v0, v1, degree, exponent, zero, h
            )
    else:
        assert name == "direction" and degree <= 15
        if part == "margin_degree_d":
            piece = capacity.c[0] * outer_curvature(c1, degree, exponent, zero, h)
        elif part == "margin_degree_d_minus_1":
            piece = capacity.c[1] * outer_curvature(c1, degree - 1, exponent, zero, h)
        else:
            piece = h * outer_derivative(c1, v1, degree, exponent, zero, h)
    guard(f"strong {name} {part} outer {exponent}", peak, limit)
    return piece


def stream_piece(
    output_dir: Path,
    date_tag: str,
    face: tuple[int, int],
    face_token: str,
    degree: int,
    exponent: int,
    name: str,
    part: str,
    polynomial,
    source_hash: str,
    dependency_hash: str,
    peak: list[int],
    limit: int,
) -> dict:
    indices = {item: REDUCED_NAMES.index(item) for item in REDUCED_NAMES}
    group_a = tuple(indices[item] for item in GROUP_A)
    group_b_without_outer = tuple(indices[item] for item in GROUP_B if item != "b0")
    prefix = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_strong_{name}_{part}_grade_{degree}_"
        f"b0_exp_{exponent}_piece_stream_agent_{date_tag}"
    )
    stream_path = Path(str(prefix) + ".txt.gz")
    temporary = stream_path.with_suffix(stream_path.suffix + ".tmp")
    ordered = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    previous = None
    with temporary.open("wb") as raw_file:
        with gzip.GzipFile(
            filename="", fileobj=raw_file, mode="wb", compresslevel=1, mtime=0
        ) as compressed:
            # Indexed traversal is essential: polynomial.terms() would first
            # materialize millions of Python tuples and defeat the memory
            # bound before streaming begins.
            for term_index in range(len(polynomial)):
                reduced = tuple(map(int, polynomial.monomial(term_index)))
                key = (-sum(reduced), tuple(reversed(reduced)))
                if previous is not None:
                    assert previous <= key
                previous = key
                if not any(reduced[index] for index in group_a):
                    continue
                if exponent == 0 and not any(
                    reduced[index] for index in group_b_without_outer
                ):
                    continue
                assert sum(reduced[len(BASE_NAMES):]) + exponent == degree
                coefficient = int(polynomial.coefficient(term_index))
                full = reduced + (exponent,)
                encoded = (
                    ",".join(map(str, full)) + ":" + str(coefficient) + "\n"
                ).encode()
                compressed.write(encoded)
                ordered.update(encoded)
                terms += 1
                minimum = coefficient if minimum is None else min(minimum, coefficient)
                if coefficient < 0:
                    negative += 1
                    if first_negative is None:
                        first_negative = {
                            "monomial": list(full), "coefficient": coefficient
                        }
                if terms % 100_000 == 0:
                    guard(f"write {name} outer {exponent} term {terms}", peak, limit)
    os.replace(temporary, stream_path)
    stream_hash = sha256(stream_path)
    manifest_path = Path(str(prefix) + "_manifest.json")
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-piece-coefficient-stream-agent-v1",
        "status": "PASS_EXACT_STRONG_PIECE_STREAM_COMPLETE",
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "total_ordinary_slack_degree": degree,
        "outer_variable": "b0",
        "outer_exponent": exponent,
        "piece": name,
        "subpiece": part,
        "unfiltered_piece_terms": len(polynomial),
        "mixed_support_piece_terms": terms,
        "negative_piece_terms": negative,
        "minimum_piece_coefficient": minimum,
        "first_negative_piece_coefficient": first_negative,
        "ordered_piece_coefficient_sha256": ordered.hexdigest().upper(),
        "coefficient_stream": str(stream_path.resolve()),
        "coefficient_stream_sha256": stream_hash,
        "coefficient_stream_encoding": "deterministic-gzip-mtime0-lines-full-exponents-colon-integer",
        "hard_private_memory_limit_bytes": limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source_hash,
        "factored_dependency_sha256": dependency_hash,
    }
    manifest_hash = atomic_json(manifest_path, payload)
    print(
        "SUBPIECE", name, part, "OUTER", exponent, "TERMS", terms,
        "MANIFEST", manifest_hash, flush=True,
    )
    return {
        "piece": name,
        "subpiece": part,
        "component": f"{name}_{part}",
        "outer_exponent": exponent,
        "manifest": str(manifest_path.resolve()),
        "manifest_sha256": manifest_hash,
        "stream": str(stream_path.resolve()),
        "stream_sha256": stream_hash,
        "unfiltered_piece_terms": len(polynomial),
        "mixed_support_piece_terms": terms,
        "ordered_piece_coefficient_sha256": ordered.hexdigest().upper(),
    }


class StreamCursor:
    def __init__(self, record: dict, scale: int):
        path = Path(record["stream"])
        assert sha256(path) == record["stream_sha256"]
        self.raw = path.open("rb")
        self.gz = gzip.GzipFile(fileobj=self.raw, mode="rb")
        self.scale = scale
        self.previous = None

    def close(self) -> None:
        self.gz.close()
        self.raw.close()

    def advance(self):
        line = self.gz.readline()
        if not line:
            return None
        exponents, coefficient = line.rstrip(b"\n").rsplit(b":", 1)
        monomial = tuple(map(int, exponents.split(b",")))
        key = (-sum(monomial), tuple(reversed(monomial)))
        if self.previous is not None:
            assert self.previous <= key
        self.previous = key
        return key, monomial, self.scale * int(coefficient)


def new_row_state(label: str, piece_names: list[str], scales: list[int]) -> dict:
    return {
        "label": label,
        "piece_names": piece_names,
        "piece_scales": scales,
        "piece_lengths": [0] * len(piece_names),
        "piece_raw_terms_visited": [0] * len(piece_names),
        "piece_mixed_terms_visited": [0] * len(piece_names),
        "chunks": [],
        "terms": 0,
        "negative": 0,
        "overall": hashlib.sha256(),
    }


def merge_row_chunk(
    output_dir: Path,
    date_tag: str,
    face: tuple[int, int],
    face_token: str,
    degree: int,
    exponent: int,
    label: str,
    records: list[dict],
    scales: list[int],
    state: dict,
    source_hash: str,
    dependency_hash: str,
    peak: list[int],
    limit: int,
) -> None:
    cursors = [StreamCursor(record, scale) for record, scale in zip(records, scales)]
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
            combined = coefficient
            consumed = [index]
            while heap and heap[0][0] == key:
                _, other, other_monomial, other_coefficient = heapq.heappop(heap)
                assert other_monomial == monomial
                combined += other_coefficient
                consumed.append(other)
            for item_index in consumed:
                item = cursors[item_index].advance()
                if item is not None:
                    next_key, next_monomial, next_coefficient = item
                    heapq.heappush(
                        heap, (next_key, item_index, next_monomial, next_coefficient)
                    )
            if combined == 0:
                continue
            encoded = (
                ",".join(map(str, monomial)) + ":" + str(combined) + "\n"
            ).encode()
            digest.update(encoded)
            state["overall"].update(encoded)
            terms += 1
            minimum = combined if minimum is None else min(minimum, combined)
            if combined < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {
                        "monomial": list(monomial), "coefficient": combined
                    }
            if terms % 100_000 == 0:
                guard(f"merge {label} outer {exponent} term {terms}", peak, limit)
    finally:
        for cursor in cursors:
            cursor.close()
    stat = {
        "outer_exponent": exponent,
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
    }
    prefix = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_{label}_grade_{degree}_"
        f"outer_factored_piece_stream_agent_{date_tag}"
    )
    chunk_path = Path(str(prefix) + f"_b0_exp_{exponent}.json")
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-piece-stream-row-chunk-agent-v1",
        "status": (
            "PASS_EXACT_STRONG_PIECE_STREAM_ROW_CHUNK_NONNEGATIVE"
            if negative == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "family": "strong",
        "auxiliary": label,
        "total_ordinary_slack_degree": degree,
        "outer_variable": "b0",
        "outer_exponent": exponent,
        "outer_support_bound": [0, 2],
        "variables": list(FULL_NAMES),
        "group_A": list(GROUP_A),
        "group_B": list(GROUP_B),
        "piece_scales": dict(zip(state["piece_names"], scales)),
        "piece_stream_manifests": [
            {"path": record["manifest"], "sha256": record["manifest_sha256"]}
            for record in records
        ],
        "chunk": stat,
        "global_row_assembly": False,
        "source_sha256": source_hash,
        "factored_dependency_sha256": dependency_hash,
    }
    chunk_hash = atomic_json(chunk_path, payload)
    state["chunks"].append({
        "outer_exponent": exponent,
        "path": str(chunk_path.resolve()),
        "sha256": chunk_hash,
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "ordered_coefficient_sha256": stat["ordered_coefficient_sha256"],
    })
    state["terms"] += terms
    state["negative"] += negative
    for index, record in enumerate(records):
        state["piece_lengths"][index] += record["unfiltered_piece_terms"]
        state["piece_raw_terms_visited"][index] += record["unfiltered_piece_terms"]
        state["piece_mixed_terms_visited"][index] += record[
            "mixed_support_piece_terms"
        ]
    print(label, "CHUNK", exponent, "TERMS", terms, "NEGATIVE", negative, flush=True)


def finish_row_manifest(
    output_dir: Path,
    date_tag: str,
    face: tuple[int, int],
    face_token: str,
    degree: int,
    state: dict,
    source_hash: str,
    dependency_hash: str,
    peak: list[int],
    limit: int,
) -> dict:
    label = state["label"]
    prefix = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_{label}_grade_{degree}_"
        f"outer_factored_piece_stream_agent_{date_tag}"
    )
    path = Path(str(prefix) + "_manifest.json")
    result = {
        "chunks": state["chunks"],
        "mixed_support_terms": state["terms"],
        "negative_terms": state["negative"],
        "ordered_coefficient_sha256": state["overall"].hexdigest().upper(),
        "piece_names": state["piece_names"],
        "piece_scales": state["piece_scales"],
        "piece_lengths": state["piece_lengths"],
        "piece_raw_terms_visited": state["piece_raw_terms_visited"],
        "piece_mixed_terms_visited": state["piece_mixed_terms_visited"],
    }
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-piece-stream-row-manifest-agent-v1",
        "status": (
            "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_FACTORED_PIECE_STREAM_CHUNKS_NONNEGATIVE"
            if state["negative"] == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "family": "strong",
        "auxiliary": label,
        "total_ordinary_slack_degree": degree,
        "outer_variable": "b0",
        "outer_exponent_range": [0, 2],
        "global_row_assembly": False,
        "one_piece_live_at_a_time": True,
        "hard_private_memory_limit_bytes": limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "result": result,
        "source_sha256": source_hash,
        "factored_dependency_sha256": dependency_hash,
    }
    manifest_hash = atomic_json(path, payload)
    print(label, "MANIFEST", manifest_hash, flush=True)
    return {
        "family": "strong",
        "auxiliary": label,
        "manifest": str(path.resolve()),
        "manifest_sha256": manifest_hash,
        "mixed_support_terms": state["terms"],
        "negative_terms": state["negative"],
        "ordered_coefficient_sha256": result["ordered_coefficient_sha256"],
    }


def update_job(
    path: Path,
    face: tuple[int, int],
    degree: int,
    completed: list[dict],
    source_hash: str,
    dependency_hash: str,
    peak: list[int],
    limit: int,
    final: bool = False,
) -> str:
    labels = ["strong_middle_times_4", "strong_far"]
    done = [item["auxiliary"] for item in completed]
    missing = [label for label in labels if label not in done]
    return atomic_json(path, {
        "schema": "rank8-low-low-a23-mixed-cross-strong-piece-stream-job-agent-v1",
        "status": (
            "PASS_COMPLETE_STRONG_FACE_GRADE_PIECE_STREAM_ROWS"
            if final and not missing and all(item["negative_terms"] == 0 for item in completed)
            else "CHECKPOINT_INCOMPLETE_STRONG_FACE_GRADE_PIECE_STREAM"
        ),
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "total_ordinary_slack_degree": degree,
        "expected_rows": labels,
        "completed_rows": completed,
        "missing_rows": missing,
        "one_piece_live_at_a_time": True,
        "hard_private_memory_limit_bytes": limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source_hash,
        "factored_dependency_sha256": dependency_hash,
    })


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--output-directory", default=".")
    parser.add_argument("--date-tag", default="20260823")
    parser.add_argument("--hard-private-limit-bytes", type=int, default=DEFAULT_PRIVATE_LIMIT)
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    face_token = args.face.replace(",", "")
    output_dir = Path(args.output_directory).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    here = Path(__file__).resolve().parent
    source_hash = sha256(Path(__file__))
    dependency_hash = sha256(here / DEPENDENCY)
    peak = [0]
    job_path = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_strong_grade_{args.degree}_"
        f"outer_factored_piece_stream_job_agent_{args.date_tag}.json"
    )
    FAILURE_CONTEXT.update({
        "job": job_path, "face": face, "degree": args.degree,
        "peak": peak, "limit": args.hard_private_limit_bytes,
        "source": source_hash, "dependency": dependency_hash,
    })
    completed = []
    update_job(
        job_path, face, args.degree, completed, source_hash, dependency_hash,
        peak, args.hard_private_limit_bytes,
    )
    common = build_split_common(
        face, args.degree, peak, args.hard_private_limit_bytes
    )
    names = piece_names_for_degree(args.degree)
    parts = ("margin_degree_d", "margin_degree_d_minus_1", "derivative")
    components = [(name, part) for name in names for part in parts]
    middle_components = [
        (name, part) for name, part in components if name in ("base", "linear")
    ]
    states = {
        "strong_middle_times_4": new_row_state(
            "strong_middle_times_4",
            [f"{name}_{part}" for name, part in middle_components],
            [4 if name == "base" else 2 for name, _ in middle_components],
        ),
        "strong_far": new_row_state(
            "strong_far",
            [f"{name}_{part}" for name, part in components],
            [1] * len(components),
        ),
    }
    for exponent in range(3):
        records = []
        for name, part in components:
            piece = construct_subpiece(
                common, name, part, args.degree, exponent, peak,
                args.hard_private_limit_bytes,
            )
            records.append(stream_piece(
                output_dir, args.date_tag, face, face_token, args.degree,
                exponent, name, part, piece, source_hash, dependency_hash,
                peak, args.hard_private_limit_bytes,
            ))
            del piece
            gc.collect()
            guard(
                f"strong {name} {part} outer {exponent} released",
                peak, args.hard_private_limit_bytes,
            )
        middle_records = [record for record in records if record["piece"] in ("base", "linear")]
        middle_scales = [4 if record["piece"] == "base" else 2 for record in middle_records]
        merge_row_chunk(
            output_dir, args.date_tag, face, face_token, args.degree, exponent,
            "strong_middle_times_4", middle_records, middle_scales,
            states["strong_middle_times_4"], source_hash, dependency_hash,
            peak, args.hard_private_limit_bytes,
        )
        merge_row_chunk(
            output_dir, args.date_tag, face, face_token, args.degree, exponent,
            "strong_far", records, [1] * len(records), states["strong_far"],
            source_hash, dependency_hash, peak, args.hard_private_limit_bytes,
        )
    for label in ("strong_middle_times_4", "strong_far"):
        completed.append(finish_row_manifest(
            output_dir, args.date_tag, face, face_token, args.degree,
            states[label], source_hash, dependency_hash, peak,
            args.hard_private_limit_bytes,
        ))
        update_job(
            job_path, face, args.degree, completed, source_hash, dependency_hash,
            peak, args.hard_private_limit_bytes,
        )
    job_hash = update_job(
        job_path, face, args.degree, completed, source_hash, dependency_hash,
        peak, args.hard_private_limit_bytes, final=True,
    )
    print("JOB", job_path, job_hash, flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        if FAILURE_CONTEXT:
            path = FAILURE_CONTEXT["job"]
            prior = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
            current = private_bytes()
            atomic_json(path, {
                **prior,
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": current,
                "observed_peak_private_bytes_at_checkpoints": max(
                    FAILURE_CONTEXT["peak"][0], current
                ),
            })
        raise
