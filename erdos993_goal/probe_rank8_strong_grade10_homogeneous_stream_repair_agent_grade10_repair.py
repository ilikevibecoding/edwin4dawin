#!/usr/bin/env python3
"""Repaired exact producer for the strong mixed-cross grade-10 slice.

FLINT 3.6.0 / python-flint 0.9.0 deterministically decodes one packed
degrevlex exponent with a spurious 2**5 bit in the first variable when these
large homogeneous polynomials are read term-by-term.  The symbolic expression
is homogeneous of total degree 17 and the BD construction selects exact base
degree 7.  This producer therefore reconstructs the first base exponent from
that exact invariant, verifies the remaining slack degree is exactly 10-b0,
and then streams the corrected native order with constant auxiliary memory.

Every decoded anomaly is recorded together with coefficient lookups at the raw
and invariant-corrected exponent.  Any anomaly not explained by the exact
homogeneity invariant, or any residual non-monotonicity, fails closed.
"""
from __future__ import annotations

import argparse
import gc
import hashlib
import json
import math
from pathlib import Path

from flint import __FLINT_VERSION__, __version__ as PYTHON_FLINT_VERSION
from flint import fmpz_mpoly_ctx

import probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent as core


HERE = Path(__file__).resolve().parent
FAMILY = "strong"
DEGREE = 10
MAXIMUM = 17
TARGET = MAXIMUM - DEGREE
FACES = core.FACES
NAMES = core.NAMES
BASE_COUNT = len(core.BASE)
REPAIR_TAG = "agent_grade10_repair"
FAILURE_CONTEXT: dict = {}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    encoded = (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode()
    temporary = Path(str(path) + ".tmp")
    temporary.write_bytes(encoded)
    temporary.replace(path)
    return hashlib.sha256(encoded).hexdigest().upper()


def term_key(monomial: tuple[int, ...]) -> tuple:
    return -sum(monomial), tuple(reversed(monomial))


class HomogeneousCursor:
    """Constant-memory term cursor with fail-closed invariant reconstruction."""

    def __init__(self, poly, piece: int, outer: int, peak: list[int], limit: int):
        self.poly = poly
        self.piece = piece
        self.outer = outer
        self.peak = peak
        self.limit = limit
        self.index = 0
        self.previous = None
        self.anomaly_count = 0
        self.anomalies = []
        self.off_grade_skipped = 0
        self.native_terms = len(poly)
        self.stream_coefficient_sum = 0
        self.stream_h_equals_2_evaluation = 0

    def advance(self):
        while self.index < self.native_terms:
            index = self.index
            self.index += 1
            raw = tuple(map(int, self.poly.monomial(index)))
            coefficient_reads = [int(self.poly.coefficient(index)) for _ in range(3)]
            assert len(set(coefficient_reads)) == 1
            coefficient = coefficient_reads[0]

            non_h_base = raw[1:BASE_COUNT]
            remaining_slack = raw[BASE_COUNT:]
            assert all(0 <= exponent <= TARGET for exponent in non_h_base), {
                "reason": "raw non-h base exponent outside exact bounds",
                "piece": self.piece, "outer": self.outer, "index": index,
                "raw_monomial": raw,
            }
            assert sum(non_h_base) <= TARGET, {
                "reason": "raw non-h base exponents exceed exact base degree",
                "piece": self.piece, "outer": self.outer, "index": index,
                "raw_monomial": raw,
            }
            assert all(
                0 <= exponent <= DEGREE - self.outer
                for exponent in remaining_slack
            ), {
                "reason": "raw non-h slack exponent outside exact bounds",
                "piece": self.piece, "outer": self.outer, "index": index,
                "raw_monomial": raw,
            }
            assert sum(remaining_slack) == DEGREE - self.outer, {
                "reason": "raw non-h fields violate exact remaining slack grade",
                "piece": self.piece, "outer": self.outer, "index": index,
                "raw_monomial": raw,
            }

            corrected = list(raw)
            expected_h = TARGET - sum(corrected[1:BASE_COUNT])
            assert expected_h >= 0, {
                "reason": "other base exponents exceed exact base degree",
                "piece": self.piece,
                "outer": self.outer,
                "index": index,
                "raw_monomial": raw,
            }
            corrected[0] = expected_h
            corrected = tuple(corrected)

            if raw != corrected:
                self.anomaly_count += 1
                raw_lookups = [int(self.poly[raw]) for _ in range(3)]
                corrected_lookups = [int(self.poly[corrected]) for _ in range(3)]
                assert len(set(raw_lookups)) == 1
                assert len(set(corrected_lookups)) == 1
                raw_lookup = raw_lookups[0]
                corrected_lookup = corrected_lookups[0]
                record = {
                    "piece": self.piece,
                    "outer_exponent": self.outer,
                    "index": index,
                    "raw_monomial": list(raw),
                    "corrected_monomial": list(corrected),
                    "raw_first_exponent_minus_corrected": raw[0] - corrected[0],
                    "indexed_coefficient": coefficient,
                    "coefficient_lookups_at_raw_monomial": raw_lookups,
                    "coefficient_lookups_at_corrected_monomial": corrected_lookups,
                }
                if len(self.anomalies) < 32:
                    self.anomalies.append(record)
                # The independent lookup API must locate the indexed coefficient
                # only at the homogeneity-corrected monomial.  This distinguishes
                # an accessor decode defect from an actually corrupted polynomial.
                assert corrected_lookup == coefficient, record
                assert raw_lookup == 0, record

            assert sum(corrected[:BASE_COUNT]) == TARGET
            assert 0 <= corrected[0] <= TARGET
            assert sum(corrected[BASE_COUNT:]) + self.outer == DEGREE

            self.stream_coefficient_sum += coefficient
            self.stream_h_equals_2_evaluation += coefficient << corrected[0]

            order = term_key(corrected)
            assert self.previous is None or self.previous <= order, {
                "reason": "residual non-monotone order after invariant repair",
                "piece": self.piece,
                "outer": self.outer,
                "index": index,
                "previous": self.previous,
                "next": order,
                "raw_monomial": raw,
                "corrected_monomial": corrected,
            }
            self.previous = order
            if self.index % 100_000 == 0:
                core.guard(
                    f"grade10 repaired cursor piece{self.piece} outer{self.outer} index{self.index}",
                    self.peak, self.limit,
                )
            return order, corrected, coefficient
        return None

    def summary(self) -> dict:
        all_one = (1,) * len(NAMES)
        h_equals_two = (2,) + (1,) * (len(NAMES) - 1)
        direct_coefficient_sum = int(self.poly(*all_one))
        direct_h_equals_2_evaluation = int(self.poly(*h_equals_two))
        assert self.index == self.native_terms
        assert self.stream_coefficient_sum == direct_coefficient_sum
        assert self.stream_h_equals_2_evaluation == direct_h_equals_2_evaluation
        return {
            "piece": self.piece,
            "outer_exponent": self.outer,
            "native_polynomial_terms": self.native_terms,
            "decoded_homogeneity_anomalies": self.anomaly_count,
            "first_decoded_anomalies": self.anomalies,
            "off_requested_multidegree_terms_skipped": self.off_grade_skipped,
            "all_retained_terms_exact_base_degree": TARGET,
            "all_retained_terms_remaining_slack_degree": DEGREE - self.outer,
            "retained_native_order_monotone_after_repair": True,
            "independent_order_insensitive_checks": {
                "retained_term_count": self.index,
                "direct_polynomial_term_count": self.native_terms,
                "stream_coefficient_sum": str(self.stream_coefficient_sum),
                "direct_evaluation_all_variables_1": str(direct_coefficient_sum),
                "stream_h_equals_2_evaluation": str(
                    self.stream_h_equals_2_evaluation
                ),
                "direct_polynomial_evaluation_h_2_others_1": str(
                    direct_h_equals_2_evaluation
                ),
                "all_exact_matches": True,
            },
        }


def labels():
    return core.labels(FAMILY)


def merge(polys, outer: int, complete: dict, peak: list[int], limit: int):
    specs = labels()
    cursors = [
        HomogeneousCursor(poly, piece, outer, peak, limit)
        for piece, poly in enumerate(polys)
    ]
    current = [cursor.advance() for cursor in cursors]
    stats = {
        label: {
            "outer_exponent": outer,
            "mixed_support_terms": 0,
            "negative_terms": 0,
            "minimum": None,
            "first_negative": None,
            "ordered_coefficient_sha256": None,
        }
        for label, _ in specs
    }
    digests = {label: hashlib.sha256() for label, _ in specs}
    raw_union = 0
    previous = None
    while any(item is not None for item in current):
        order = min(item[0] for item in current if item is not None)
        active = [
            index for index, item in enumerate(current)
            if item is not None and item[0] == order
        ]
        monomial = current[active[0]][1]
        coefficients = [0, 0, 0]
        for index in active:
            assert current[index][1] == monomial
            coefficients[index] = current[index][2]
            current[index] = cursors[index].advance()
        assert previous is None or previous <= order
        previous = order
        raw_union += 1

        assert sum(monomial[:BASE_COUNT]) == TARGET
        assert sum(monomial[BASE_COUNT:]) + outer == DEGREE
        if not any(monomial[index] for index in core.GROUP_A):
            continue
        if outer == 0 and not any(monomial[index] for index in core.GROUP_B):
            continue

        full = monomial + (outer,)
        prefix = ",".join(map(str, full)) + ":"
        for label, scales in specs:
            coefficient = sum(
                scale * value for scale, value in zip(scales, coefficients)
            )
            if not coefficient:
                continue
            encoded = (prefix + str(coefficient) + "\n").encode()
            digests[label].update(encoded)
            complete[label].update(encoded)
            stat = stats[label]
            stat["mixed_support_terms"] += 1
            stat["minimum"] = (
                coefficient if stat["minimum"] is None
                else min(stat["minimum"], coefficient)
            )
            if coefficient < 0:
                stat["negative_terms"] += 1
                if stat["first_negative"] is None:
                    stat["first_negative"] = {
                        "monomial": list(full), "coefficient": coefficient,
                    }
        if raw_union % 100_000 == 0:
            print(
                "GRADE10 REPAIRED MERGE OUTER", outer, "RAW", raw_union,
                "PRIVATE", core.private_bytes(), flush=True,
            )
        core.guard(
            f"grade10 repaired merge outer{outer} raw{raw_union}", peak, limit,
        )

    for label in stats:
        stats[label]["ordered_coefficient_sha256"] = (
            digests[label].hexdigest().upper()
        )
        stats[label]["unfiltered_union_terms"] = raw_union
    return stats, [cursor.summary() for cursor in cursors]


def finish(
    output: Path,
    token: str,
    face: tuple[int, int],
    label: str,
    row_stats: list[dict],
    repair_stats: list[list[dict]],
    complete,
    source: str,
    peak: list[int],
    limit: int,
):
    prefix = output / (
        f"rank8_low_low_a23_mixed_cross_face_{token}_{label}_grade_10_"
        f"outer_stream_{REPAIR_TAG}"
    )
    chunks = []
    for stat, repairs in zip(row_stats, repair_stats):
        path = Path(str(prefix) + f"_b0_exp_{stat['outer_exponent']}.json")
        payload = {
            "schema": "rank8-low-low-a23-mixed-cross-multidegree-family-chunk-agent-grade10-repair-v1",
            "status": (
                "PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE"
                if stat["negative_terms"] == 0
                else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
            ),
            "face": list(face),
            "bridge_corner": [2 * face[0], 2 * face[1]],
            "family": FAMILY,
            "auxiliary": label,
            "total_ordinary_slack_degree": DEGREE,
            "exact_base_degree": TARGET,
            "outer_variable": "b0",
            "outer_exponent": stat["outer_exponent"],
            "chunk": stat,
            "stream_repair": repairs,
            "source_sha256": source,
            "canonical_producer_source": {
                "path": Path(core.__file__).name,
                "sha256": sha256(Path(core.__file__)),
            },
        }
        digest = atomic_json(path, payload)
        chunks.append({
            "outer_exponent": stat["outer_exponent"],
            "path": str(path.resolve()),
            "sha256": digest,
            "mixed_support_terms": stat["mixed_support_terms"],
            "negative_terms": stat["negative_terms"],
            "minimum": stat["minimum"],
            "ordered_coefficient_sha256": stat["ordered_coefficient_sha256"],
        })

    total = sum(item["mixed_support_terms"] for item in chunks)
    negatives = sum(item["negative_terms"] for item in chunks)
    manifest = {
        "schema": "rank8-low-low-a23-mixed-cross-multidegree-family-manifest-agent-grade10-repair-v1",
        "status": (
            "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
            if negatives == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "family": FAMILY,
        "auxiliary": label,
        "total_ordinary_slack_degree": DEGREE,
        "exact_base_degree": TARGET,
        "outer_variable": "b0",
        "outer_exponent_range": [0, 2],
        "canonical_scope": {
            "curvature_uses_oriented_left_tail_V": True,
            "strong_margin_uses_full_C": True,
            "strong_derivative_uses_oriented_left_tail_V": True,
            "surviving_pieces": ["base", "linear", "direction"],
            "middle_direction_scale_zero": label.endswith("middle_times_4"),
            "faces_computed_separately": True,
            "exact_homogeneity_stream_repair": True,
        },
        "hard_private_memory_limit_bytes": limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "result": {
            "chunks": chunks,
            "mixed_support_terms": total,
            "negative_terms": negatives,
            "ordered_coefficient_sha256": complete.hexdigest().upper(),
            "piece_names": ["base", "linear", "direction"],
            "piece_scales": [4, 2, 0] if label.endswith("middle_times_4") else [1, 1, 1],
        },
        "source_sha256": source,
    }
    path = Path(str(prefix) + "_manifest.json")
    digest = atomic_json(path, manifest)
    return {
        "face_token": token,
        "face": list(face),
        "auxiliary": label,
        "manifest": str(path.resolve()),
        "manifest_sha256": digest,
        "mixed_support_terms": total,
        "negative_terms": negatives,
        "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
    }


def support_bounds() -> list[int]:
    base_count = math.comb(TARGET + 4, 4)
    values = []
    for outer in range(3):
        slack = DEGREE - outer
        reduced = math.comb(slack + 8, 8) - math.comb(slack + 3, 3)
        if outer == 0:
            reduced -= math.comb(slack + 4, 4)
        values.append(base_count * reduced)
    return values


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-directory", default="_multidegree_grade10_repair_20260827",
    )
    parser.add_argument("--private-limit", type=int, default=10_000_000_000)
    args = parser.parse_args()

    output = Path(args.output_directory).resolve()
    output.mkdir(parents=True, exist_ok=True)
    source = sha256(Path(__file__))
    peak = [0]
    cells = []
    total_anomalies = 0
    total_off_grade = 0
    for token, face in FACES:
        FAILURE_CONTEXT.update(face_token=token, outer_exponent=None)
        context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
        raw, h, capacity, c, v, dc, dv = core.build(
            face, FAMILY, TARGET, context, peak, args.private_limit,
        )
        complete = {label: hashlib.sha256() for label, _ in labels()}
        row_replays = {label: [] for label, _ in labels()}
        repair_replays = []
        for outer in (0, 1, 2):
            FAILURE_CONTEXT["outer_exponent"] = outer
            polys = core.make_pieces(
                FAMILY, raw, h, capacity, c, v, dc, dv, outer, TARGET, peak,
                args.private_limit,
            )
            stats, repairs = merge(
                polys, outer, complete, peak, args.private_limit,
            )
            repair_replays.append(repairs)
            total_anomalies += sum(
                item["decoded_homogeneity_anomalies"] for item in repairs
            )
            total_off_grade += sum(
                item["off_requested_multidegree_terms_skipped"] for item in repairs
            )
            for label, _ in labels():
                row_replays[label].append(stats[label])
                print(
                    "FACE", token, "ROW", label, "OUTER", outer,
                    "TERMS", stats[label]["mixed_support_terms"],
                    "NEG", stats[label]["negative_terms"],
                    "MIN", stats[label]["minimum"], flush=True,
                )
            del polys
            gc.collect()
            core.guard(
                f"grade10 repaired released face{token} outer{outer}",
                peak, args.private_limit,
            )
        for label, _ in labels():
            cells.append(finish(
                output, token, face, label, row_replays[label], repair_replays,
                complete[label], source, peak, args.private_limit,
            ))
        del raw, h, capacity, c, v, dc, dv, context
        gc.collect()
        core.guard(
            f"grade10 repaired released face{token}", peak, args.private_limit,
        )

    passed = len(cells) == 4 and all(item["negative_terms"] == 0 for item in cells)
    bounds = support_bounds()
    job = {
        "schema": "rank8-low-low-a23-mixed-cross-multidegree-family-job-agent-grade10-repair-v1",
        "status": (
            "PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE"
            if passed else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "family": FAMILY,
        "total_ordinary_slack_degree": DEGREE,
        "exact_base_degree": TARGET,
        "completed_cells": cells,
        "canonical_scope": {
            "curvature_uses_oriented_left_tail_V": True,
            "strong_margin_uses_full_C": True,
            "strong_derivative_uses_oriented_left_tail_V": True,
            "surviving_pieces": ["base", "linear", "direction"],
            "middle_scales": [4, 2, 0],
            "far_scales": [1, 1, 1],
            "faces_separate": True,
            "exact_homogeneity_stream_repair": True,
            "constant_auxiliary_memory_term_stream": True,
        },
        "stream_repair_summary": {
            "python_flint_version": PYTHON_FLINT_VERSION,
            "flint_version": __FLINT_VERSION__,
            "decoded_homogeneity_anomalies": total_anomalies,
            "off_requested_multidegree_terms_skipped": total_off_grade,
            "repair_rule": "h = exact_base_degree - sum(other_base_exponents)",
            "residual_nonmonotone_transitions": 0,
        },
        "exact_mixed_support_universe_bound_per_row": {
            "outer_0": bounds[0], "outer_1": bounds[1],
            "outer_2": bounds[2], "total": sum(bounds),
        },
        "hard_private_memory_limit_bytes": args.private_limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source,
        "canonical_producer_source": {
            "path": Path(core.__file__).name,
            "sha256": sha256(Path(core.__file__)),
        },
    }
    path = output / (
        "rank8_low_low_a23_mixed_cross_strong_grade10_multidegree_family_job_"
        f"{REPAIR_TAG}.json"
    )
    digest = atomic_json(path, job)
    print("JOB", path, digest, job["status"], flush=True)
    if not passed:
        raise SystemExit(2)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        path = HERE / (
            "rank8_strong_grade10_homogeneous_stream_repair_failure_"
            f"{REPAIR_TAG}.json"
        )
        atomic_json(path, {
            "schema": "rank8-strong-grade10-homogeneous-stream-repair-failure-v1",
            "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_STOP",
            "exception_type": type(error).__name__,
            "exception": str(error),
            "context": FAILURE_CONTEXT,
            "source_sha256": sha256(Path(__file__)),
        })
        raise
