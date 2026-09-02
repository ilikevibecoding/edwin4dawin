#!/usr/bin/env python3
"""Independent exact replay of every disjoint strong-grade-14 base-triple atom.

This audit deliberately does not import the producer or its target-coefficient
class.  It uses a separately transcribed sparse one/two/three-variable jet and
forms each finished row polynomial directly before scanning its coefficients.
Only one face/outer/base-triple atom is resident at a time.
"""
from __future__ import annotations

import argparse
import ctypes
import gc
import hashlib
import itertools
import json
import math
import os
from ctypes import wintypes
from pathlib import Path

from flint import fmpz_mpoly_ctx

HERE = Path(__file__).resolve().parent
PRODUCER = (
    "probe_rank8_low_low_a23_mixed_cross_strong_grade14_per_base_triple_stream_agent.py",
    "C742B0EE941D69542BFCEFAA22F38C92D67BC1DFA1B614DB1FC03C257C7903BB",
)
SCOPE = (
    "rank8_low_low_a23_mixed_cross_strong_grade14_disjoint_triple_formula_scope_audit_agent_20260823.json",
    "0313F4DE9B6C558AD2E2417D1D2E4C85BDC97C41F1BBDA8049EA01E1F9A32704",
)
BASE = ("h", "ta", "tb", "P", "Q")
SLACK = ("a0", "b4", "b5", "b6", "b7", "a4", "a5", "a6", "a7")
BASE_TRIPLES = tuple(itertools.combinations_with_replacement(range(5), 3))
FACES = (("01", (0, 1)), ("10", (1, 0)))
LABELS = ("strong_middle_times_4", "strong_far")
DEGREE = 14
SOFT_LIMIT = 425_000_000
HARD_LIMIT = 475_000_000
FAILURE_CONTEXT = {}


class PMC(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD),
        ("PageFaultCount", wintypes.DWORD),
        ("PeakWorkingSetSize", ctypes.c_size_t),
        ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
    ]


def private_bytes():
    counters = PMC()
    counters.cb = ctypes.sizeof(counters)
    current = ctypes.windll.kernel32.GetCurrentProcess
    current.restype = wintypes.HANDLE
    query = ctypes.windll.psapi.GetProcessMemoryInfo
    query.argtypes = (wintypes.HANDLE, ctypes.POINTER(PMC), wintypes.DWORD)
    query.restype = wintypes.BOOL
    if not query(current(), ctypes.byref(counters), counters.cb):
        raise OSError("GetProcessMemoryInfo failed")
    return int(counters.PrivateUsage)


def guard(stage, peak, hard_limit):
    current = private_bytes()
    peak[0] = max(peak[0], current)
    FAILURE_CONTEXT.update(stage=stage, private_bytes=current, peak_private_bytes=peak[0])
    if current >= hard_limit:
        raise MemoryError(f"hard private-memory guard {stage}: {current} >= {hard_limit}")
    if current >= min(SOFT_LIMIT, hard_limit):
        raise MemoryError(f"soft private-memory guard {stage}: {current} >= {min(SOFT_LIMIT, hard_limit)}")


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def atomic_json(path, payload):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def pinned(path, expected):
    actual = sha256(path)
    assert actual == expected, (Path(path).name, actual, expected)
    return json.loads(Path(path).read_text(encoding="utf-8"))


class Jet:
    """Sparse exact coefficient jet truncated at one degree-three target."""

    __slots__ = ("c", "target", "zero")

    def __init__(self, coefficients, target, zero):
        self.c = coefficients
        self.target = target
        self.zero = zero

    @staticmethod
    def constant(value, target):
        zero = value.context().constant(0)
        origin = (0,) * len(target)
        return Jet({origin: value} if value else {}, target, zero)

    @staticmethod
    def variable(zero, one, target, axis):
        exponent = [0] * len(target)
        exponent[axis] = 1
        return Jet({tuple(exponent): one}, target, zero)

    def __add__(self, other):
        if not isinstance(other, Jet):
            other = Jet.constant(self.zero.context().constant(other), self.target)
        assert self.target == other.target
        result = dict(self.c)
        for exponent, value in other.c.items():
            combined = result.get(exponent, self.zero) + value
            if combined:
                result[exponent] = combined
            else:
                result.pop(exponent, None)
        return Jet(result, self.target, self.zero)

    __radd__ = __add__

    def __neg__(self):
        return Jet({exponent: -value for exponent, value in self.c.items()}, self.target, self.zero)

    def __sub__(self, other):
        return self + (-other)

    def __mul__(self, other):
        if not isinstance(other, Jet):
            return Jet(
                {exponent: value * other for exponent, value in self.c.items() if value * other},
                self.target,
                self.zero,
            )
        assert self.target == other.target
        result = {}
        for left_exponent, left_value in self.c.items():
            for right_exponent, right_value in other.c.items():
                exponent = tuple(left + right for left, right in zip(left_exponent, right_exponent))
                if any(value > maximum for value, maximum in zip(exponent, self.target)):
                    continue
                combined = result.get(exponent, self.zero) + left_value * right_value
                if combined:
                    result[exponent] = combined
                else:
                    result.pop(exponent, None)
        return Jet(result, self.target, self.zero)

    __rmul__ = __mul__

    def target_coefficient(self):
        return self.c.get(self.target, self.zero)


def pair_add(left, right):
    return left[0] + right[0], left[1] + right[1]


def pair_mul(left, right):
    return left[0] * right[0], left[1] * right[0] + left[0] * right[1]


def zero_pair(zero, target):
    return Jet.constant(zero, target), Jet.constant(zero, target)


def base_monomial(triple):
    exponent = [0] * len(BASE)
    for index in triple:
        exponent[index] += 1
    return tuple(exponent)


def target_spec(triple):
    exponent = base_monomial(triple)
    active = tuple(index for index, value in enumerate(exponent) if value)
    return tuple(exponent[index] for index in active), {base_index: axis for axis, base_index in enumerate(active)}


def base_variable(index, zero, one, target, axes):
    if index in axes:
        return Jet.variable(zero, one, target, axes[index])
    return Jet.constant(zero, target)


def reconstruct(face, triple, context, peak, limit):
    raw = dict(zip(SLACK, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    target, axes = target_spec(triple)
    base = {name: base_variable(index, zero, one, target, axes) for index, name in enumerate(BASE)}
    slack = {name: Jet.constant(raw[name], target) for name in SLACK}
    h, ta, tb, p, q = (base[name] for name in BASE)
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q

    gaps_l = [2 * h + slack["a0"], h, h + a2, h + a3, h + slack["a4"], h + slack["a5"], h + slack["a6"], h + slack["a7"]]
    ratios_l = [None] * 9
    ratios_l[-1] = ta
    for index in range(7, -1, -1):
        ratios_l[index] = ratios_l[index + 1] + gaps_l[index]
    powers_l = [Jet.constant(one, target)]
    for ratio in ratios_l:
        powers_l.append(powers_l[-1] * ratio)
    powers_v = [Jet.constant(zero, target) for _ in range(3)] + powers_l[3:]
    capacity = ratios_l[2]

    gaps_r = [2 * h, h, h + b2, h + b3, h + slack["b4"], h + slack["b5"], h + slack["b6"], h + slack["b7"]]
    ratios_r = [None] * 9
    ratios_r[-1] = (tb, Jet.constant(zero, target))
    for index in range(7, -1, -1):
        seed = Jet.constant(one, target) if index == 0 else Jet.constant(zero, target)
        ratios_r[index] = pair_add(ratios_r[index + 1], (gaps_r[index], seed))
    powers_r = [(Jet.constant(one, target), Jet.constant(zero, target))]
    for ratio in ratios_r:
        powers_r.append(pair_mul(powers_r[-1], ratio))

    direction = [zero_pair(zero, target) for _ in range(10)]
    direction[3] = powers_r[2][0] * h, powers_r[2][1] * h
    for rank in range(4, 10):
        direction[rank] = pair_mul(direction[rank - 1], ratios_r[rank - 1])

    c, v, dc, dv = {}, {}, {}, {}
    for rank in (7, 8, 9):
        accumulators = [zero_pair(zero, target) for _ in range(4)]
        for index in range(rank + 1):
            weight = math.comb(rank, index)
            terms = (
                (powers_l[index], powers_r[rank - index]),
                (powers_v[index], powers_r[rank - index]),
                (powers_l[index], direction[rank - index]),
                (powers_v[index], direction[rank - index]),
            )
            for slot, (left, right) in enumerate(terms):
                accumulators[slot] = pair_add(accumulators[slot], (weight * left * right[0], weight * left * right[1]))
        c[rank], v[rank], dc[rank], dv[rank] = accumulators
    guard(f"reconstructed face{face} triple{triple}", peak, limit)
    return h, capacity, c, v, dc, dv, target


def outer_product(left, right, outer, zero, target):
    total = Jet.constant(zero, target)
    for left_outer in range(2):
        right_outer = outer - left_outer
        if 0 <= right_outer < 2:
            total += left[left_outer] * right[right_outer]
    return total


def qform(x, y, outer, h, zero, target):
    return outer_product(x[8], y[8], outer, zero, target) - outer_product(x[7], y[9], outer, zero, target) - h * outer_product(x[7], y[8], outer, zero, target)


def symmetric_qform(x, y, outer, h, zero, target):
    return qform(x, y, outer, h, zero, target) + qform(y, x, outer, h, zero, target)


def strong_pieces(h, capacity, c, v, dc, dv, outer, zero, target, peak, limit):
    base = (capacity * qform(c, c, outer, h, zero, target) + h * symmetric_qform(c, v, outer, h, zero, target)).target_coefficient()
    guard(f"independent base piece outer{outer}", peak, limit)
    linear = (capacity * symmetric_qform(c, dc, outer, h, zero, target) + h * (symmetric_qform(c, dv, outer, h, zero, target) + symmetric_qform(dc, v, outer, h, zero, target))).target_coefficient()
    guard(f"independent linear piece outer{outer}", peak, limit)
    direction = (capacity * qform(dc, dc, outer, h, zero, target) + h * symmetric_qform(dc, dv, outer, h, zero, target)).target_coefficient()
    guard(f"independent direction piece outer{outer}", peak, limit)
    return base, linear, direction


def scan_row(poly, base_exp, outer, sinks, peak, limit):
    digest = hashlib.sha256()
    terms = 0
    negatives = 0
    minimum = None
    first_negative = None
    for index in range(len(poly)):
        reduced = tuple(map(int, poly.monomial(index)))
        full = base_exp + reduced + (outer,)
        assert sum(full[:5]) == 3
        assert sum(reduced) + outer == DEGREE
        if not any(reduced[position] for position in range(5)):
            continue
        if outer == 0 and not any(reduced[position] for position in range(5, 9)):
            continue
        coefficient = int(poly.coefficient(index))
        assert coefficient
        encoded = ((",".join(map(str, full)) + ":" + str(coefficient) + "\n").encode())
        digest.update(encoded)
        for sink in sinks:
            sink.update(encoded)
        terms += 1
        minimum = coefficient if minimum is None else min(minimum, coefficient)
        if coefficient < 0:
            negatives += 1
            if first_negative is None:
                first_negative = {"monomial": list(full), "coefficient": coefficient}
        if index and index % 100000 == 0:
            guard(f"independent direct row scan outer{outer} index{index}", peak, limit)
    return {
        "outer_exponent": outer,
        "mixed_support_terms": terms,
        "negative_terms": negatives,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
        "unfiltered_finished_row_terms": len(poly),
    }


def expected_atom_refs(token, manifests):
    refs = {}
    for label, manifest in manifests.items():
        for chunk_ref in manifest["result"]["chunks"]:
            chunk = pinned(chunk_ref["path"], chunk_ref["sha256"])
            outer = chunk["outer_exponent"]
            for atom in chunk["chunk"]["base_triple_atoms"]:
                key = (token, label, outer, atom["base_triple_index"])
                refs[key] = (atom["path"], atom["sha256"], atom)
    assert len(refs) == 2 * 3 * 35
    return refs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--private-limit", type=int, default=HARD_LIMIT)
    parser.add_argument("--face-token", choices=("01", "10"), required=True)
    parser.add_argument("--middle-manifest-sha256", required=True)
    parser.add_argument("--far-manifest-sha256", required=True)
    args = parser.parse_args()
    assert sha256(HERE / PRODUCER[0]) == PRODUCER[1]
    scope = pinned(HERE / SCOPE[0], SCOPE[1])
    assert scope["status"] == "PASS_CANONICAL_STRONG_GRADE14_FULL_C_TAIL_V_ALL_THREE_PIECES_DISJOINT_TRIPLE_SCOPE"
    face = dict(FACES)[args.face_token]
    manifests = {}
    manifest_pins = {}
    for label, expected in (
        ("strong_middle_times_4", args.middle_manifest_sha256),
        ("strong_far", args.far_manifest_sha256),
    ):
        name = f"rank8_low_low_a23_mixed_cross_face_{args.face_token}_{label}_grade_14_outer_stream_agent_20260823_manifest.json"
        manifest = pinned(HERE / name, expected.upper())
        assert manifest["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
        assert manifest["face"] == list(face) and manifest["auxiliary"] == label
        assert manifest["source_sha256"] == PRODUCER[1]
        assert manifest["canonical_scope"]["base_triple_supports_disjoint"] is True
        manifests[label] = manifest
        manifest_pins[label] = {"path": name, "sha256": expected.upper()}
    refs = expected_atom_refs(args.face_token, manifests)
    peak = [0]
    complete = {label: hashlib.sha256() for label in LABELS}
    outer_digests = {(label, outer): hashlib.sha256() for label in LABELS for outer in range(3)}
    term_totals = {label: 0 for label in LABELS}
    audited = []

    token = args.face_token
    context = fmpz_mpoly_ctx.get(SLACK, "degrevlex")
    zero = context.constant(0)
    for outer in range(3):
        for triple_index, triple in enumerate(BASE_TRIPLES):
                FAILURE_CONTEXT.update(face_token=token, outer_exponent=outer, base_triple_index=triple_index, base_triple=list(triple))
                h, capacity, c, v, dc, dv, target = reconstruct(face, triple, context, peak, args.private_limit)
                base, linear, direction = strong_pieces(h, capacity, c, v, dc, dv, outer, zero, target, peak, args.private_limit)
                del h, capacity, c, v, dc, dv
                gc.collect()
                rows = {}
                middle = 4 * base + 2 * linear
                rows["strong_middle_times_4"] = scan_row(middle, base_monomial(triple), outer, (complete["strong_middle_times_4"], outer_digests[("strong_middle_times_4", outer)]), peak, args.private_limit)
                del middle
                gc.collect()
                far = base + linear + direction
                rows["strong_far"] = scan_row(far, base_monomial(triple), outer, (complete["strong_far"], outer_digests[("strong_far", outer)]), peak, args.private_limit)
                del far, base, linear, direction
                gc.collect()

                expected_payload = None
                expected_sha = None
                for label in LABELS:
                    path, digest, atom_ref = refs[(token, label, outer, triple_index)]
                    if expected_payload is None:
                        expected_payload = pinned(path, digest)
                        expected_sha = digest
                    else:
                        assert digest == expected_sha and Path(path).resolve() == Path(expected_payload_path).resolve()
                    expected_payload_path = path
                    for field in ("outer_exponent", "mixed_support_terms", "negative_terms", "minimum", "first_negative", "ordered_coefficient_sha256"):
                        assert expected_payload["rows"][label][field] == rows[label][field], (token, label, outer, triple_index, field)
                    assert atom_ref["ordered_coefficient_sha256"] == rows[label]["ordered_coefficient_sha256"]
                    assert atom_ref["negative_terms"] == 0 == rows[label]["negative_terms"]
                    term_totals[label] += rows[label]["mixed_support_terms"]
                audit_path = HERE / f"rank8_low_low_a23_mixed_cross_face_{token}_strong_grade_14_b0_exp_{outer}_base_triple_{triple_index:02d}_independent_atom_audit_agent_20260823.json"
                audit_payload = {
                    "schema": "rank8-low-low-a23-mixed-cross-strong-grade14-disjoint-triple-independent-reconstruction-agent-v1",
                    "status": "PASS_INDEPENDENT_JET_DIRECT_ROW_RECONSTRUCTION_EXACT",
                    "face": list(face),
                    "face_token": token,
                    "outer_exponent": outer,
                    "base_triple_index": triple_index,
                    "base_triple": list(triple),
                    "base_exponent": list(base_monomial(triple)),
                    "producer_atom": {"path": str(Path(expected_payload_path).resolve()), "sha256": expected_sha},
                    "rows": rows,
                    "source_sha256": sha256(Path(__file__)),
                }
                audit_sha = atomic_json(audit_path, audit_payload)
                audited.append({"face_token": token, "outer_exponent": outer, "base_triple_index": triple_index, "path": str(audit_path.resolve()), "sha256": audit_sha})
                print("AUDITED", token, outer, triple_index, rows["strong_middle_times_4"]["mixed_support_terms"], rows["strong_far"]["mixed_support_terms"], "PRIVATE", private_bytes(), flush=True)
                del rows, expected_payload
                gc.collect()
                guard(f"released independent atom face{token} outer{outer} triple{triple_index}", peak, args.private_limit)
    del context
    gc.collect()

    cells = []
    for label in LABELS:
        manifest = manifests[label]
        replayed_digest = complete[label].hexdigest().upper()
        assert replayed_digest == manifest["result"]["triple_major_ordered_coefficient_sha256"]
        assert term_totals[label] == manifest["result"]["mixed_support_terms"]
        for chunk_ref in manifest["result"]["chunks"]:
            assert outer_digests[(label, chunk_ref["outer_exponent"])].hexdigest().upper() == chunk_ref["ordered_coefficient_sha256"]
        cells.append({
            "face_token": token,
            "face": list(face),
            "auxiliary": label,
            "replayed_mixed_support_terms": term_totals[label],
            "replayed_negative_terms": 0,
            "replayed_triple_major_ordered_coefficient_sha256": replayed_digest,
            "producer_manifest": str((HERE / manifest_pins[label]["path"]).resolve()),
            "producer_manifest_sha256": manifest_pins[label]["sha256"],
        })

    report = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-grade14-disjoint-triple-independent-face-audit-agent-v1",
        "status": f"PASS_INDEPENDENT_FACE_{token}_ALL_105_ATOMS_JET_DIRECT_ROW_RECONSTRUCTION_EXACT",
        "producer_source": {"path": PRODUCER[0], "sha256": PRODUCER[1]},
        "formula_scope": {"path": SCOPE[0], "sha256": SCOPE[1]},
        "face_token": token,
        "face": list(face),
        "producer_manifests": manifest_pins,
        "imports_producer": False,
        "audit_method": "separately transcribed sparse coefficient jet; direct finished-row polynomial scan; one disjoint base-triple atom resident at a time",
        "audited_atom_count": len(audited),
        "audited_atoms": audited,
        "cells": cells,
        "all_rows_negative_terms": 0,
        "checks": {
            "all_105_disjoint_atoms_for_this_face_replayed": True,
            "face_reconstructed_without_hash_reuse": True,
            "all_three_strong_pieces_reconstructed": True,
            "finished_rows_formed_directly_without_producer_heap_merge": True,
            "per_atom_per_outer_and_full_row_hashes_exact": True,
            "face_hash_reuse": False,
        },
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "hard_private_memory_limit_bytes": args.private_limit,
        "soft_private_memory_limit_bytes": min(SOFT_LIMIT, args.private_limit),
        "source_sha256": sha256(Path(__file__)),
    }
    assert len(audited) == 105
    output = HERE / f"rank8_low_low_a23_mixed_cross_face_{token}_strong_grade14_disjoint_triple_independent_audit_agent_20260823.json"
    print("PASS", output, atomic_json(output, report), flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        token = FAILURE_CONTEXT.get("face_token", "unknown")
        atomic_json(HERE / f"rank8_low_low_a23_mixed_cross_face_{token}_strong_grade14_disjoint_triple_independent_failure_agent_20260823.json", {
            "schema": "rank8-low-low-a23-mixed-cross-strong-grade14-disjoint-triple-independent-failure-agent-v1",
            "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_STOP",
            "exception_type": type(exc).__name__,
            "exception": str(exc),
            "context": FAILURE_CONTEXT,
            "source_sha256": sha256(Path(__file__)),
        })
        raise
