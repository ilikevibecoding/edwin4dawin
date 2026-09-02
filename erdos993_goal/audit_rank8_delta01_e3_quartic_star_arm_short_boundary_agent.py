#!/usr/bin/env python3
"""Independent audit of the quartic-star arm short-boundary certificate.

The audit reconstructs the no-gap cell cover without importing the primary
runner, checks every constant coefficient by literal tree DP, and uses SymPy
to reconstruct both complete multivariate polynomials for one representative
of every algebraic cell shape.  The primary certificate used FLINT.
"""

from __future__ import annotations

import gc
import hashlib
import itertools
import json
import math
import time
from collections import Counter
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from audit_rank8_delta01_e3_quartic_stars_n27_n36_agent import (
    build_star,
    deltas,
    forest_polynomial,
)


ROOT = Path(__file__).resolve().parent
PRIMARY_SOURCE = ROOT / "verify_rank8_delta01_e3_quartic_star_arm_short_boundary_flint_agent.py"
PRIMARY = ROOT / "rank8_delta01_e3_quartic_star_arm_short_boundary_exact_agent_20260822.json"
OUTPUT = ROOT / "rank8_delta01_e3_quartic_star_arm_short_boundary_independent_audit_agent_20260822.json"
EXPECTED = {
    PRIMARY_SOURCE.name:
        "56EFD77C357C6225C99B0CBA2B6BAA75ED014E4D6E6BA15E22E037A552965753",
    PRIMARY.name:
        "F9F20951F5B8566EADE765853CEBD20E70C33F8D2E784D2A8E7724027E9B0310",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
}
LONG = "L"
RANKS = (0, 1)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def key(near, tail, others, representative, shift) -> str:
    return (
        f"near={near};tail={tail};others={'-'.join(map(str, others))};"
        f"large={representative};shift={shift}"
    )


def reconstruct_cover():
    computed = []
    inherited = []
    pattern_counts = Counter()
    cover_counts = Counter()
    for near_index in range(8):
        near = near_index if near_index < 7 else LONG
        for tail_index in range(8):
            tail = tail_index if tail_index < 7 else LONG
            # Indices make the ordering explicit without comparing ints to LONG.
            for triple in itertools.combinations_with_replacement(range(7), 3):
                others = tuple(index + 1 if index < 6 else LONG for index in triple)
                values = (near, tail, *others)
                long_count = values.count(LONG)
                if not long_count:
                    continue
                pattern_counts[long_count] += 1
                baseline = sum(7 if value == LONG else value for value in values)
                demand = max(0, 35 - baseline)
                shift = (demand + long_count - 1) // long_count
                if demand == 0:
                    representatives = ("none",)
                else:
                    representatives = tuple(
                        role
                        for role, present in (
                            ("near", near == LONG),
                            ("tail", tail == LONG),
                            ("other", LONG in others),
                        )
                        if present
                    )
                    # Exact integer pigeonhole certificate for this pattern.
                    assert long_count * (shift - 1) < demand <= long_count * shift
                for representative in representatives:
                    row = {
                        "key": key(near, tail, others, representative, shift),
                        "near": near,
                        "tail": tail,
                        "others": others,
                        "long_count": long_count,
                        "baseline": baseline,
                        "demand": demand,
                        "shift": shift,
                        "representative": representative,
                    }
                    cover_counts[(long_count, representative)] += 1
                    (inherited if demand == 0 else computed).append(row)
    assert dict(pattern_counts) == {1: 1813, 2: 644, 3: 154, 4: 20, 5: 1}
    assert len(computed) == 3133 and len(inherited) == 1
    assert inherited[0]["key"] == "near=L;tail=L;others=L-L-L;large=none;shift=0"
    assert len({row["key"] for row in computed}) == 3133
    return computed, inherited[0], pattern_counts, cover_counts


def literal_lengths(cell: dict):
    near = 7 if cell["near"] == LONG else cell["near"]
    tail = 7 if cell["tail"] == LONG else cell["tail"]
    others = [7 if value == LONG else value for value in cell["others"]]
    if cell["representative"] == "near":
        near += cell["shift"]
    elif cell["representative"] == "tail":
        tail += cell["shift"]
    elif cell["representative"] == "other":
        position = cell["others"].index(LONG)
        others[position] += cell["shift"]
    return near, tail, others


def literal_deltas(cell: dict) -> tuple[int, int]:
    near, tail, others = literal_lengths(cell)
    adjacency, _ = build_star((near + tail + 1, *others))
    root = near + 1
    core = forest_polynomial(adjacency)
    deletion = forest_polynomial(adjacency, root)
    return deltas(core, deletion)


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def path_count(order: int | sp.Expr, rank: int) -> sp.Expr:
    if isinstance(order, (int, sp.Integer)):
        integer = int(order)
        if integer == -1:
            return sp.Integer(rank == 0)
        assert integer >= 0
        top = integer - rank + 1
        return sp.Integer(math.comb(top, rank) if top >= rank else 0)
    return choose_poly(order - rank + 1, rank)


def path_vector(order, max_rank: int) -> list[sp.Expr]:
    return [path_count(order, rank) for rank in range(max_rank + 1)]


def vector_product(factors: list[list[sp.Expr]], max_rank: int) -> list[sp.Expr]:
    values = [sp.Integer(1)] + [sp.Integer(0)] * max_rank
    for factor in factors:
        values = [
            sp.expand(sum(values[index] * factor[rank - index] for index in range(rank + 1)))
            for rank in range(max_rank + 1)
        ]
    return values


def two_long_paths(total_order: sp.Expr, max_rank: int) -> list[sp.Expr]:
    return [
        sp.expand(sum(
            path_count(total_order - 4 * paired, rank - 2 * paired)
            for paired in range(rank // 2 + 1)
        ))
        for rank in range(max_rank + 1)
    ]


def star_vector(first_arm, excluded_other, reduced_other, max_rank: int):
    excluded = vector_product([path_vector(first_arm, max_rank), *excluded_other], max_rank)
    reduced = vector_product([path_vector(first_arm - 1, max_rank), *reduced_other], max_rank)
    return [
        sp.expand(excluded[rank] + (reduced[rank - 1] if rank else 0))
        for rank in range(max_rank + 1)
    ]


def convolve(left, right, rank: int):
    return sp.expand(sum(left[index] * right[rank - index] for index in range(rank + 1)))


# Separately transcribed from R_t, rather than importing the primary residual.
C = sp.symbols("C0:9")
H6, H7 = sp.symbols("H6 H7")


def residual_at(siblings: int) -> sp.Expr:
    def smoothed(rank: int, extra: sp.Expr) -> sp.Expr:
        return sum(math.comb(siblings, index) * C[rank - index] for index in range(rank + 1)) + extra

    p7 = smoothed(7, H6)
    p8 = smoothed(8, H7)
    p9_open = sum(math.comb(siblings, index) * C[9 - index] for index in range(1, 10))
    return sp.expand(
        8 * C[7] * H6 * (16 * p8**2 - p7 * p8 - 18 * p7 * p9_open)
        - 8 * H6 * p7 * (16 * C[8] ** 2 - C[7] * C[8])
        - 9 * C[7] * p7 * (14 * H7**2 - H6 * H7)
    )


DELTA_EXPRESSIONS = (residual_at(1), sp.expand(residual_at(2) - residual_at(1)))
AUDIT_SOURCE_SYMBOLS = (*C[3:9], H6, H7)
assert DELTA_EXPRESSIONS[0].free_symbols <= set((*C[6:9], H6, H7))
assert DELTA_EXPRESSIONS[1].free_symbols <= set((*C[5:9], H6, H7))
DELTA_TERMS = {
    rank: sp.Poly(DELTA_EXPRESSIONS[rank], *AUDIT_SOURCE_SYMBOLS).terms()
    for rank in RANKS
}


def build_symbolic(cell: dict):
    q = cell["others"].count(LONG)
    names = []
    if cell["near"] == LONG:
        names.append("N")
    if cell["tail"] == LONG:
        names.append("T")
    if q == 1:
        names.append("O")
    elif q == 2:
        names.append("S")
    elif q == 3:
        names.extend(("S", "O"))
    variables = sp.symbols(" ".join(names), nonnegative=True)
    if len(names) == 1:
        variables = (variables,)
    values = dict(zip(names, variables))
    shift = cell["shift"]
    near = (
        values["N"] + 7 + (shift if cell["representative"] == "near" else 0)
        if cell["near"] == LONG else cell["near"]
    )
    tail = (
        values["T"] + 7 + (shift if cell["representative"] == "tail" else 0)
        if cell["tail"] == LONG else cell["tail"]
    )
    excluded = []
    reduced = []
    for fixed in (value for value in cell["others"] if value != LONG):
        excluded.append(path_vector(fixed, 8))
        reduced.append(path_vector(fixed - 1, 8))
    if q == 1:
        order = values["O"] + 7 + (shift if cell["representative"] == "other" else 0)
        excluded.append(path_vector(order, 8))
        reduced.append(path_vector(order - 1, 8))
    elif q == 2:
        total = values["S"] + 14 + (shift if cell["representative"] == "other" else 0)
        excluded.append(two_long_paths(total, 8))
        reduced.append(two_long_paths(total - 2, 8))
    elif q == 3:
        pair_total = values["S"] + 14
        single = values["O"] + 7 + (shift if cell["representative"] == "other" else 0)
        excluded.extend((two_long_paths(pair_total, 8), path_vector(single, 8)))
        reduced.extend((two_long_paths(pair_total - 2, 8), path_vector(single - 1, 8)))
    core = star_vector(near + tail + 1, excluded, reduced, 8)
    deleted_center = star_vector(near, excluded, reduced, 7)
    tail_vector = path_vector(tail, 7)
    raw = {C[rank]: core[rank] for rank in range(3, 9)}
    raw.update({
        H6: convolve(tail_vector, deleted_center, 6),
        H7: convolve(tail_vector, deleted_center, 7),
    })
    return raw, variables


def polynomial_digest(polynomial: sp.Poly) -> str:
    body = "".join(
        f"{','.join(map(str, powers))}:{coefficient}\n"
        for powers, coefficient in sorted(polynomial.terms())
    )
    return hashlib.sha256(body.encode("ascii")).hexdigest().upper()


def symbolic_rows(cell: dict):
    raw, variables = build_symbolic(cell)
    source_values = [sp.Poly(raw[symbol], *variables, domain=sp.QQ) for symbol in AUDIT_SOURCE_SYMBOLS]
    maxima = [
        max(powers[index] for rank in RANKS for powers, _ in DELTA_TERMS[rank])
        for index in range(len(AUDIT_SOURCE_SYMBOLS))
    ]
    powers = [
        [sp.Poly(1, *variables), *[value**power for power in range(1, maximum + 1)]]
        for value, maximum in zip(source_values, maxima)
    ]
    rows = {}
    for rank in RANKS:
        result = sp.Poly(0, *variables)
        for source_powers, coefficient in DELTA_TERMS[rank]:
            term = sp.Poly(coefficient, *variables)
            for index, power in enumerate(source_powers):
                if power:
                    term *= powers[index][power]
            result += term
        coefficients = result.coeffs()
        rows[str(rank)] = {
            "degrees": [int(value) for value in result.degree_list()],
            "terms": len(result.terms()),
            "minimum_coefficient": str(min(coefficients)),
            "constant_coefficient": str(result.coeff_monomial((0,) * len(variables))),
            "polynomial_sha256": polynomial_digest(result),
        }
    return rows


def shape(cell: dict, primary_row: dict):
    return (
        len(primary_row["variables"]),
        cell["representative"],
        cell["others"].count(LONG),
        cell["near"] == LONG,
        cell["tail"] == LONG,
    )


def main() -> None:
    started = time.perf_counter()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_ARM_ALL_N37_PLUS"
    computed, inherited, pattern_counts, cover_counts = reconstruct_cover()
    expected_by_key = {row["key"]: row for row in computed}
    primary_by_key = {row["key"]: row for row in primary["cells"]}
    assert set(expected_by_key) == set(primary_by_key)
    assert primary["no_gap_cover"]["computed_shifted_cells"] == 3133
    assert primary["no_gap_cover"]["inherited_all_long_cells"] == 1
    assert primary["inherited_all_long_certificate"]["key"] == inherited["key"]

    minima = {rank: None for rank in RANKS}
    literal_digest = hashlib.sha256()
    for index, cell in enumerate(computed, 1):
        row = primary_by_key[cell["key"]]
        assert row["pattern"]["baseline_segment_sum"] == cell["baseline"]
        assert row["pattern"]["offset_total_needed"] == cell["demand"]
        assert row["shift"] == cell["shift"]
        values = literal_deltas(cell)
        for rank, value in enumerate(values):
            assert value > 0
            assert str(value) == row["ranks"][str(rank)]["constant_coefficient"]
            minima[rank] = value if minima[rank] is None else min(minima[rank], value)
            literal_digest.update(f"{cell['key']}|{rank}|{value}\n".encode("ascii"))
        if index % 500 == 0:
            print("LITERAL_DP", index, len(computed), flush=True)

    sample_by_shape = {}
    for cell in computed:
        row = primary_by_key[cell["key"]]
        sample_by_shape.setdefault(shape(cell, row), cell)
    assert len(sample_by_shape) == 25
    samples = []
    for signature, cell in sorted(sample_by_shape.items(), key=lambda item: str(item[0])):
        replay = symbolic_rows(cell)
        primary_row = primary_by_key[cell["key"]]
        for rank in RANKS:
            expected = primary_row["ranks"][str(rank)]
            actual_row = replay[str(rank)]
            assert actual_row["degrees"] == expected["degrees"]
            assert actual_row["terms"] == expected["terms"]
            assert actual_row["minimum_coefficient"] == expected["minimum_coefficient"]
            assert actual_row["constant_coefficient"] == expected["constant_coefficient"]
            assert actual_row["polynomial_sha256"] == expected["polynomial_sha256"]
        samples.append({
            "shape": [str(value) for value in signature],
            "key": cell["key"],
            "ranks": replay,
        })
        print("SYMPY_SHAPE_PASS", signature, cell["key"], flush=True)
        clear_cache()
        gc.collect()

    sample_keys_sha256 = hashlib.sha256(
        ("\n".join(row["key"] for row in samples) + "\n").encode("ascii")
    ).hexdigest().upper()
    payload = {
        "schema": "rank8-delta01-e3-quartic-star-arm-short-boundary-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_ARM_ALL_N37_PLUS",
        "methods": [
            "independent no-gap enumeration and per-pattern integer pigeonhole inequalities",
            "literal truncated tree DP plus separately transcribed R1 and R2-R1 for all 3133 cells",
            "SymPy full-polynomial reconstruction against FLINT canonical hashes for all 25 algebraic cell shapes",
        ],
        "coverage": {
            "patterns_by_long_segments": {str(key): value for key, value in sorted(pattern_counts.items())},
            "computed_cells": len(computed),
            "inherited_cells": 1,
            "cover_cells_by_long_segments_and_representative": {
                f"{long_count}|{representative}": value
                for (long_count, representative), value in sorted(cover_counts.items())
            },
            "exact_key_set_match": True,
        },
        "all_cell_literal_dp": {
            "cells": len(computed),
            "rank_constants": 2 * len(computed),
            "exact_matches": 2 * len(computed),
            "negative_values": 0,
            "minimum_values": {str(rank): minima[rank] for rank in RANKS},
            "transcript_sha256": literal_digest.hexdigest().upper(),
        },
        "second_engine_full_polynomials": {
            "engine": "SymPy QQ multivariate polynomials",
            "primary_engine": "python-flint fmpq_mpoly",
            "algebraic_shapes": len(sample_by_shape),
            "sample_cells": len(samples),
            "rank_polynomials": 2 * len(samples),
            "full_polynomial_hash_matches": 2 * len(samples),
            "sample_keys_sha256": sample_keys_sha256,
            "samples": samples,
        },
        "runtime_seconds": time.perf_counter() - started,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently audits only the Delta0/Delta1 quartic-star theorem. "
            "It does not close the other e=3 skeleton or connected Q8."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("OUTPUT", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
