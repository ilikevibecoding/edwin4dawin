#!/usr/bin/env python3
"""Low-memory exact producer for strong grade 15 via disjoint base-pair atoms.

The five leading exponents record the degree-two base monomial.  The 15 base
pairs therefore have disjoint coefficient support.  We may combine the three
strong pieces inside one base-pair atom, certify both rows, hash the atom in a
fixed pair-major order, and release it before constructing the next atom.
"""
from __future__ import annotations

import argparse
import gc
import hashlib
import heapq
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from audit_rank8_low_low_a23_mixed_cross_curvature_grade14_per_base_pair_independent_agent import (
    BASE,
    BASE_PAIRS,
    SLACK,
    TC,
    atomic_json,
    base_monomial,
    guard,
    pair_add,
    pair_mul,
    pinned,
    private_bytes,
    sha256,
    zero_pair,
)

HERE = Path(__file__).resolve().parent
DEPENDENCY = (
    "audit_rank8_low_low_a23_mixed_cross_curvature_grade14_per_base_pair_independent_agent.py",
    "D14F33E78E130201921B3999E53FEBE2BE22D1AC6FB9A595307D82B0B8CC7379",
)
CANONICAL = (
    "probe_rank8_low_low_a23_mixed_cross_face_grade_outer_stream_agent.py",
    "BF0F79B2A7C1F35FBBFD350601421914C71648557BF1B6E41E38F3C1C75077DC",
)
FACES = (("01", (0, 1)), ("10", (1, 0)))
LABELS = (("strong_middle_times_4", (4, 2, 0)), ("strong_far", (1, 1, 1)))
DEGREE = 15
LIMIT = 475_000_000
SOFT_LIMIT = 425_000_000
FAILURE_CONTEXT = {}


def base_variable(index, pair, zero, one, target):
    left, right = pair
    if index == left:
        return TC.variable(zero, one, target, 0)
    if left != right and index == right:
        return TC.variable(zero, one, target, 1)
    return TC.constant(zero, target)


def soft_guard(stage, peak, hard_limit):
    guard(stage, peak, hard_limit)
    current = private_bytes()
    if current >= min(SOFT_LIMIT, hard_limit):
        raise MemoryError(f"soft pair-stream guard {stage}: {current}")


def build(face, pair, context, peak, limit):
    raw = dict(zip(SLACK, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    target = (2, 0) if pair[0] == pair[1] else (1, 1)
    base = {name: base_variable(index, pair, zero, one, target) for index, name in enumerate(BASE)}
    slack = {name: TC.constant(raw[name], target) for name in SLACK}
    h, ta, tb, p, q = (base[name] for name in BASE)
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q
    left_gaps = [2 * h + slack["a0"], h, h + a2, h + a3, h + slack["a4"], h + slack["a5"], h + slack["a6"], h + slack["a7"]]
    left_ratios = [None] * 9
    left_ratios[8] = ta
    for index in range(7, -1, -1):
        left_ratios[index] = left_ratios[index + 1] + left_gaps[index]
    left = [TC.constant(one, target)]
    for ratio in left_ratios:
        left.append(left[-1] * ratio)
    tail = [TC.constant(zero, target) for _ in range(3)] + left[3:]
    capacity = left_ratios[2]
    right_gaps = [2 * h, h, h + b2, h + b3, h + slack["b4"], h + slack["b5"], h + slack["b6"], h + slack["b7"]]
    right_ratios = [None] * 9
    right_ratios[8] = (tb, TC.constant(zero, target))
    for index in range(7, -1, -1):
        right_ratios[index] = pair_add(right_ratios[index + 1], (right_gaps[index], TC.constant(one, target) if index == 0 else TC.constant(zero, target)))
    right = [(TC.constant(one, target), TC.constant(zero, target))]
    for ratio in right_ratios:
        right.append(pair_mul(right[-1], ratio))
    direction = [zero_pair(zero, target) for _ in range(10)]
    direction[3] = (right[2][0] * h, right[2][1] * h)
    for rank in range(4, 10):
        direction[rank] = pair_mul(direction[rank - 1], right_ratios[rank - 1])
    for outer_pair in direction:
        assert not outer_pair[0].c[0] and not outer_pair[1].c[0]
    c, v, dc, dv = {}, {}, {}, {}
    for rank in (7, 8, 9):
        c_rank = zero_pair(zero, target)
        v_rank = zero_pair(zero, target)
        dc_rank = zero_pair(zero, target)
        dv_rank = zero_pair(zero, target)
        for index in range(rank + 1):
            weight = math.comb(rank, index)
            c_rank = pair_add(c_rank, (weight * left[index] * right[rank - index][0], weight * left[index] * right[rank - index][1]))
            v_rank = pair_add(v_rank, (weight * tail[index] * right[rank - index][0], weight * tail[index] * right[rank - index][1]))
            dc_rank = pair_add(dc_rank, (weight * left[index] * direction[rank - index][0], weight * left[index] * direction[rank - index][1]))
            dv_rank = pair_add(dv_rank, (weight * tail[index] * direction[rank - index][0], weight * tail[index] * direction[rank - index][1]))
        c[rank], v[rank], dc[rank], dv[rank] = c_rank, v_rank, dc_rank, dv_rank
    soft_guard(f"strong15 base-pair build face{face} pair{pair}", peak, limit)
    return h, capacity, c, v, dc, dv, target


def pair_product(left, right, outer, zero, target):
    result = TC.constant(zero, target)
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


def pieces(h, capacity, c, v, dc, dv, outer, zero, target, peak, limit):
    base = (capacity * curvature(c, outer, h, zero, target) + h * derivative(c, v, outer, h, zero, target)).target_coefficient()
    soft_guard(f"strong15 pair base outer{outer}", peak, limit)
    linear = (capacity * cross(c, dc, outer, h, zero, target) + h * derivative_cross(c, dc, v, dv, outer, h, zero, target)).target_coefficient()
    soft_guard(f"strong15 pair linear outer{outer}", peak, limit)
    direction = (capacity * curvature(dc, outer, h, zero, target) + h * derivative(dc, dv, outer, h, zero, target)).target_coefficient()
    soft_guard(f"strong15 pair direction outer{outer}", peak, limit)
    return base, linear, direction


class Cursor:
    def __init__(self, poly, base_exp, piece_index, outer):
        self.poly, self.base_exp, self.piece_index, self.outer, self.index = poly, base_exp, piece_index, outer, 0

    def advance(self):
        if self.index >= len(self.poly):
            return None
        reduced = tuple(map(int, self.poly.monomial(self.index)))
        coefficient = int(self.poly.coefficient(self.index))
        self.index += 1
        full = self.base_exp + reduced + (self.outer,)
        return (-sum(full), tuple(reversed(full))), full, coefficient


def merge_atom(record, outer, complete, outer_complete, peak, limit):
    cursors = []
    base_exp, polys = record
    for piece_index, poly in enumerate(polys):
        if len(poly):
            cursors.append(Cursor(poly, base_exp, piece_index, outer))
    heap = []
    for index, cursor in enumerate(cursors):
        item = cursor.advance()
        if item is not None:
            heapq.heappush(heap, (item[0], index, item[1], item[2]))
    stats = {label: {"outer_exponent": outer, "mixed_support_terms": 0, "negative_terms": 0, "minimum": None, "first_negative": None, "ordered_coefficient_sha256": None} for label, _ in LABELS}
    digests = {label: hashlib.sha256() for label, _ in LABELS}
    raw_union = 0
    previous = None
    while heap:
        order, cursor_index, full, coefficient = heapq.heappop(heap)
        coefficients = [0, 0, 0]
        coefficients[cursors[cursor_index].piece_index] += coefficient
        consumed = [cursor_index]
        while heap and heap[0][0] == order:
            _, other_index, other_full, other_coefficient = heapq.heappop(heap)
            assert other_full == full
            coefficients[cursors[other_index].piece_index] += other_coefficient
            consumed.append(other_index)
        for other_index in consumed:
            item = cursors[other_index].advance()
            if item is not None:
                heapq.heappush(heap, (item[0], other_index, item[1], item[2]))
        if previous is not None:
            assert previous <= order
        previous = order
        raw_union += 1
        reduced = full[5:-1]
        assert sum(full[:5]) == 2 and sum(reduced) + outer == DEGREE
        if not any(reduced[index] for index in range(5)):
            continue
        if outer == 0 and not any(reduced[index] for index in range(5, 9)):
            continue
        prefix = ",".join(map(str, full)) + ":"
        for label, scales in LABELS:
            combined = sum(scale * value for scale, value in zip(scales, coefficients))
            if not combined:
                continue
            encoded = (prefix + str(combined) + "\n").encode()
            digests[label].update(encoded)
            complete[label].update(encoded)
            outer_complete[label].update(encoded)
            stat = stats[label]
            stat["mixed_support_terms"] += 1
            stat["minimum"] = combined if stat["minimum"] is None else min(stat["minimum"], combined)
            if combined < 0:
                stat["negative_terms"] += 1
                if stat["first_negative"] is None:
                    stat["first_negative"] = {"monomial": list(full), "coefficient": combined}
        if raw_union % 100000 == 0:
            print("STRONG15 ATOM MERGE OUTER", outer, "RAW", raw_union, "PRIVATE", private_bytes(), flush=True)
        soft_guard(f"strong15 atom merge outer{outer} raw{raw_union}", peak, limit)
    for label in stats:
        stats[label]["ordered_coefficient_sha256"] = digests[label].hexdigest().upper()
        stats[label]["unfiltered_union_terms"] = raw_union
    return stats


def empty_outer_stat(outer):
    return {
        "outer_exponent": outer,
        "mixed_support_terms": 0,
        "negative_terms": 0,
        "minimum": None,
        "first_negative": None,
        "ordered_coefficient_sha256": None,
        "pair_major_ordered_coefficient_sha256": None,
        "unfiltered_union_terms": 0,
        "base_pair_atoms": [],
    }


def absorb_atom(total, atom, pair_index, pair):
    total["mixed_support_terms"] += atom["mixed_support_terms"]
    total["negative_terms"] += atom["negative_terms"]
    total["unfiltered_union_terms"] += atom["unfiltered_union_terms"]
    if atom["minimum"] is not None:
        total["minimum"] = atom["minimum"] if total["minimum"] is None else min(total["minimum"], atom["minimum"])
    if total["first_negative"] is None and atom["first_negative"] is not None:
        total["first_negative"] = atom["first_negative"]
    total["base_pair_atoms"].append({
        "base_pair_index": pair_index,
        "base_pair": list(pair),
        "base_exponent": list(base_monomial(pair)),
        "mixed_support_terms": atom["mixed_support_terms"],
        "negative_terms": atom["negative_terms"],
        "minimum": atom["minimum"],
        "ordered_coefficient_sha256": atom["ordered_coefficient_sha256"],
    })


def write_atom(output, token, face, outer, pair_index, pair, stats, source, peak, limit):
    path = output / f"rank8_low_low_a23_mixed_cross_face_{token}_strong_grade_15_b0_exp_{outer}_base_pair_{pair_index:02d}_atom_agent_20260823.json"
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-grade15-disjoint-base-pair-atom-agent-v1",
        "status": "PASS_EXACT_DISJOINT_BASE_PAIR_ATOM_BOTH_ROWS_NONNEGATIVE" if all(stat["negative_terms"] == 0 for stat in stats.values()) else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT",
        "face": list(face),
        "face_token": token,
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "family": "strong",
        "total_ordinary_slack_degree": DEGREE,
        "exact_base_degree": 2,
        "outer_variable": "b0",
        "outer_exponent": outer,
        "base_pair_index": pair_index,
        "base_pair": list(pair),
        "base_exponent": list(base_monomial(pair)),
        "base_pair_support_disjointness": "The first five exponents equal this unique degree-two base exponent, so no coefficient can overlap another base-pair atom.",
        "canonical_pair_major_order": "outer exponent, BASE_PAIRS index, degrevlex monomial inside the atom",
        "rows": stats,
        "hard_private_memory_limit_bytes": limit,
        "soft_private_memory_limit_bytes": min(SOFT_LIMIT, limit),
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source,
        "dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]},
    }
    digest = atomic_json(path, payload)
    return {"path": str(path.resolve()), "sha256": digest}


def finish(output, token, face, label, stats, complete, source, peak, limit):
    prefix = output / f"rank8_low_low_a23_mixed_cross_face_{token}_{label}_grade_15_outer_stream_agent_20260823"
    chunks = []
    for stat in stats:
        path = Path(str(prefix) + f"_b0_exp_{stat['outer_exponent']}.json")
        payload = {"schema": "rank8-low-low-a23-mixed-cross-strong-grade15-disjoint-base-pair-chunk-agent-v1", "status": "PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE" if stat["negative_terms"] == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT", "face": list(face), "bridge_corner": [2 * face[0], 2 * face[1]], "family": "strong", "auxiliary": label, "total_ordinary_slack_degree": DEGREE, "exact_base_degree": 2, "outer_variable": "b0", "outer_exponent": stat["outer_exponent"], "canonical_scope": {"margin_uses_full_C": True, "derivative_uses_oriented_left_tail_V": True, "surviving_pieces": ["base", "linear", "direction"], "base_pair_supports_disjoint": True, "canonical_digest_order": "BASE_PAIRS index then degrevlex monomial inside each atom"}, "chunk": stat, "source_sha256": source, "canonical_source": {"path": CANONICAL[0], "sha256": CANONICAL[1]}}
        digest = atomic_json(path, payload)
        chunks.append({"outer_exponent": stat["outer_exponent"], "path": str(path.resolve()), "sha256": digest, "mixed_support_terms": stat["mixed_support_terms"], "negative_terms": stat["negative_terms"], "minimum": stat["minimum"], "ordered_coefficient_sha256": stat["ordered_coefficient_sha256"]})
    total = sum(item["mixed_support_terms"] for item in chunks)
    negatives = sum(item["negative_terms"] for item in chunks)
    manifest = {"schema": "rank8-low-low-a23-mixed-cross-strong-grade15-disjoint-base-pair-manifest-agent-v1", "status": "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE" if negatives == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT", "face": list(face), "bridge_corner": [2 * face[0], 2 * face[1]], "family": "strong", "auxiliary": label, "total_ordinary_slack_degree": DEGREE, "exact_base_degree": 2, "outer_variable": "b0", "outer_exponent_range": [0, 2], "canonical_scope": {"margin_uses_full_C": True, "derivative_uses_oriented_left_tail_V": True, "surviving_pieces": ["base", "linear", "direction"], "middle_direction_scale_zero": label.endswith("middle_times_4"), "faces_computed_separately": True, "base_pair_supports_disjoint": True, "canonical_digest_order": "outer exponent, BASE_PAIRS index, degrevlex monomial inside each atom"}, "hard_private_memory_limit_bytes": limit, "soft_private_memory_limit_bytes": min(SOFT_LIMIT, limit), "observed_peak_private_bytes_at_checkpoints": peak[0], "result": {"chunks": chunks, "mixed_support_terms": total, "negative_terms": negatives, "ordered_coefficient_sha256": complete.hexdigest().upper(), "pair_major_ordered_coefficient_sha256": complete.hexdigest().upper(), "piece_names": ["base", "linear", "direction"], "piece_scales": [4, 2, 0] if label.endswith("middle_times_4") else [1, 1, 1]}, "source_sha256": source, "dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]}}
    path = Path(str(prefix) + "_manifest.json")
    digest = atomic_json(path, manifest)
    return {"face_token": token, "face": list(face), "auxiliary": label, "manifest": str(path.resolve()), "manifest_sha256": digest, "mixed_support_terms": total, "negative_terms": negatives, "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"]}


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
    base_exponents = [base_monomial(pair) for pair in BASE_PAIRS]
    assert len(base_exponents) == 15 and len(set(base_exponents)) == 15
    assert all(sum(exponent) == 2 for exponent in base_exponents)
    for token, face in FACES:
        context = fmpz_mpoly_ctx.get(SLACK, "degrevlex")
        zero = context.constant(0)
        complete = {label: hashlib.sha256() for label, _ in LABELS}
        replays = {label: [] for label, _ in LABELS}
        for outer in (0, 1, 2):
            outer_complete = {label: hashlib.sha256() for label, _ in LABELS}
            outer_stats = {label: empty_outer_stat(outer) for label, _ in LABELS}
            for pair_index, pair in enumerate(BASE_PAIRS):
                FAILURE_CONTEXT.update(face_token=token, outer_exponent=outer, base_pair=list(pair))
                h, capacity, c, v, dc, dv, target = build(face, pair, context, peak, args.private_limit)
                polys = pieces(h, capacity, c, v, dc, dv, outer, zero, target, peak, args.private_limit)
                del h, capacity, c, v, dc, dv, target
                gc.collect()
                print("STRONG15 BUILD FACE", token, "OUTER", outer, "BASE_PAIR", pair_index + 1, "/", len(BASE_PAIRS), "PRIVATE", private_bytes(), flush=True)
                atom_stats = merge_atom((base_monomial(pair), polys), outer, complete, outer_complete, peak, args.private_limit)
                atom_ref = write_atom(output, token, face, outer, pair_index, pair, atom_stats, source, peak, args.private_limit)
                for label, _ in LABELS:
                    absorb_atom(outer_stats[label], atom_stats[label], pair_index, pair)
                    outer_stats[label]["base_pair_atoms"][-1].update(atom_ref)
                del polys, atom_stats
                gc.collect()
                print("STRONG15 SEALED FACE", token, "OUTER", outer, "BASE_PAIR", pair_index + 1, "/", len(BASE_PAIRS), "PRIVATE", private_bytes(), flush=True)
                soft_guard(f"strong15 released atom {pair_index + 1}", peak, args.private_limit)
            for label, _ in LABELS:
                digest = outer_complete[label].hexdigest().upper()
                outer_stats[label]["ordered_coefficient_sha256"] = digest
                outer_stats[label]["pair_major_ordered_coefficient_sha256"] = digest
                replays[label].append(outer_stats[label])
                print("FACE", token, "ROW", label, "OUTER", outer, "TERMS", outer_stats[label]["mixed_support_terms"], "NEG", outer_stats[label]["negative_terms"], "MIN", outer_stats[label]["minimum"], flush=True)
            del outer_stats, outer_complete
            gc.collect()
            soft_guard(f"strong15 released face{token} outer{outer}", peak, args.private_limit)
        cells.extend(finish(output, token, face, label, replays[label], complete[label], source, peak, args.private_limit) for label, _ in LABELS)
        del context
        gc.collect()
        soft_guard(f"strong15 released face{token}", peak, args.private_limit)
    passed = len(cells) == 4 and all(item["negative_terms"] == 0 for item in cells)
    job = {"schema": "rank8-low-low-a23-mixed-cross-strong-grade15-disjoint-base-pair-job-agent-v1", "status": "PASS_EXACT_DISTINCT_FACES_GRADE15_STRONG_ALL_THREE_PIECES_NONNEGATIVE" if passed else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT", "completed_cells": cells, "canonical_scope": {"margin_uses_full_C": True, "derivative_uses_oriented_left_tail_V": True, "exact_base_degree": 2, "surviving_pieces": ["base", "linear", "direction"], "middle_scales": [4, 2, 0], "far_scales": [1, 1, 1], "faces_separate": True, "base_pair_supports_disjoint": True, "base_pair_count": 15, "canonical_digest_order": "outer exponent, BASE_PAIRS index, degrevlex monomial inside each atom"}, "exact_mixed_support_universe_bound_per_row": {"outer_0": 7284330, "outer_1": 4786350, "outer_2": 3043950, "total": 15114630}, "hard_private_memory_limit_bytes": args.private_limit, "soft_private_memory_limit_bytes": min(SOFT_LIMIT, args.private_limit), "observed_peak_private_bytes_at_checkpoints": peak[0], "source_sha256": source, "dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]}}
    path = output / "rank8_low_low_a23_mixed_cross_strong_grade15_per_base_pair_job_agent_20260823.json"
    print("JOB", path, atomic_json(path, job), job["status"], flush=True)
    if not passed:
        raise SystemExit(2)


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        atomic_json(HERE / "rank8_low_low_a23_mixed_cross_strong_grade15_per_base_pair_failure_agent_20260823.json", {"schema": "rank8-low-low-a23-mixed-cross-strong-grade15-per-base-pair-failure-agent-v1", "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_STOP", "exception_type": type(exc).__name__, "exception": str(exc), "context": FAILURE_CONTEXT, "source_sha256": sha256(Path(__file__))})
        raise
