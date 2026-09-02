#!/usr/bin/env python3
"""Reusable bounded mixed-face producer, one family and one grade at a time.

The engine grades exactly by base degree (16-grade for curvature, 17-grade
for strong), streams b0 exponents 0..2, computes the two faces sequentially,
and emits an independent checkpoint for every requested family/grade batch.
No result is shared across grades.
"""
from __future__ import annotations

import argparse
import gc
import hashlib
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_a23_mixed_cross_curvature_grade15_tail_v_piece_merge_agent import (
    atomic_json,
    guard,
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
GROUP_A = tuple(NAMES.index(name) for name in REDUCED[:5])
GROUP_B = tuple(NAMES.index(name) for name in REDUCED[5:])
FACES = (("01", (0, 1)), ("10", (1, 0)))
LIMIT = 475_000_000
FAILURE_CONTEXT = {}


def key(poly, index):
    """Map FLINT's native descending degree-reverse-lex order to ascending."""
    monomial = tuple(map(int, poly.monomial(index)))
    return (-sum(monomial), tuple(reversed(monomial))), monomial, int(
        poly.coefficient(index)
    )


class BD:
    """Polynomial coefficients from base degree zero through one target."""

    __slots__ = ("c", "target")

    def __init__(self, coefficients, target):
        self.c = coefficients
        self.target = target

    @staticmethod
    def constant(value, target):
        zero = value.context().constant(0)
        return BD([value] + [zero for _ in range(target)], target)

    @staticmethod
    def base(value, target):
        zero = value.context().constant(0)
        coefficients = [zero for _ in range(target + 1)]
        if target >= 1:
            coefficients[1] = value
        return BD(coefficients, target)

    def __add__(self, other):
        if not isinstance(other, BD):
            other = BD.constant(other, self.target)
        assert self.target == other.target
        return BD([left + right for left, right in zip(self.c, other.c)], self.target)

    __radd__ = __add__

    def __neg__(self):
        return BD([-value for value in self.c], self.target)

    def __sub__(self, other):
        return self + (-other)

    def __mul__(self, other):
        if not isinstance(other, BD):
            return BD([value * other for value in self.c], self.target)
        assert self.target == other.target
        zero = self.c[0].context().constant(0)
        result = [zero for _ in range(self.target + 1)]
        for degree in range(self.target + 1):
            for left_degree in range(degree + 1):
                left = self.c[left_degree]
                right = other.c[degree - left_degree]
                if left and right:
                    result[degree] += left * right
        return BD(result, self.target)

    __rmul__ = __mul__

    def is_zero(self):
        return all(not value for value in self.c)


def pair_add(left, right):
    return (left[0] + right[0], left[1] + right[1])


def pair_mul(left, right):
    assert left[1].is_zero() or right[1].is_zero()
    return (left[0] * right[0], left[0] * right[1] + left[1] * right[0])


def zero_pair(zero, target):
    return (BD.constant(zero, target), BD.constant(zero, target))


def build(face, family, target, context, peak, limit):
    assert str(context.ordering()) == "Ordering.degrevlex"
    raw = dict(zip(NAMES, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    base = {name: BD.base(raw[name], target) for name in BASE}
    slack = {name: BD.constant(raw[name], target) for name in REDUCED}
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
    left = [BD.constant(one, target)]
    for ratio in left_ratios:
        left.append(left[-1] * ratio)
    tail = [BD.constant(zero, target) for _ in range(3)] + left[3:]
    capacity = left_ratios[2]

    right_gaps = [
        2 * h, h, h + b2, h + b3,
        h + slack["b4"], h + slack["b5"],
        h + slack["b6"], h + slack["b7"],
    ]
    right_ratios = [None] * 9
    right_ratios[8] = (tb, BD.constant(zero, target))
    for index in range(7, -1, -1):
        right_ratios[index] = pair_add(
            right_ratios[index + 1],
            (right_gaps[index], BD.constant(one, target) if index == 0 else BD.constant(zero, target)),
        )
    right = [(BD.constant(one, target), BD.constant(zero, target))]
    for ratio in right_ratios:
        right.append(pair_mul(right[-1], ratio))
    direction = [zero_pair(zero, target) for _ in range(10)]
    direction[3] = (right[2][0] * h, right[2][1] * h)
    for rank in range(4, 10):
        direction[rank] = pair_mul(direction[rank - 1], right_ratios[rank - 1])
    for pair in direction:
        assert not pair[0].c[0] and not pair[1].c[0]

    c, v, dc, dv = {}, {}, {}, {}
    for rank in (7, 8, 9):
        c_rank = zero_pair(zero, target)
        v_rank = zero_pair(zero, target)
        dc_rank = zero_pair(zero, target)
        dv_rank = zero_pair(zero, target)
        for index in range(rank + 1):
            weight = math.comb(rank, index)
            v_rank = pair_add(v_rank, (
                weight * tail[index] * right[rank - index][0],
                weight * tail[index] * right[rank - index][1],
            ))
            dv_rank = pair_add(dv_rank, (
                weight * tail[index] * direction[rank - index][0],
                weight * tail[index] * direction[rank - index][1],
            ))
            if family == "strong":
                c_rank = pair_add(c_rank, (
                    weight * left[index] * right[rank - index][0],
                    weight * left[index] * right[rank - index][1],
                ))
                dc_rank = pair_add(dc_rank, (
                    weight * left[index] * direction[rank - index][0],
                    weight * left[index] * direction[rank - index][1],
                ))
        v[rank], dv[rank] = v_rank, dv_rank
        if family == "strong":
            c[rank], dc[rank] = c_rank, dc_rank
        guard(f"multidegree {family} face{face} rank{rank}", peak, limit)
    return raw, h, capacity, c, v, dc, dv


def pair_product(left, right, outer, zero, target):
    result = BD.constant(zero, target)
    for left_outer in range(2):
        right_outer = outer - left_outer
        if 0 <= right_outer < 2:
            result += left[left_outer] * right[right_outer]
    return result


def curvature(values, outer, h, zero, target):
    return pair_product(values[8], values[8], outer, zero, target) - pair_product(values[7], values[9], outer, zero, target) - h * pair_product(values[7], values[8], outer, zero, target)


def cross(base, direction, outer, h, zero, target):
    return 2 * pair_product(base[8], direction[8], outer, zero, target) - pair_product(base[7], direction[9], outer, zero, target) - pair_product(direction[7], base[9], outer, zero, target) - h * (pair_product(base[7], direction[8], outer, zero, target) + pair_product(direction[7], base[8], outer, zero, target))


def derivative(c, v, outer, h, zero, target):
    return 2 * pair_product(c[8], v[8], outer, zero, target) - pair_product(v[7], c[9], outer, zero, target) - pair_product(c[7], v[9], outer, zero, target) - h * (pair_product(v[7], c[8], outer, zero, target) + pair_product(c[7], v[8], outer, zero, target))


def derivative_cross(c, dc, v, dv, outer, h, zero, target):
    return 2 * (pair_product(c[8], dv[8], outer, zero, target) + pair_product(dc[8], v[8], outer, zero, target)) - pair_product(v[7], dc[9], outer, zero, target) - pair_product(dv[7], c[9], outer, zero, target) - pair_product(c[7], dv[9], outer, zero, target) - pair_product(dc[7], v[9], outer, zero, target) - h * (pair_product(v[7], dc[8], outer, zero, target) + pair_product(dv[7], c[8], outer, zero, target) + pair_product(c[7], dv[8], outer, zero, target) + pair_product(dc[7], v[8], outer, zero, target))


def make_pieces(family, raw, h, capacity, c, v, dc, dv, outer, target, peak, limit):
    zero = next(iter(raw.values())).context().constant(0)
    if family == "curvature":
        pieces = (
            curvature(v, outer, h, zero, target).c[target],
            cross(v, dv, outer, h, zero, target).c[target],
            curvature(dv, outer, h, zero, target).c[target],
        )
    else:
        pieces = (
            (capacity * curvature(c, outer, h, zero, target) + h * derivative(c, v, outer, h, zero, target)).c[target],
            (capacity * cross(c, dc, outer, h, zero, target) + h * derivative_cross(c, dc, v, dv, outer, h, zero, target)).c[target],
            (capacity * curvature(dc, outer, h, zero, target) + h * derivative(dc, dv, outer, h, zero, target)).c[target],
        )
    guard(f"multidegree {family} pieces outer{outer}", peak, limit)
    return pieces


def labels(family):
    return ((f"{family}_middle_times_4", (4, 2, 0)), (f"{family}_far", (1, 1, 1)))


def merge(polys, family, degree, target, outer, complete, peak, limit):
    specs = labels(family)
    indices = [0, 0, 0]
    current = [key(poly, 0) if len(poly) else None for poly in polys]
    stats = {label: {"outer_exponent": outer, "mixed_support_terms": 0, "negative_terms": 0, "minimum": None, "first_negative": None, "ordered_coefficient_sha256": None} for label, _ in specs}
    digests = {label: hashlib.sha256() for label, _ in specs}
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
                current[index] = key(polys[index], indices[index]) if indices[index] < len(polys[index]) else None
        if previous is not None:
            assert previous <= order, {
                "previous": previous,
                "next": order,
                "indices": list(indices),
                "current": current,
            }
        previous = order
        raw_union += 1
        assert sum(monomial[:5]) == target and sum(monomial[5:]) + outer == degree
        if not any(monomial[index] for index in GROUP_A):
            continue
        if outer == 0 and not any(monomial[index] for index in GROUP_B):
            continue
        full = monomial + (outer,)
        prefix = ",".join(map(str, full)) + ":"
        for label, scales in specs:
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
            print("MULTIDEGREE MERGE", family, "GRADE", degree, "OUTER", outer, "RAW", raw_union, "PRIVATE", private_bytes(), flush=True)
        guard(f"multidegree {family} grade{degree} outer{outer} raw{raw_union}", peak, limit)
    for label in stats:
        stats[label]["ordered_coefficient_sha256"] = digests[label].hexdigest().upper()
        stats[label]["unfiltered_union_terms"] = raw_union
    return stats


def finish(output, token, face, family, degree, target, label, stats, complete, source, peak, limit):
    prefix = output / f"rank8_low_low_a23_mixed_cross_face_{token}_{label}_grade_{degree}_outer_stream_agent_20260823"
    chunks = []
    for stat in stats:
        path = Path(str(prefix) + f"_b0_exp_{stat['outer_exponent']}.json")
        payload = {"schema": "rank8-low-low-a23-mixed-cross-multidegree-family-chunk-agent-v1", "status": "PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE" if stat["negative_terms"] == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT", "face": list(face), "bridge_corner": [2 * face[0], 2 * face[1]], "family": family, "auxiliary": label, "total_ordinary_slack_degree": degree, "exact_base_degree": target, "outer_variable": "b0", "outer_exponent": stat["outer_exponent"], "canonical_scope": {"curvature_uses_oriented_left_tail_V": True, "strong_margin_uses_full_C": family == "strong", "strong_derivative_uses_oriented_left_tail_V": family == "strong", "surviving_pieces": ["base", "linear", "direction"]}, "chunk": stat, "source_sha256": source, "canonical_source": {"path": CANONICAL[0], "sha256": CANONICAL[1]}}
        digest = atomic_json(path, payload)
        chunks.append({"outer_exponent": stat["outer_exponent"], "path": str(path.resolve()), "sha256": digest, "mixed_support_terms": stat["mixed_support_terms"], "negative_terms": stat["negative_terms"], "minimum": stat["minimum"], "ordered_coefficient_sha256": stat["ordered_coefficient_sha256"]})
    total = sum(item["mixed_support_terms"] for item in chunks)
    negatives = sum(item["negative_terms"] for item in chunks)
    manifest = {"schema": "rank8-low-low-a23-mixed-cross-multidegree-family-manifest-agent-v1", "status": "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE" if negatives == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT", "face": list(face), "bridge_corner": [2 * face[0], 2 * face[1]], "family": family, "auxiliary": label, "total_ordinary_slack_degree": degree, "exact_base_degree": target, "outer_variable": "b0", "outer_exponent_range": [0, 2], "canonical_scope": {"curvature_uses_oriented_left_tail_V": True, "strong_margin_uses_full_C": family == "strong", "strong_derivative_uses_oriented_left_tail_V": family == "strong", "surviving_pieces": ["base", "linear", "direction"], "middle_direction_scale_zero": label.endswith("middle_times_4"), "faces_computed_separately": True}, "hard_private_memory_limit_bytes": limit, "observed_peak_private_bytes_at_checkpoints": peak[0], "result": {"chunks": chunks, "mixed_support_terms": total, "negative_terms": negatives, "ordered_coefficient_sha256": complete.hexdigest().upper(), "piece_names": ["base", "linear", "direction"], "piece_scales": [4, 2, 0] if label.endswith("middle_times_4") else [1, 1, 1]}, "source_sha256": source, "dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]}}
    path = Path(str(prefix) + "_manifest.json")
    digest = atomic_json(path, manifest)
    return {"face_token": token, "face": list(face), "auxiliary": label, "manifest": str(path.resolve()), "manifest_sha256": digest, "mixed_support_terms": total, "negative_terms": negatives, "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"]}


def support_bounds(degree, target):
    base_count = math.comb(target + 4, 4)
    values = []
    for outer in range(3):
        slack = degree - outer
        reduced = math.comb(slack + 8, 8) - math.comb(slack + 3, 3)
        if outer == 0:
            reduced -= math.comb(slack + 4, 4)
        values.append(base_count * reduced)
    return values


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--family", choices=("curvature", "strong"), required=True)
    parser.add_argument("--degree", type=int, required=True)
    parser.add_argument("--output-directory", default=".")
    parser.add_argument("--private-limit", type=int, default=LIMIT)
    args = parser.parse_args()
    maximum = 16 if args.family == "curvature" else 17
    target = maximum - args.degree
    assert target >= 0
    output = Path(args.output_directory).resolve()
    output.mkdir(parents=True, exist_ok=True)
    assert sha256(HERE / DEPENDENCY[0]) == DEPENDENCY[1]
    assert sha256(HERE / CANONICAL[0]) == CANONICAL[1]
    source = sha256(Path(__file__))
    peak = [0]
    cells = []
    for token, face in FACES:
        FAILURE_CONTEXT.update(face_token=token, family=args.family, degree=args.degree)
        context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
        raw, h, capacity, c, v, dc, dv = build(face, args.family, target, context, peak, args.private_limit)
        complete = {label: hashlib.sha256() for label, _ in labels(args.family)}
        replays = {label: [] for label, _ in labels(args.family)}
        for outer in (0, 1, 2):
            FAILURE_CONTEXT["outer_exponent"] = outer
            polys = make_pieces(args.family, raw, h, capacity, c, v, dc, dv, outer, target, peak, args.private_limit)
            stats = merge(polys, args.family, args.degree, target, outer, complete, peak, args.private_limit)
            for label, _ in labels(args.family):
                replays[label].append(stats[label])
                print("FACE", token, "ROW", label, "OUTER", outer, "TERMS", stats[label]["mixed_support_terms"], "NEG", stats[label]["negative_terms"], "MIN", stats[label]["minimum"], flush=True)
            del polys
            gc.collect()
            guard(f"multidegree released face{token} outer{outer}", peak, args.private_limit)
        cells.extend(finish(output, token, face, args.family, args.degree, target, label, replays[label], complete[label], source, peak, args.private_limit) for label, _ in labels(args.family))
        del raw, h, capacity, c, v, dc, dv
        gc.collect()
        del context
        gc.collect()
        guard(f"multidegree released face{token}", peak, args.private_limit)
    passed = len(cells) == 4 and all(item["negative_terms"] == 0 for item in cells)
    bounds = support_bounds(args.degree, target)
    job = {"schema": "rank8-low-low-a23-mixed-cross-multidegree-family-job-agent-v1", "status": "PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE" if passed else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT", "family": args.family, "total_ordinary_slack_degree": args.degree, "exact_base_degree": target, "completed_cells": cells, "canonical_scope": {"curvature_uses_oriented_left_tail_V": True, "strong_margin_uses_full_C": args.family == "strong", "strong_derivative_uses_oriented_left_tail_V": args.family == "strong", "surviving_pieces": ["base", "linear", "direction"], "middle_scales": [4, 2, 0], "far_scales": [1, 1, 1], "faces_separate": True}, "exact_mixed_support_universe_bound_per_row": {"outer_0": bounds[0], "outer_1": bounds[1], "outer_2": bounds[2], "total": sum(bounds)}, "hard_private_memory_limit_bytes": args.private_limit, "observed_peak_private_bytes_at_checkpoints": peak[0], "source_sha256": source, "dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]}}
    path = output / f"rank8_low_low_a23_mixed_cross_{args.family}_grade{args.degree}_multidegree_family_job_agent_20260823.json"
    print("JOB", path, atomic_json(path, job), job["status"], flush=True)
    if not passed:
        raise SystemExit(2)


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        atomic_json(HERE / "rank8_low_low_a23_mixed_cross_multidegree_family_failure_agent_20260823.json", {"schema": "rank8-low-low-a23-mixed-cross-multidegree-family-failure-agent-v1", "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_STOP", "exception_type": type(exc).__name__, "exception": str(exc), "context": FAILURE_CONTEXT, "source_sha256": sha256(Path(__file__))})
        raise
