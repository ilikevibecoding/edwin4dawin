#!/usr/bin/env python3
"""Bounded exact producer for distinct curvature grade-14 mixed faces.

The canonical oriented left-tail convolution V is expanded through base
degree two and b0 degree two.  At slack grade 14 all curvature pieces
(base, linear, direction) survive.  The two faces are computed sequentially,
and the three pieces are ordered-merged without materializing a completed row.
"""
from __future__ import annotations

import argparse
import gc
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_a23_mixed_cross_curvature_grade15_tail_v_piece_merge_agent import (
    atomic_json,
    guard,
    key,
    private_bytes,
    sha256,
)

HERE = Path(__file__).resolve().parent
DEPENDENCY = (
    "probe_rank8_low_low_a23_mixed_cross_curvature_grade15_tail_v_piece_merge_agent.py",
    "D408E1A73F202934652BDC19C830AD3C6BC3D826E79080F4B5798DDF448261E4",
)
CANONICAL = (
    "probe_rank8_low_low_a23_mixed_cross_face_grade_outer_stream_agent.py",
    "BF0F79B2A7C1F35FBBFD350601421914C71648557BF1B6E41E38F3C1C75077DC",
)
BASE = ("h", "ta", "tb", "P", "Q")
REDUCED = ("a0", "b4", "b5", "b6", "b7", "a4", "a5", "a6", "a7")
NAMES = BASE + REDUCED
FULL = NAMES + ("b0",)
GROUP_A = tuple(NAMES.index(name) for name in REDUCED[:5])
GROUP_B = tuple(NAMES.index(name) for name in REDUCED[5:])
FACES = (("01", (0, 1)), ("10", (1, 0)))
LABELS = (
    ("curvature_middle_times_4", (4, 2, 0)),
    ("curvature_far", (1, 1, 1)),
)
DEGREE = 14
LIMIT = 475_000_000
FAILURE_CONTEXT = {}


class SO:
    """Polynomial truncated to base degree zero, one, and two."""

    __slots__ = ("z", "o", "t")

    def __init__(self, zero, one, two):
        self.z = zero
        self.o = one
        self.t = two

    def __add__(self, other):
        if not isinstance(other, SO):
            zero = self.z.context().constant(0)
            other = SO(other, zero, zero)
        return SO(self.z + other.z, self.o + other.o, self.t + other.t)

    __radd__ = __add__

    def __neg__(self):
        return SO(-self.z, -self.o, -self.t)

    def __sub__(self, other):
        return self + (-other)

    def __mul__(self, other):
        if not isinstance(other, SO):
            return SO(self.z * other, self.o * other, self.t * other)
        return SO(
            self.z * other.z,
            self.z * other.o + self.o * other.z,
            self.z * other.t + self.o * other.o + self.t * other.z,
        )

    __rmul__ = __mul__


def pair_add(left, right):
    return (left[0] + right[0], left[1] + right[1])


def is_zero(item):
    return not item.z and not item.o and not item.t


def pair_mul(left, right):
    assert is_zero(left[1]) or is_zero(right[1])
    return (left[0] * right[0], left[0] * right[1] + left[1] * right[0])


def zero_pair(zero):
    item = SO(zero, zero, zero)
    return (item, item)


def build(face, context, peak, limit):
    raw = dict(zip(NAMES, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    base = {name: SO(zero, raw[name], zero) for name in BASE}
    slack = {name: SO(raw[name], zero, zero) for name in REDUCED}
    h, ta, tb, p, q = (base[name] for name in BASE)
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q

    left_gaps = [
        2 * h + slack["a0"], h, h + a2, h + a3,
        h + slack["a4"], h + slack["a5"],
        h + slack["a6"], h + slack["a7"],
    ]
    left_ratios = [None] * 9
    left_ratios[8] = ta
    for index in range(7, -1, -1):
        left_ratios[index] = left_ratios[index + 1] + left_gaps[index]
    left = [SO(one, zero, zero)]
    for ratio in left_ratios:
        left.append(left[-1] * ratio)
    tail = [SO(zero, zero, zero), SO(zero, zero, zero), SO(zero, zero, zero)] + left[3:]

    right_gaps = [
        2 * h, h, h + b2, h + b3,
        h + slack["b4"], h + slack["b5"],
        h + slack["b6"], h + slack["b7"],
    ]
    right_ratios = [None] * 9
    right_ratios[8] = (tb, SO(zero, zero, zero))
    for index in range(7, -1, -1):
        right_ratios[index] = pair_add(
            right_ratios[index + 1],
            (right_gaps[index], SO(one, zero, zero) if index == 0 else SO(zero, zero, zero)),
        )
    right = [(SO(one, zero, zero), SO(zero, zero, zero))]
    for ratio in right_ratios:
        right.append(pair_mul(right[-1], ratio))

    direction = [zero_pair(zero) for _ in range(10)]
    direction[3] = (right[2][0] * h, right[2][1] * h)
    for rank in range(4, 10):
        direction[rank] = pair_mul(direction[rank - 1], right_ratios[rank - 1])
    for pair in direction:
        assert not pair[0].z and not pair[1].z

    v, dv = {}, {}
    for rank in (7, 8, 9):
        v_rank = zero_pair(zero)
        dv_rank = zero_pair(zero)
        for index in range(rank + 1):
            weight = math.comb(rank, index)
            v_rank = pair_add(
                v_rank,
                (
                    weight * tail[index] * right[rank - index][0],
                    weight * tail[index] * right[rank - index][1],
                ),
            )
            dv_rank = pair_add(
                dv_rank,
                (
                    weight * tail[index] * direction[rank - index][0],
                    weight * tail[index] * direction[rank - index][1],
                ),
            )
        v[rank], dv[rank] = v_rank, dv_rank
        guard(f"curvature14 face{face} V/DV rank{rank}", peak, limit)
    return raw, h, v, dv


def pair_product(left, right, outer, zero):
    result = SO(zero, zero, zero)
    for left_outer in range(2):
        right_outer = outer - left_outer
        if 0 <= right_outer < 2:
            result += left[left_outer] * right[right_outer]
    return result


def curvature(values, outer, h, zero):
    return (
        pair_product(values[8], values[8], outer, zero)
        - pair_product(values[7], values[9], outer, zero)
        - h * pair_product(values[7], values[8], outer, zero)
    )


def cross(base, direction, outer, h, zero):
    return (
        2 * pair_product(base[8], direction[8], outer, zero)
        - pair_product(base[7], direction[9], outer, zero)
        - pair_product(direction[7], base[9], outer, zero)
        - h
        * (
            pair_product(base[7], direction[8], outer, zero)
            + pair_product(direction[7], base[8], outer, zero)
        )
    )


def pieces(raw, h, v, dv, outer, peak, limit):
    zero = next(iter(raw.values())).context().constant(0)
    base = curvature(v, outer, h, zero).t
    guard(f"curvature14 base outer{outer}", peak, limit)
    linear = cross(v, dv, outer, h, zero).t
    guard(f"curvature14 linear outer{outer}", peak, limit)
    direction = curvature(dv, outer, h, zero).t
    guard(f"curvature14 direction outer{outer}", peak, limit)
    return base, linear, direction


def merge(piece_polys, outer, complete, peak, limit):
    indices = [0, 0, 0]
    current = [key(poly, 0) if len(poly) else None for poly in piece_polys]
    stats = {
        label: {
            "outer_exponent": outer,
            "mixed_support_terms": 0,
            "negative_terms": 0,
            "minimum": None,
            "first_negative": None,
            "ordered_coefficient_sha256": None,
        }
        for label, _ in LABELS
    }
    digests = {label: hashlib.sha256() for label, _ in LABELS}
    raw_union = 0
    previous = None
    while any(item is not None for item in current):
        active = [index for index, item in enumerate(current) if item is not None]
        order = min(current[index][0] for index in active)
        monomial = None
        coefficients = [0, 0, 0]
        for index in active:
            if current[index][0] == order:
                _, found, coefficient = current[index]
                monomial = found if monomial is None else monomial
                assert monomial == found
                coefficients[index] = coefficient
                indices[index] += 1
                current[index] = key(piece_polys[index], indices[index]) if indices[index] < len(piece_polys[index]) else None
        if previous is not None:
            assert previous <= order
        previous = order
        raw_union += 1
        assert sum(monomial[:5]) == 2
        assert sum(monomial[5:]) + outer == DEGREE
        if not any(monomial[index] for index in GROUP_A):
            continue
        if outer == 0 and not any(monomial[index] for index in GROUP_B):
            continue
        full = monomial + (outer,)
        prefix = ",".join(map(str, full)) + ":"
        for label, scales in LABELS:
            coefficient = sum(scale * value for scale, value in zip(scales, coefficients))
            if not coefficient:
                continue
            encoded = (prefix + str(coefficient) + "\n").encode()
            digests[label].update(encoded)
            complete[label].update(encoded)
            stat = stats[label]
            stat["mixed_support_terms"] += 1
            stat["minimum"] = coefficient if stat["minimum"] is None else min(stat["minimum"], coefficient)
            if coefficient < 0:
                stat["negative_terms"] += 1
                if stat["first_negative"] is None:
                    stat["first_negative"] = {"monomial": list(full), "coefficient": coefficient}
        if raw_union % 100000 == 0:
            print("CURVATURE14 MERGE OUTER", outer, "RAW", raw_union, "PRIVATE", private_bytes(), flush=True)
        guard(f"curvature14 merge outer{outer} raw{raw_union}", peak, limit)
    for label in stats:
        stats[label]["ordered_coefficient_sha256"] = digests[label].hexdigest().upper()
        stats[label]["unfiltered_union_terms"] = raw_union
    return stats


def finish(output, token, face, label, stats, complete, source, peak, limit):
    prefix = output / f"rank8_low_low_a23_mixed_cross_face_{token}_{label}_grade_14_outer_stream_agent_20260823"
    chunks = []
    for stat in stats:
        path = Path(str(prefix) + f"_b0_exp_{stat['outer_exponent']}.json")
        payload = {
            "schema": "rank8-low-low-a23-mixed-cross-curvature-grade14-tail-v-second-order-chunk-agent-v1",
            "status": "PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE" if stat["negative_terms"] == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT",
            "face": list(face),
            "bridge_corner": [2 * face[0], 2 * face[1]],
            "family": "curvature",
            "auxiliary": label,
            "total_ordinary_slack_degree": DEGREE,
            "outer_variable": "b0",
            "outer_exponent": stat["outer_exponent"],
            "canonical_scope": {
                "oriented_left_tail_V": True,
                "full_convolution_C_excluded": True,
                "surviving_pieces": ["base", "linear", "direction"],
            },
            "chunk": stat,
            "source_sha256": source,
            "canonical_source": {"path": CANONICAL[0], "sha256": CANONICAL[1]},
        }
        digest = atomic_json(path, payload)
        chunks.append(
            {
                "outer_exponent": stat["outer_exponent"],
                "path": str(path.resolve()),
                "sha256": digest,
                "mixed_support_terms": stat["mixed_support_terms"],
                "negative_terms": stat["negative_terms"],
                "minimum": stat["minimum"],
                "ordered_coefficient_sha256": stat["ordered_coefficient_sha256"],
            }
        )
    total = sum(item["mixed_support_terms"] for item in chunks)
    negatives = sum(item["negative_terms"] for item in chunks)
    scales = [4, 2, 0] if label.endswith("middle_times_4") else [1, 1, 1]
    manifest = {
        "schema": "rank8-low-low-a23-mixed-cross-curvature-grade14-tail-v-second-order-manifest-agent-v1",
        "status": "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE" if negatives == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT",
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "family": "curvature",
        "auxiliary": label,
        "total_ordinary_slack_degree": DEGREE,
        "outer_variable": "b0",
        "outer_exponent_range": [0, 2],
        "canonical_scope": {
            "oriented_left_tail_V": True,
            "full_convolution_C_excluded": True,
            "surviving_pieces": ["base", "linear", "direction"],
            "middle_direction_scale_zero": label.endswith("middle_times_4"),
            "faces_computed_separately": True,
        },
        "hard_private_memory_limit_bytes": limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "result": {
            "chunks": chunks,
            "mixed_support_terms": total,
            "negative_terms": negatives,
            "ordered_coefficient_sha256": complete.hexdigest().upper(),
            "piece_names": ["base", "linear", "direction"],
            "piece_scales": scales,
        },
        "source_sha256": source,
        "dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]},
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-directory", default=".")
    parser.add_argument("--private-limit", type=int, default=LIMIT)
    args = parser.parse_args()
    output = Path(args.output_directory).resolve()
    output.mkdir(parents=True, exist_ok=True)
    assert sha256(HERE / DEPENDENCY[0]) == DEPENDENCY[1]
    assert sha256(HERE / CANONICAL[0]) == CANONICAL[1]
    source = sha256(Path(__file__))
    peak = [0]
    cells = []
    for token, face in FACES:
        FAILURE_CONTEXT["face_token"] = token
        context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
        raw, h, v, dv = build(face, context, peak, args.private_limit)
        complete = {label: hashlib.sha256() for label, _ in LABELS}
        replays = {label: [] for label, _ in LABELS}
        for outer in (0, 1, 2):
            FAILURE_CONTEXT["outer_exponent"] = outer
            piece_polys = pieces(raw, h, v, dv, outer, peak, args.private_limit)
            stats = merge(piece_polys, outer, complete, peak, args.private_limit)
            for label, _ in LABELS:
                replays[label].append(stats[label])
                print(
                    "FACE", token, "ROW", label, "OUTER", outer,
                    "TERMS", stats[label]["mixed_support_terms"],
                    "NEG", stats[label]["negative_terms"], "MIN", stats[label]["minimum"],
                    flush=True,
                )
            del piece_polys
            gc.collect()
            guard(f"curvature14 released face{token} outer{outer}", peak, args.private_limit)
        cells.extend(
            finish(output, token, face, label, replays[label], complete[label], source, peak, args.private_limit)
            for label, _ in LABELS
        )
        del raw, h, v, dv
        gc.collect()
        del context
        gc.collect()
        guard(f"curvature14 released face{token}", peak, args.private_limit)
    passed = len(cells) == 4 and all(item["negative_terms"] == 0 for item in cells)
    job = {
        "schema": "rank8-low-low-a23-mixed-cross-curvature-grade14-tail-v-second-order-job-agent-v1",
        "status": "PASS_EXACT_DISTINCT_FACES_GRADE14_CURVATURE_TAIL_V_ALL_THREE_PIECES_NONNEGATIVE" if passed else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT",
        "completed_cells": cells,
        "canonical_scope": {
            "oriented_left_tail_V": True,
            "full_convolution_C_excluded": True,
            "surviving_pieces": ["base", "linear", "direction"],
            "middle_scales": [4, 2, 0],
            "far_scales": [1, 1, 1],
            "faces_separate": True,
        },
        "exact_mixed_support_universe_bound_per_row": {
            "outer_0": 4740450,
            "outer_1": 3043950,
            "outer_2": 1882725,
            "total": 9667125,
        },
        "hard_private_memory_limit_bytes": args.private_limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source,
        "dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]},
    }
    path = output / "rank8_low_low_a23_mixed_cross_curvature_grade14_tail_v_second_order_job_agent_20260823.json"
    print("JOB", path, atomic_json(path, job), job["status"], flush=True)
    if not passed:
        raise SystemExit(2)


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        atomic_json(
            HERE / "rank8_low_low_a23_mixed_cross_curvature_grade14_tail_v_second_order_failure_agent_20260823.json",
            {
                "schema": "rank8-low-low-a23-mixed-cross-curvature-grade14-tail-v-second-order-failure-agent-v1",
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_STOP",
                "exception_type": type(exc).__name__,
                "exception": str(exc),
                "context": FAILURE_CONTEXT,
                "source_sha256": sha256(Path(__file__)),
            },
        )
        raise
