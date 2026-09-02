#!/usr/bin/env python3
"""Exact Delta0--3 cover for leaf-rooted e=6 quintic stars, n>=28."""

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
OUTPUT = HERE / "rank8_delta03_e6_quintic_star_leaf_n28_plus_exact_agent_20260825.json"
MAX_GRADE = 8
RANKS = (0, 1, 2, 3)
SOURCE_SYMBOLS = (*c[3:9], h[6], h[7])
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json":
        "B8D2D160F679361AED1D337B9E814DA6B985ACCD19434DF629887DE0E7AE5307",
    "rank8_delta03_e6_skeleton_root_partition_independent_audit_20260825.json":
        "247DF3AC57F265839055CCF258BCC1E946A0470BAE83F2B79E61F1D8BD17E65F",
    "rank8_delta03_e6_quintic_star_center_n28_plus_gate_exact_agent_20260825.json":
        "FF5CA4FC0F35B09B15A72E0D59287258C5344F9C70AAA9FEE087436C216FF76C",
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


def path_count(
    order: int | fmpq_mpoly,
    grade: int,
    context: fmpq_mpoly_ctx,
) -> fmpq_mpoly:
    if grade < 0:
        return context.constant(0)
    if isinstance(order, int):
        if order == -1:
            return context.constant(1 if grade == 0 else 0)
        assert order >= 0
        top = order - grade + 1
        return context.constant(math.comb(top, grade) if top >= grade else 0)
    value = context.constant(1)
    for shift in range(grade):
        value *= order - grade + 1 - shift
    return value / math.factorial(grade)


def path_vector(
    order: int | fmpq_mpoly,
    context: fmpq_mpoly_ctx,
) -> list[fmpq_mpoly]:
    return [path_count(order, grade, context) for grade in range(MAX_GRADE + 1)]


def two_long_paths(
    total_order: fmpq_mpoly,
    context: fmpq_mpoly_ctx,
) -> list[fmpq_mpoly]:
    return [
        sum(
            (
                path_count(total_order - 4 * pairs, grade - 2 * pairs, context)
                for pairs in range(grade // 2 + 1)
            ),
            context.constant(0),
        )
        for grade in range(MAX_GRADE + 1)
    ]


def vector_product(
    factors: list[list[fmpq_mpoly]],
    context: fmpq_mpoly_ctx,
) -> list[fmpq_mpoly]:
    answer = [context.constant(1)] + [context.constant(0)] * MAX_GRADE
    for factor in factors:
        answer = [
            sum(
                (answer[index] * factor[grade - index] for index in range(grade + 1)),
                context.constant(0),
            )
            for grade in range(MAX_GRADE + 1)
        ]
    return answer


def other_arm_factors(
    long_count: int,
    shorts: tuple[int, ...],
    distinguished_shift: int,
    variables: dict[str, fmpq_mpoly],
    context: fmpq_mpoly_ctx,
) -> tuple[list[list[fmpq_mpoly]], list[list[fmpq_mpoly]]]:
    assert long_count + len(shorts) == 4
    excluded: list[list[fmpq_mpoly]] = []
    reduced: list[list[fmpq_mpoly]] = []
    if long_count == 4:
        S1, S2 = variables["S1"], variables["S2"]
        excluded.extend([
            two_long_paths(S1 + 14 + distinguished_shift, context),
            two_long_paths(S2 + 14, context),
        ])
        reduced.extend([
            two_long_paths(S1 + 12 + distinguished_shift, context),
            two_long_paths(S2 + 12, context),
        ])
    elif long_count == 3:
        L, S = variables["L"], variables["S"]
        excluded.extend([
            path_vector(L + 7 + distinguished_shift, context),
            two_long_paths(S + 14, context),
        ])
        reduced.extend([
            path_vector(L + 6 + distinguished_shift, context),
            two_long_paths(S + 12, context),
        ])
    elif long_count == 2:
        S = variables["S"]
        excluded.append(two_long_paths(S + 14 + distinguished_shift, context))
        reduced.append(two_long_paths(S + 12 + distinguished_shift, context))
    elif long_count == 1:
        L = variables["L"]
        excluded.append(path_vector(L + 7 + distinguished_shift, context))
        reduced.append(path_vector(L + 6 + distinguished_shift, context))
    elif long_count == 0:
        assert distinguished_shift == 0
    else:
        raise ValueError(long_count)
    for short in shorts:
        excluded.append(path_vector(short, context))
        reduced.append(path_vector(short - 1, context))
    return excluded, reduced


def build_profile(
    selected_kind: str,
    selected_short: int | None,
    other_long_count: int,
    other_shorts: tuple[int, ...],
    shift_target: str,
    shift: int,
) -> tuple[dict[sp.Symbol, fmpq_mpoly], fmpq_mpoly_ctx, tuple[str, ...]]:
    assert selected_kind in ("long", "short")
    assert shift_target in ("none", "selected", "other")
    selected_shift = shift if shift_target == "selected" else 0
    other_shift = shift if shift_target == "other" else 0
    other_names = {
        4: ("S1", "S2"),
        3: ("L", "S"),
        2: ("S",),
        1: ("L",),
        0: (),
    }[other_long_count]
    active_names = (("R",) if selected_kind == "long" else ()) + other_names
    context_names = active_names or ("DUMMY",)
    context = fmpq_mpoly_ctx.get(context_names, "degrevlex")
    variables = dict(zip(context_names, context.gens()))
    other_excluded, other_reduced = other_arm_factors(
        other_long_count, other_shorts, other_shift, variables, context
    )
    if selected_kind == "long":
        R = variables["R"]
        selected_length = R + 7 + selected_shift
        assert selected_short is None
    else:
        assert selected_short is not None and 1 <= selected_short <= 6
        selected_length = selected_short
        assert shift_target != "selected"

    core_excluded = vector_product(
        [path_vector(selected_length, context), *other_excluded], context
    )
    core_reduced = vector_product(
        [path_vector(selected_length - 1, context), *other_reduced], context
    )
    core = [
        core_excluded[grade] + (core_reduced[grade - 1] if grade else context.constant(0))
        for grade in range(MAX_GRADE + 1)
    ]

    deletion_excluded = vector_product(
        [path_vector(selected_length - 1, context), *other_excluded], context
    )
    deletion_reduced = vector_product(
        [path_vector(selected_length - 2, context), *other_reduced], context
    )
    deletion = [
        deletion_excluded[grade]
        + (deletion_reduced[grade - 1] if grade else context.constant(0))
        for grade in range(MAX_GRADE + 1)
    ]
    profile = {c[grade]: core[grade] for grade in range(3, 9)}
    profile.update({h[6]: deletion[6], h[7]: deletion[7]})
    return profile, context, active_names


DELTA_TERMS = {
    rank: [
        (powers, rational(coefficient))
        for powers, coefficient in sp.Poly(
            sp.expand(newton_coefficients(residual())[rank]), *SOURCE_SYMBOLS, domain=sp.QQ
        ).terms()
    ]
    for rank in RANKS
}
MAX_SOURCE_POWERS = [
    max(powers[index] for rank in RANKS for powers, _ in DELTA_TERMS[rank])
    for index in range(len(SOURCE_SYMBOLS))
]


def digest_terms(polynomial: fmpq_mpoly, active_dimension: int) -> str:
    digest = hashlib.sha256()
    rows = sorted(polynomial.terms())
    for powers, coefficient in rows:
        normalized_powers = powers[:active_dimension] if active_dimension else ()
        digest.update(
            (",".join(map(str, normalized_powers)) + "|" + str(coefficient) + "\n").encode("ascii")
        )
    return digest.hexdigest().upper()


def evaluate_rank(
    rank: int,
    source_powers: list[list[fmpq_mpoly]],
    context: fmpq_mpoly_ctx,
) -> fmpq_mpoly:
    answer = context.constant(0)
    for powers, coefficient in DELTA_TERMS[rank]:
        term = context.constant(coefficient)
        for index, power in enumerate(powers):
            if power:
                term *= source_powers[index][power]
        answer += term
    return answer


def evaluate_cell(spec: dict[str, object]) -> dict[str, object]:
    started = time.perf_counter()
    profile, context, active_names = build_profile(
        spec["selected_kind"],
        spec["selected_short"],
        spec["other_long_count"],
        tuple(spec["other_shorts"]),
        spec["shift_target"],
        spec["shift"],
    )
    source_values = [profile[symbol] for symbol in SOURCE_SYMBOLS]
    source_powers = [
        [context.constant(1), *[value ** power for power in range(1, maximum + 1)]]
        for value, maximum in zip(source_values, MAX_SOURCE_POWERS, strict=True)
    ]
    ranks = {}
    for rank in RANKS:
        result = evaluate_rank(rank, source_powers, context)
        coefficients = result.coeffs()
        degrees = [int(value) for value in result.degrees()[:len(active_names)]]
        terms = len(result)
        constant = result[(0,) * len(context.gens())]
        negative = sum(bool(value < 0) for value in coefficients)
        zero = sum(bool(value == 0) for value in coefficients)
        assert negative == zero == 0, (spec, rank, min(coefficients))
        ranks[str(rank)] = {
            "degrees": degrees,
            "terms": terms,
            "negative_coefficients": negative,
            "zero_coefficients": zero,
            "minimum_coefficient": str(min(coefficients)),
            "constant_coefficient": str(constant),
            "ordered_term_sha256": digest_terms(result, len(active_names)),
        }
    return {
        **spec,
        "variables": list(active_names),
        "ranks": ranks,
        "runtime_seconds": time.perf_counter() - started,
    }


def cover_specs() -> list[dict[str, object]]:
    specs = []
    # Selected root arm long; the four companion arms remain symmetric.
    for other_long_count in range(4, -1, -1):
        short_count = 4 - other_long_count
        for shorts in itertools.combinations_with_replacement(range(1, 7), short_count):
            baseline = 1 + 7 + 7 * other_long_count + sum(shorts)
            needed = max(0, 28 - baseline)
            if needed == 0:
                targets = [("none", 0)]
            else:
                shift = math.ceil(needed / (other_long_count + 1))
                targets = [("selected", shift)]
                if other_long_count:
                    targets.append(("other", shift))
            for target, shift in targets:
                specs.append(
                    {
                        "selected_kind": "long",
                        "selected_short": None,
                        "other_long_count": other_long_count,
                        "other_shorts": list(shorts),
                        "baseline_order_before_shift": baseline,
                        "offset_total_needed": needed,
                        "shift_target": target,
                        "shift": shift,
                        "coverage": "selected-vs-companion pigeonhole union" if needed else "full nonnegative orthant",
                    }
                )

    # Selected root arm fixed short; only companion long arms carry offsets.
    for selected_short in range(1, 7):
        for other_long_count in range(4, 0, -1):
            short_count = 4 - other_long_count
            for shorts in itertools.combinations_with_replacement(range(1, 7), short_count):
                baseline = 1 + selected_short + 7 * other_long_count + sum(shorts)
                needed = max(0, 28 - baseline)
                shift = math.ceil(needed / other_long_count)
                specs.append(
                    {
                        "selected_kind": "short",
                        "selected_short": selected_short,
                        "other_long_count": other_long_count,
                        "other_shorts": list(shorts),
                        "baseline_order_before_shift": baseline,
                        "offset_total_needed": needed,
                        "shift_target": "other" if shift else "none",
                        "shift": shift,
                        "coverage": "companion-arm symmetry and pigeonhole" if needed else "full nonnegative orthant",
                    }
                )

    # Fully fixed all-short boundary.
    for selected_short in range(1, 7):
        for shorts in itertools.combinations_with_replacement(range(1, 7), 4):
            order = 1 + selected_short + sum(shorts)
            if order < 28:
                continue
            specs.append(
                {
                    "selected_kind": "short",
                    "selected_short": selected_short,
                    "other_long_count": 0,
                    "other_shorts": list(shorts),
                    "baseline_order_before_shift": order,
                    "offset_total_needed": 0,
                    "shift_target": "none",
                    "shift": 0,
                    "coverage": "literal fixed all-short leaf-root cell",
                }
            )
    return specs


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    structural = json.loads(
        (HERE / "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json").read_text(encoding="utf-8")
    )
    skeleton = structural["skeletons"][0]
    assert skeleton["name"] == "e6_skeleton_01"
    assert skeleton["root_location_partition"]["counts"]["leaf"] == 1

    specs = cover_specs()
    cells = []
    for index, spec in enumerate(specs, start=1):
        cells.append(evaluate_cell(spec))
        print(
            "E6_LEAF_PASS",
            index,
            len(specs),
            spec["selected_kind"],
            spec["selected_short"],
            spec["other_long_count"],
            tuple(spec["other_shorts"]),
            spec["shift_target"],
            spec["shift"],
            flush=True,
        )

    all_short = [cell for cell in cells if not cell["variables"]]
    assert len(all_short) == 14
    assert all(28 <= cell["baseline_order_before_shift"] <= 31 for cell in all_short)
    totals = {
        str(rank): {
            "cells": len(cells),
            "coefficients": sum(cell["ranks"][str(rank)]["terms"] for cell in cells),
            "negative_coefficients": 0,
            "zero_coefficients": 0,
            "minimum_coefficient": str(
                min(fmpq(cell["ranks"][str(rank)]["minimum_coefficient"]) for cell in cells)
            ),
        }
        for rank in RANKS
    }
    counts = {
        "selected_long_cells": sum(cell["selected_kind"] == "long" for cell in cells),
        "selected_short_with_long_companion_cells": sum(
            cell["selected_kind"] == "short" and cell["other_long_count"] > 0 for cell in cells
        ),
        "all_short_fixed_cells": len(all_short),
        "selected_vs_companion_union_pairs": sum(
            cell["selected_kind"] == "long"
            and cell["offset_total_needed"] > 0
            and cell["shift_target"] == "selected"
            and cell["other_long_count"] > 0
            for cell in cells
        ),
    }
    assert sum(counts[key] for key in (
        "selected_long_cells", "selected_short_with_long_companion_cells", "all_short_fixed_cells"
    )) == len(cells)
    payload = {
        "schema": "rank8-delta03-e6-quintic-star-leaf-n28-plus-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E6_QUINTIC_STAR_LEAF_N28_PLUS",
        "exact_scope": {
            "skeleton": "e6_skeleton_01, the five-arm star with one degree-5 center",
            "subdivisions": "all five positive arm lengths",
            "root": "the endpoint leaf of a distinguished arm; the unique leaf orbit",
            "orders": "every n>=28",
            "ranks": [0, 1, 2, 3],
            "claim": "strict positivity of all four rooted rank-eight terminal values",
        },
        "no_gap_cover": {
            "selected_arm": "distinguished; fixed 1..6 or R+7",
            "other_arms": "unordered; each fixed 1..6 or long",
            "pigeonhole_rule": "if an order deficit remains, either the selected long offset or a symmetric companion long offset reaches ceil(deficit/number_of_long_arms)",
            "cover_cells": len(cells),
            "counts": counts,
            "all_short_orders": [28, 31],
            "exhausts_n28_plus": True,
            "overlap_boundary": "selected-large and companion-large suborthants may overlap; their union is exact and gap-free",
        },
        "rank_totals": totals,
        "resources": {
            "engine": "python-flint fmpq_mpoly, serial, exact rational arithmetic",
            "cumulative_cell_runtime_seconds": sum(cell["runtime_seconds"] for cell in cells),
        },
        "cells": cells,
        "immutable_input_hashes": actual_hashes,
        "scope_boundary": "Only the leaf-root orbit of e6_skeleton_01. Pendant-interior roots, other e=6 skeletons, increments, and Problem 993 remain open.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("cells", len(cells), counts, flush=True)
    print("rank_totals", totals, flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
