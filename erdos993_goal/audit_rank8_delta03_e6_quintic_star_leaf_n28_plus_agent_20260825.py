#!/usr/bin/env python3
"""Independent literal-DP replay of the e=6 quintic-star leaf certificate.

The producer compresses symmetric pairs of long arms.  This audit does not
import that construction.  It builds literal five-arm adjacency lists, removes
the distinguished endpoint leaf, runs recursive include/exclude forest DP, and
recovers each source-coordinate polynomial from its exact 0..8 value tensor.
The canonical residual is then accumulated afresh and every ordered power-term
digest in the producer report is replayed.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
import time
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly, fmpq_mpoly_ctx

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta03_e6_quintic_star_leaf_n28_plus_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta03_e6_quintic_star_leaf_n28_plus_independent_audit_agent_20260825.json"
CERTIFICATE_SHA256 = "90FF1062BED69ADC418FD6331368B10C6CBFF202C57E35505B19263F0ED3B83D"
MAX_GRADE = 8
RANKS = (0, 1, 2, 3)
SOURCE_SYMBOLS = (*c[3:9], h[6], h[7])
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "prove_rank8_delta03_e6_quintic_star_leaf_n28_plus_agent_20260825.py":
        "C657006F7F9D23A0BDBB82B50E228A43E7A8B01479D43DA98BC2DBC6E30E1A58",
    "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json":
        "B8D2D160F679361AED1D337B9E814DA6B985ACCD19434DF629887DE0E7AE5307",
    "rank8_delta03_e6_skeleton_root_partition_independent_audit_20260825.json":
        "247DF3AC57F265839055CCF258BCC1E946A0470BAE83F2B79E61F1D8BD17E65F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def rational(value: sp.Expr) -> fmpq:
    numerator, denominator = sp.fraction(value)
    return fmpq(int(numerator), int(denominator))


DELTA_TERMS = {
    rank: [
        (powers, rational(coefficient))
        for powers, coefficient in sp.Poly(
            sp.expand(newton_coefficients(residual())[rank]),
            *SOURCE_SYMBOLS,
            domain=sp.QQ,
        ).terms()
    ]
    for rank in RANKS
}
MAX_SOURCE_POWERS = [
    max(powers[index] for rank in RANKS for powers, _ in DELTA_TERMS[rank])
    for index in range(len(SOURCE_SYMBOLS))
]


def independent_cover_specs() -> list[dict[str, object]]:
    """Re-enumerate the leaf routing cells without importing producer code."""
    rows: list[dict[str, object]] = []
    for other_long_count in range(4, -1, -1):
        short_count = 4 - other_long_count
        for shorts in itertools.combinations_with_replacement(range(1, 7), short_count):
            baseline = 1 + 7 + 7 * other_long_count + sum(shorts)
            deficit = max(0, 28 - baseline)
            if deficit == 0:
                branches = (("none", 0),)
            else:
                threshold = math.ceil(deficit / (other_long_count + 1))
                branches = (("selected", threshold),)
                if other_long_count:
                    branches += (("other", threshold),)
            for target, shift in branches:
                rows.append({
                    "selected_kind": "long",
                    "selected_short": None,
                    "other_long_count": other_long_count,
                    "other_shorts": list(shorts),
                    "baseline_order_before_shift": baseline,
                    "offset_total_needed": deficit,
                    "shift_target": target,
                    "shift": shift,
                    "coverage": (
                        "selected-vs-companion pigeonhole union"
                        if deficit else "full nonnegative orthant"
                    ),
                })

    for selected_short in range(1, 7):
        for other_long_count in range(4, 0, -1):
            short_count = 4 - other_long_count
            for shorts in itertools.combinations_with_replacement(range(1, 7), short_count):
                baseline = 1 + selected_short + 7 * other_long_count + sum(shorts)
                deficit = max(0, 28 - baseline)
                shift = math.ceil(deficit / other_long_count)
                rows.append({
                    "selected_kind": "short",
                    "selected_short": selected_short,
                    "other_long_count": other_long_count,
                    "other_shorts": list(shorts),
                    "baseline_order_before_shift": baseline,
                    "offset_total_needed": deficit,
                    "shift_target": "other" if shift else "none",
                    "shift": shift,
                    "coverage": (
                        "companion-arm symmetry and pigeonhole"
                        if deficit else "full nonnegative orthant"
                    ),
                })

    for selected_short in range(1, 7):
        for shorts in itertools.combinations_with_replacement(range(1, 7), 4):
            order = 1 + selected_short + sum(shorts)
            if order >= 28:
                rows.append({
                    "selected_kind": "short",
                    "selected_short": selected_short,
                    "other_long_count": 0,
                    "other_shorts": list(shorts),
                    "baseline_order_before_shift": order,
                    "offset_total_needed": 0,
                    "shift_target": "none",
                    "shift": 0,
                    "coverage": "literal fixed all-short leaf-root cell",
                })
    return rows


def variable_names(spec: dict[str, object]) -> tuple[str, ...]:
    other = {
        4: ("S1", "S2"),
        3: ("L", "S"),
        2: ("S",),
        1: ("L",),
        0: (),
    }[spec["other_long_count"]]
    return (("R",) if spec["selected_kind"] == "long" else ()) + other


def ordered_spec_digest(specs: list[dict[str, object]]) -> str:
    digest = hashlib.sha256()
    for spec in specs:
        digest.update(
            (json.dumps(spec, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
        )
    return digest.hexdigest().upper()


def audit_pigeonhole_ledger(specs: list[dict[str, object]]) -> dict[str, object]:
    lemmas: set[tuple[int, int, int]] = set()
    union_pairs = 0
    for spec in specs:
        deficit = spec["offset_total_needed"]
        shift = spec["shift"]
        long_total = spec["other_long_count"] + (spec["selected_kind"] == "long")
        if deficit:
            assert shift == math.ceil(deficit / long_total)
            assert long_total * (shift - 1) < deficit <= long_total * shift
            lemmas.add((long_total, deficit, shift))
        else:
            assert shift == 0
        if (
            spec["selected_kind"] == "long"
            and deficit
            and spec["shift_target"] == "selected"
            and spec["other_long_count"]
        ):
            union_pairs += 1
    assert union_pairs == 46
    return {
        "distinct_pigeonhole_triples": len(lemmas),
        "triples": [
            {"long_offsets": m, "deficit": d, "threshold": s}
            for m, d, s in sorted(lemmas)
        ],
        "selected_vs_companion_union_pairs": union_pairs,
        "contrapositive_checked": "m*(threshold-1) < deficit for every routed triple",
    }


def symbolic_path_count(order: sp.Expr, grade: int) -> sp.Expr:
    if grade < 0:
        return sp.Integer(0)
    return sp.prod(order - grade + 1 - shift for shift in range(grade)) / sp.factorial(grade)


def symbolic_path_vector(order: sp.Expr) -> tuple[sp.Expr, ...]:
    return tuple(symbolic_path_count(order, grade) for grade in range(MAX_GRADE + 1))


def symbolic_product(factors: list[tuple[sp.Expr, ...]]) -> tuple[sp.Expr, ...]:
    values = (sp.Integer(1),) + (sp.Integer(0),) * MAX_GRADE
    for factor in factors:
        values = tuple(
            sp.expand(sum(values[index] * factor[grade - index] for index in range(grade + 1)))
            for grade in range(MAX_GRADE + 1)
        )
    return values


def prove_universal_pair_split_identity() -> dict[str, object]:
    """Directly prove pair compression for every nonnegative split and shift."""
    A, B, D = sp.symbols("audit_A audit_B audit_D", nonnegative=True, integer=True)
    excluded_split = symbolic_product([
        symbolic_path_vector(A + D + 7),
        symbolic_path_vector(B + 7),
    ])
    excluded_axis = symbolic_product([
        symbolic_path_vector(A + B + D + 7),
        symbolic_path_vector(sp.Integer(7)),
    ])
    reduced_split = symbolic_product([
        symbolic_path_vector(A + D + 6),
        symbolic_path_vector(B + 6),
    ])
    reduced_axis = symbolic_product([
        symbolic_path_vector(A + B + D + 6),
        symbolic_path_vector(sp.Integer(6)),
    ])
    identities = []
    for grade in range(9):
        difference = sp.Poly(
            sp.expand(excluded_split[grade] - excluded_axis[grade]),
            A, B, D, domain=sp.QQ,
        )
        assert difference.is_zero
        identities.append(f"excluded_{grade}")
    for grade in range(8):
        difference = sp.Poly(
            sp.expand(reduced_split[grade] - reduced_axis[grade]),
            A, B, D, domain=sp.QQ,
        )
        assert difference.is_zero
        identities.append(f"reduced_{grade}")
    assert len(identities) == 17
    return {
        "variables": ["A", "B", "D"],
        "domain": "all nonnegative integer A,B,D",
        "zero_polynomial_identities": identities,
        "identity_count": len(identities),
    }


ZERO = (0,) * (MAX_GRADE + 1)
ONE = (1,) + (0,) * MAX_GRADE


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(a + b for a, b in zip(left, right, strict=True))


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    answer = [0] * (MAX_GRADE + 1)
    for left_grade, left_value in enumerate(left):
        if not left_value:
            continue
        for right_grade, right_value in enumerate(right[:MAX_GRADE + 1 - left_grade]):
            if right_value:
                answer[left_grade + right_grade] += left_value * right_value
    return tuple(answer)


def times_x(polynomial: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + polynomial[:MAX_GRADE]


def append_path(adjacency: list[list[int]], start: int, length: int) -> int:
    assert length >= 1
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    return previous


def literal_star(arms: tuple[int, ...]) -> tuple[list[list[int]], int]:
    assert len(arms) == 5 and min(arms) >= 1
    adjacency: list[list[int]] = [[]]
    endpoints = [append_path(adjacency, 0, length) for length in arms]
    root = endpoints[0]
    assert len(adjacency) == 1 + sum(arms)
    assert len(adjacency[0]) == 5
    assert len(adjacency[root]) == 1
    assert sum(len(row) for row in adjacency) == 2 * (len(adjacency) - 1)
    assert sum(math.comb(max(len(row) - 1, 0), 2) for row in adjacency) == 6
    return adjacency, root


def forest_polynomial(adjacency: list[list[int]], removed: int | None) -> tuple[int, ...]:
    seen = set() if removed is None else {removed}

    def visit(vertex: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        seen.add(vertex)
        excluded = ONE
        included_children = ONE
        for child in adjacency[vertex]:
            if child == parent or child in seen:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included))
            included_children = multiply(included_children, child_excluded)
        return excluded, times_x(included_children)

    answer = ONE
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        excluded, included = visit(vertex, -1)
        answer = multiply(answer, add(excluded, included))
    return answer


def literal_profile(arms: tuple[int, ...]) -> tuple[int, ...]:
    adjacency, root = literal_star(arms)
    core = forest_polynomial(adjacency, None)
    deletion = forest_polynomial(adjacency, root)
    order = len(adjacency)
    assert core[0] == deletion[0] == 1
    assert core[1] == order and deletion[1] == order - 1
    assert core[2] == math.comb(order - 1, 2)
    assert core[3] == math.comb(order - 2, 3) + 6
    return (*core[3:9], deletion[6], deletion[7])


def split_options(total: int) -> list[tuple[int, int]]:
    rows = [(total, 0), ((total + 1) // 2, total // 2)]
    return list(dict.fromkeys(rows))


def arm_variants(
    spec: dict[str, object], point: tuple[int, ...]
) -> list[tuple[int, ...]]:
    names = variable_names(spec)
    values = dict(zip(names, point, strict=True))
    selected_shift = spec["shift"] if spec["shift_target"] == "selected" else 0
    other_shift = spec["shift"] if spec["shift_target"] == "other" else 0
    if spec["selected_kind"] == "long":
        selected = values["R"] + 7 + selected_shift
    else:
        selected = spec["selected_short"]

    count = spec["other_long_count"]
    shorts = tuple(spec["other_shorts"])
    variants: list[tuple[int, ...]] = []
    if count == 4:
        for A, B in split_options(values["S1"]):
            for C, D in split_options(values["S2"]):
                variants.append((selected, A + 7 + other_shift, B + 7, C + 7, D + 7))
    elif count == 3:
        for A, B in split_options(values["S"]):
            variants.append((selected, values["L"] + 7 + other_shift, A + 7, B + 7, *shorts))
    elif count == 2:
        for A, B in split_options(values["S"]):
            variants.append((selected, A + 7 + other_shift, B + 7, *shorts))
    elif count == 1:
        variants.append((selected, values["L"] + 7 + other_shift, *shorts))
    elif count == 0:
        variants.append((selected, *shorts))
    else:
        raise ValueError(count)
    assert all(len(row) == 5 and min(row) >= 1 for row in variants)
    expected_order = (
        spec["baseline_order_before_shift"] + spec["shift"] + sum(point)
    )
    assert all(1 + sum(row) == expected_order for row in variants)
    return list(dict.fromkeys(variants))


def subtract_vectors(
    right: tuple[int, ...], left: tuple[int, ...]
) -> tuple[int, ...]:
    return tuple(b - a for a, b in zip(left, right, strict=True))


def mixed_forward_differences(
    samples: dict[tuple[int, ...], tuple[int, ...]], dimension: int
) -> dict[tuple[int, ...], tuple[int, ...]]:
    tensor = dict(samples)
    if dimension == 0:
        assert set(tensor) == {()}
        return tensor
    expected = set(itertools.product(range(9), repeat=dimension))
    assert set(tensor) == expected
    for axis in range(dimension):
        other_axes = tuple(index for index in range(dimension) if index != axis)
        for fixed in itertools.product(range(9), repeat=dimension - 1):
            base = [0] * dimension
            for index, value in zip(other_axes, fixed, strict=True):
                base[index] = value
            column = []
            for coordinate in range(9):
                base[axis] = coordinate
                column.append(tensor[tuple(base)])
            coefficients = []
            current = column
            while current:
                coefficients.append(current[0])
                current = [
                    subtract_vectors(right, left)
                    for left, right in zip(current, current[1:])
                ]
            assert len(coefficients) == 9
            for coordinate, value in enumerate(coefficients):
                base[axis] = coordinate
                tensor[tuple(base)] = value
    return tensor


def binomial_basis(variable: fmpq_mpoly, context: fmpq_mpoly_ctx) -> list[fmpq_mpoly]:
    rows = [context.constant(1)]
    for degree in range(1, 9):
        rows.append(rows[-1] * (variable - degree + 1) / degree)
    return rows


def interpolate_literal_profile(
    samples: dict[tuple[int, ...], tuple[int, ...]], names: tuple[str, ...]
) -> tuple[list[fmpq_mpoly], fmpq_mpoly_ctx, dict[str, object]]:
    dimension = len(names)
    context_names = names or ("DUMMY",)
    context = fmpq_mpoly_ctx.get(context_names, "degrevlex")
    variables = context.gens()[:dimension]
    differences = mixed_forward_differences(samples, dimension)
    bases = [binomial_basis(variable, context) for variable in variables]
    polynomials = [context.constant(0) for _ in SOURCE_SYMBOLS]
    nonzero_newton = 0
    for index, values in differences.items():
        if not any(values):
            continue
        nonzero_newton += sum(value != 0 for value in values)
        basis = context.constant(1)
        for axis, degree in enumerate(index):
            basis *= bases[axis][degree]
        for coordinate, value in enumerate(values):
            if value:
                polynomials[coordinate] += value * basis
    assert all(max((int(value) for value in poly.degrees()[:dimension]), default=0) <= 8 for poly in polynomials)
    return polynomials, context, {
        "sample_points": len(samples),
        "mixed_newton_entries": len(differences) * len(SOURCE_SYMBOLS),
        "nonzero_mixed_newton_entries": nonzero_newton,
    }


def integer(value: fmpq) -> int:
    assert value.denom() == 1
    return int(value.numer())


def evaluate_polynomial(
    polynomial: fmpq_mpoly, point: tuple[int, ...], active_dimension: int
) -> int:
    total = fmpq(0)
    for powers, coefficient in polynomial.terms():
        term = coefficient
        for axis in range(active_dimension):
            term *= point[axis] ** powers[axis]
        total += term
    return integer(total)


def accumulate_residual(
    rank: int,
    source_values: list[fmpq_mpoly],
    context: fmpq_mpoly_ctx,
) -> fmpq_mpoly:
    powers = [
        [context.constant(1), *[value ** exponent for exponent in range(1, maximum + 1)]]
        for value, maximum in zip(source_values, MAX_SOURCE_POWERS, strict=True)
    ]
    answer = context.constant(0)
    for exponents, coefficient in DELTA_TERMS[rank]:
        term = context.constant(coefficient)
        for coordinate, exponent in enumerate(exponents):
            if exponent:
                term *= powers[coordinate][exponent]
        answer += term
    return answer


def digest_terms(polynomial: fmpq_mpoly, active_dimension: int) -> str:
    digest = hashlib.sha256()
    for powers, coefficient in sorted(polynomial.terms()):
        normalized = powers[:active_dimension] if active_dimension else ()
        digest.update(
            (",".join(map(str, normalized)) + "|" + str(coefficient) + "\n").encode("ascii")
        )
    return digest.hexdigest().upper()


def polynomial_record(
    polynomial: fmpq_mpoly,
    context: fmpq_mpoly_ctx,
    active_dimension: int,
) -> dict[str, object]:
    coefficients = polynomial.coeffs()
    assert coefficients
    return {
        "degrees": [int(value) for value in polynomial.degrees()[:active_dimension]],
        "terms": len(polynomial),
        "negative_coefficients": sum(bool(value < 0) for value in coefficients),
        "zero_coefficients": sum(bool(value == 0) for value in coefficients),
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(polynomial[(0,) * len(context.gens())]),
        "ordered_term_sha256": digest_terms(polynomial, active_dimension),
    }


def main() -> None:
    started = time.perf_counter()
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    assert sha256(CERTIFICATE) == CERTIFICATE_SHA256
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == "PASS_EXACT_RANK8_DELTA03_E6_QUINTIC_STAR_LEAF_N28_PLUS"
    structural = json.loads(
        (HERE / "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json").read_text(
            encoding="utf-8"
        )
    )
    skeleton = structural["skeletons"][0]
    assert skeleton["name"] == "e6_skeleton_01"
    assert skeleton["root_location_partition"]["counts"]["leaf"] == 1

    specs = independent_cover_specs()
    assert len(specs) == len(certificate["cells"]) == 774
    metadata_keys = tuple(specs[0])
    for spec, stored in zip(specs, certificate["cells"], strict=True):
        assert {key: stored[key] for key in metadata_keys} == spec
        assert stored["variables"] == list(variable_names(spec))
    ledger = audit_pigeonhole_ledger(specs)
    pair_identity = prove_universal_pair_split_identity()

    cell_replay = []
    grid_points = 0
    grid_variant_profiles = 0
    holdout_points = 0
    holdout_variant_profiles = 0
    profile_coordinate_comparisons = 0
    mixed_newton_entries = 0
    nonzero_mixed_newton_entries = 0
    for cell_index, (spec, stored) in enumerate(
        zip(specs, certificate["cells"], strict=True), start=1
    ):
        names = variable_names(spec)
        dimension = len(names)
        samples: dict[tuple[int, ...], tuple[int, ...]] = {}
        split_variant_count = 0
        for point in itertools.product(range(9), repeat=dimension):
            canonical = None
            variants = arm_variants(spec, point)
            for arms in variants:
                profile = literal_profile(arms)
                if canonical is None:
                    canonical = profile
                else:
                    assert profile == canonical
                    profile_coordinate_comparisons += len(SOURCE_SYMBOLS)
                grid_variant_profiles += 1
                split_variant_count += 1
            assert canonical is not None
            samples[point] = canonical
            grid_points += 1

        source_values, context, interpolation = interpolate_literal_profile(samples, names)
        mixed_newton_entries += interpolation["mixed_newton_entries"]
        nonzero_mixed_newton_entries += interpolation["nonzero_mixed_newton_entries"]

        cell_holdouts = 0
        if dimension:
            for point in itertools.product((9, 10), repeat=dimension):
                canonical = None
                for arms in arm_variants(spec, point):
                    profile = literal_profile(arms)
                    if canonical is None:
                        canonical = profile
                    else:
                        assert profile == canonical
                        profile_coordinate_comparisons += len(SOURCE_SYMBOLS)
                    holdout_variant_profiles += 1
                assert canonical is not None
                reconstructed = tuple(
                    evaluate_polynomial(polynomial, point, dimension)
                    for polynomial in source_values
                )
                assert reconstructed == canonical
                profile_coordinate_comparisons += len(SOURCE_SYMBOLS)
                holdout_points += 1
                cell_holdouts += 1

        rank_rows = []
        for rank in RANKS:
            result = accumulate_residual(rank, source_values, context)
            record = polynomial_record(result, context, dimension)
            assert record == stored["ranks"][str(rank)], (
                cell_index, rank, record, stored["ranks"][str(rank)]
            )
            rank_rows.append({
                "rank": rank,
                "terms": record["terms"],
                "ordered_term_sha256": record["ordered_term_sha256"],
                "digest_match": True,
            })
        cell_replay.append({
            "cell_index": cell_index,
            "selected_kind": spec["selected_kind"],
            "selected_short": spec["selected_short"],
            "other_long_count": spec["other_long_count"],
            "other_shorts": spec["other_shorts"],
            "shift_target": spec["shift_target"],
            "shift": spec["shift"],
            "variables": list(names),
            "literal_grid_points": 9 ** dimension,
            "literal_grid_split_variants": split_variant_count,
            "literal_holdout_points": cell_holdouts,
            "interpolation": interpolation,
            "rank_digest_replay": rank_rows,
        })
        print(
            "AUDIT_E6_LEAF",
            cell_index,
            774,
            spec["selected_kind"],
            spec["selected_short"],
            spec["other_long_count"],
            tuple(spec["other_shorts"]),
            spec["shift_target"],
            spec["shift"],
            flush=True,
        )

    assert grid_points == 23774
    assert len(cell_replay) == 774
    assert sum(len(row["rank_digest_replay"]) for row in cell_replay) == 3096
    rank_totals = {
        str(rank): {
            "coefficients_replayed": sum(
                row["rank_digest_replay"][rank]["terms"] for row in cell_replay
            ),
            "expected_coefficients": certificate["rank_totals"][str(rank)]["coefficients"],
        }
        for rank in RANKS
    }
    assert all(
        row["coefficients_replayed"] == row["expected_coefficients"]
        for row in rank_totals.values()
    )
    assert sum(row["coefficients_replayed"] for row in rank_totals.values()) == 423763

    payload = {
        "schema": "rank8-delta03-e6-quintic-star-leaf-n28-plus-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DP_AUDIT_RANK8_DELTA03_E6_QUINTIC_STAR_LEAF_N28_PLUS",
        "certificate": CERTIFICATE.name,
        "certificate_sha256": CERTIFICATE_SHA256,
        "immutable_input_hashes": actual_hashes,
        "independence_boundary": {
            "producer": "compressed long-pair path factors accumulated directly as exact multivariate polynomials",
            "audit": "literal five-arm adjacency lists, distinguished endpoint deletion, recursive include/exclude forest DP, and mixed-forward-difference interpolation of all eight source coordinates",
            "pair_split": "17 universal zero-polynomial identities in independent A,B,D variables; no bounded shift inference",
            "holdouts": "literal DP at every mixed {9,10} tensor point outside the 0..8 interpolation grid",
            "shared_only": "canonical residual definition, immutable structural report, and stored ordered digests",
            "producer_imported": False,
        },
        "routing_ledger": {
            "ordered_cell_spec_sha256": ordered_spec_digest(specs),
            "cells": len(specs),
            "selected_long": sum(spec["selected_kind"] == "long" for spec in specs),
            "selected_short_with_long_companion": sum(
                spec["selected_kind"] == "short" and spec["other_long_count"] > 0
                for spec in specs
            ),
            "all_short_fixed": sum(
                spec["selected_kind"] == "short" and spec["other_long_count"] == 0
                for spec in specs
            ),
            "pigeonhole": ledger,
            "overlap_boundary": "the selected-large and companion-large suborthants can overlap; the exact union is gap-free",
        },
        "universal_pair_split_identity": pair_identity,
        "cell_replay": cell_replay,
        "rank_totals": rank_totals,
        "coverage_totals": {
            "cells": 774,
            "ranks": 4,
            "rank_cells": 3096,
            "literal_interpolation_grid_points": grid_points,
            "literal_interpolation_grid_variant_profiles": grid_variant_profiles,
            "literal_holdout_points": holdout_points,
            "literal_holdout_variant_profiles": holdout_variant_profiles,
            "literal_profiles_total": grid_variant_profiles + holdout_variant_profiles,
            "literal_forest_dp_runs": 2 * (grid_variant_profiles + holdout_variant_profiles),
            "profile_coordinate_comparisons": profile_coordinate_comparisons,
            "mixed_newton_entries": mixed_newton_entries,
            "nonzero_mixed_newton_entries": nonzero_mixed_newton_entries,
            "universal_pair_split_zero_identities": 17,
            "ordered_term_digests_replayed": 3096,
            "ordered_coefficients_replayed": 423763,
            "digest_mismatches": 0,
            "negative_coefficients": 0,
        },
        "runtime_seconds": time.perf_counter() - started,
        "scope_guard": "Only Delta0..3 at the unique leaf-root orbit of e6_skeleton_01 for n>=28; no pendant-interior root, other skeleton, increment, or Problem 993 claim.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("literal_grid_points", grid_points, flush=True)
    print("literal_profiles", payload["coverage_totals"]["literal_profiles_total"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
