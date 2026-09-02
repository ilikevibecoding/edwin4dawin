#!/usr/bin/env python3
"""Exact Delta0--3 cover for internally rooted e=6 quintic stars, n>=28."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
import argparse
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly, fmpq_mpoly_ctx

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e6_quintic_star_internal_n28_plus_exact_agent_20260825.json"
CHECKPOINT = HERE / "rank8_delta03_e6_quintic_star_internal_n28_plus_checkpoint_agent_20260825.jsonl"
MAX_GRADE = 8
RANKS = (0, 1, 2, 3)
LONG = "L"
SOURCE_SYMBOLS = (*c[3:9], h[6], h[7])
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
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


def append_checkpoint(path: Path, payload: dict[str, object]) -> None:
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(payload, separators=(",", ":")) + "\n")
        handle.flush()
        os.fsync(handle.fileno())


def load_checkpoint(
    path: Path,
    source_hash: str,
    input_hashes: dict[str, str],
    specs: list[dict[str, object]],
) -> list[dict[str, object]]:
    if not path.exists():
        append_checkpoint(path, {
            "schema": "rank8-delta03-e6-quintic-star-internal-checkpoint-v1",
            "producer_source_sha256": source_hash,
            "immutable_input_hashes": input_hashes,
            "cover_cells": len(specs),
        })
        return []
    rows = path.read_text(encoding="utf-8").splitlines()
    assert rows, "empty checkpoint"
    header = json.loads(rows[0])
    assert header == {
        "schema": "rank8-delta03-e6-quintic-star-internal-checkpoint-v1",
        "producer_source_sha256": source_hash,
        "immutable_input_hashes": input_hashes,
        "cover_cells": len(specs),
    }, header
    cells: list[dict[str, object]] = []
    for expected_index, line in enumerate(rows[1:], start=1):
        record = json.loads(line)
        assert record["cell_index"] == expected_index, record
        cell = record["cell"]
        spec = specs[expected_index - 1]
        for key, value in spec.items():
            assert cell[key] == value, (expected_index, key, cell[key], value)
        cells.append(cell)
    assert len(cells) <= len(specs)
    return cells


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
    values = [context.constant(1)] + [context.constant(0)] * MAX_GRADE
    for factor in factors:
        values = [
            sum(
                (values[index] * factor[grade - index] for index in range(grade + 1)),
                context.constant(0),
            )
            for grade in range(MAX_GRADE + 1)
        ]
    return values


def convolve(
    left: list[fmpq_mpoly],
    right: list[fmpq_mpoly],
    grade: int,
    context: fmpq_mpoly_ctx,
) -> fmpq_mpoly:
    return sum(
        (left[index] * right[grade - index] for index in range(grade + 1)),
        context.constant(0),
    )


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
        excluded.extend((
            two_long_paths(S1 + 14 + distinguished_shift, context),
            two_long_paths(S2 + 14, context),
        ))
        reduced.extend((
            two_long_paths(S1 + 12 + distinguished_shift, context),
            two_long_paths(S2 + 12, context),
        ))
    elif long_count == 3:
        L, S = variables["O"], variables["S"]
        excluded.extend((
            path_vector(L + 7 + distinguished_shift, context),
            two_long_paths(S + 14, context),
        ))
        reduced.extend((
            path_vector(L + 6 + distinguished_shift, context),
            two_long_paths(S + 12, context),
        ))
    elif long_count == 2:
        S = variables["S"]
        excluded.append(two_long_paths(S + 14 + distinguished_shift, context))
        reduced.append(two_long_paths(S + 12 + distinguished_shift, context))
    elif long_count == 1:
        O = variables["O"]
        excluded.append(path_vector(O + 7 + distinguished_shift, context))
        reduced.append(path_vector(O + 6 + distinguished_shift, context))
    elif long_count == 0:
        assert distinguished_shift == 0
    else:
        raise ValueError(long_count)
    for short in shorts:
        excluded.append(path_vector(short, context))
        reduced.append(path_vector(short - 1, context))
    return excluded, reduced


def star_vector(
    first_arm: int | fmpq_mpoly,
    other_excluded: list[list[fmpq_mpoly]],
    other_reduced: list[list[fmpq_mpoly]],
    context: fmpq_mpoly_ctx,
) -> list[fmpq_mpoly]:
    excluded = vector_product(
        [path_vector(first_arm, context), *other_excluded], context
    )
    reduced = vector_product(
        [path_vector(first_arm - 1, context), *other_reduced], context
    )
    return [
        excluded[grade] + (reduced[grade - 1] if grade else context.constant(0))
        for grade in range(MAX_GRADE + 1)
    ]


def active_names(spec: dict[str, object]) -> tuple[str, ...]:
    names: tuple[str, ...] = ()
    if spec["near"] == LONG:
        names += ("N",)
    if spec["tail"] == LONG:
        names += ("T",)
    names += {
        4: ("S1", "S2"),
        3: ("O", "S"),
        2: ("S",),
        1: ("O",),
        0: (),
    }[spec["other_long_count"]]
    return names


def build_profile(
    spec: dict[str, object],
) -> tuple[dict[sp.Symbol, fmpq_mpoly], fmpq_mpoly_ctx, tuple[str, ...]]:
    names = active_names(spec)
    context = fmpq_mpoly_ctx.get(names or ("DUMMY",), "degrevlex")
    variables = dict(zip(names or ("DUMMY",), context.gens()))
    shift = spec["shift"]
    near = (
        variables["N"] + 7 + (shift if spec["shift_target"] == "near" else 0)
        if spec["near"] == LONG else spec["near"]
    )
    tail = (
        variables["T"] + 7 + (shift if spec["shift_target"] == "tail" else 0)
        if spec["tail"] == LONG else spec["tail"]
    )
    other_excluded, other_reduced = other_arm_factors(
        spec["other_long_count"],
        tuple(spec["other_shorts"]),
        shift if spec["shift_target"] == "other" else 0,
        variables,
        context,
    )
    core = star_vector(near + tail + 1, other_excluded, other_reduced, context)
    center_side = star_vector(near, other_excluded, other_reduced, context)
    tail_side = path_vector(tail, context)
    profile = {c[grade]: core[grade] for grade in range(3, 9)}
    profile.update({
        h[grade]: convolve(tail_side, center_side, grade, context)
        for grade in (6, 7)
    })
    return profile, context, names


def cover_specs() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for near in (LONG, *range(7)):
        for tail in (LONG, *range(1, 7)):
            for others in itertools.combinations_with_replacement((LONG, *range(1, 7)), 4):
                other_long_count = others.count(LONG)
                other_shorts = tuple(value for value in others if value != LONG)
                long_count = (near == LONG) + (tail == LONG) + other_long_count
                baseline = (
                    2
                    + (7 if near == LONG else near)
                    + (7 if tail == LONG else tail)
                    + 7 * other_long_count
                    + sum(other_shorts)
                )
                deficit = max(0, 28 - baseline)
                if long_count == 0:
                    if deficit:
                        continue
                    targets = (("none", 0),)
                elif deficit == 0:
                    targets = (("none", 0),)
                else:
                    shift = math.ceil(deficit / long_count)
                    targets = tuple(
                        (target, shift)
                        for target, present in (
                            ("near", near == LONG),
                            ("tail", tail == LONG),
                            ("other", other_long_count > 0),
                        )
                        if present
                    )
                for target, shift in targets:
                    rows.append({
                        "near": near,
                        "tail": tail,
                        "other_long_count": other_long_count,
                        "other_shorts": list(other_shorts),
                        "long_segment_count": long_count,
                        "baseline_order_before_shift": baseline,
                        "offset_total_needed": deficit,
                        "shift_target": target,
                        "shift": shift,
                        "coverage": (
                            "role-orbit pigeonhole union" if deficit else "full nonnegative orthant"
                        ),
                    })
    assert len(rows) == 7557
    return rows


def digest_terms(polynomial: fmpq_mpoly, dimension: int) -> str:
    digest = hashlib.sha256()
    for powers, coefficient in sorted(polynomial.terms()):
        normalized = powers[:dimension] if dimension else ()
        digest.update(
            (",".join(map(str, normalized)) + "|" + str(coefficient) + "\n").encode("ascii")
        )
    return digest.hexdigest().upper()


def evaluate_cell(spec: dict[str, object]) -> dict[str, object]:
    profile, context, names = build_profile(spec)
    source = [profile[symbol] for symbol in SOURCE_SYMBOLS]
    powers = [
        [context.constant(1), *[value ** exponent for exponent in range(1, maximum + 1)]]
        for value, maximum in zip(source, MAX_SOURCE_POWERS, strict=True)
    ]
    ranks = {}
    for rank in RANKS:
        result = context.constant(0)
        for source_powers, coefficient in DELTA_TERMS[rank]:
            term = context.constant(coefficient)
            for index, exponent in enumerate(source_powers):
                if exponent:
                    term *= powers[index][exponent]
            result += term
        coefficients = result.coeffs()
        negative = sum(bool(value < 0) for value in coefficients)
        zero = sum(bool(value == 0) for value in coefficients)
        constant = result[(0,) * len(context.gens())]
        assert negative == zero == 0 and constant > 0, (
            spec, rank, min(coefficients), constant
        )
        ranks[str(rank)] = {
            "degrees": [int(value) for value in result.degrees()[:len(names)]],
            "terms": len(result),
            "negative_coefficients": negative,
            "zero_coefficients": zero,
            "minimum_coefficient": str(min(coefficients)),
            "constant_coefficient": str(constant),
            "ordered_term_sha256": digest_terms(result, len(names)),
        }
    return {**spec, "variables": list(names), "ranks": ranks}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--checkpoint",
        type=Path,
        default=CHECKPOINT,
        help="append-only exact-cell checkpoint (default: canonical lane checkpoint)",
    )
    args = parser.parse_args()
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    structural = json.loads(
        (HERE / "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json").read_text(
            encoding="utf-8"
        )
    )
    skeleton = structural["skeletons"][0]
    assert skeleton["name"] == "e6_skeleton_01"
    assert skeleton["root_location_partition"]["counts"]["pendant_internal"] == 1

    specs = cover_specs()
    source_hash = sha256(Path(__file__))
    cells = load_checkpoint(args.checkpoint, source_hash, actual_hashes, specs)
    if cells:
        print("E6_INTERNAL_RESUME", len(cells), len(specs), flush=True)
    for index in range(len(cells) + 1, len(specs) + 1):
        spec = specs[index - 1]
        cell = evaluate_cell(spec)
        append_checkpoint(args.checkpoint, {"cell_index": index, "cell": cell})
        cells.append(cell)
        if index <= 20 or index % 25 == 0 or index == len(specs):
            print(
                "E6_INTERNAL_PASS", index, len(specs), spec["near"], spec["tail"],
                spec["other_long_count"], tuple(spec["other_shorts"]),
                spec["shift_target"], spec["shift"], flush=True,
            )

    fixed = [cell for cell in cells if not cell["variables"]]
    assert len(fixed) == 830
    assert min(cell["baseline_order_before_shift"] for cell in fixed) == 28
    assert max(cell["baseline_order_before_shift"] for cell in fixed) == 38
    dimensions = {
        str(dimension): sum(len(cell["variables"]) == dimension for cell in cells)
        for dimension in range(5)
    }
    assert dimensions == {"0": 830, "1": 4872, "2": 1676, "3": 172, "4": 7}
    rank_totals = {
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
    role_counts = {
        target: sum(cell["shift_target"] == target for cell in cells)
        for target in ("none", "near", "tail", "other")
    }
    assert role_counts == {"none": 4283, "near": 571, "tail": 717, "other": 1986}
    payload = {
        "schema": "rank8-delta03-e6-quintic-star-internal-n28-plus-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E6_QUINTIC_STAR_INTERNAL_N28_PLUS",
        "exact_scope": {
            "skeleton": "e6_skeleton_01, the five-arm star with one degree-5 center",
            "subdivisions": "all five positive arm lengths",
            "root": "any degree-2 vertex internal to one arm; the unique pendant-internal root-location family",
            "orders": "every n>=28",
            "ranks": [0, 1, 2, 3],
            "claim": "strict positivity of all four rooted rank-eight terminal values",
        },
        "coordinates": {
            "near": "vertices strictly between the center and root; short 0..6 or N+7",
            "tail": "vertices after the root through the endpoint leaf; short 1..6 or T+7",
            "other_arms": "four unordered positive lengths; short 1..6 or long",
            "order": "n=near+tail+other1+other2+other3+other4+2",
            "root_deleted_forest": "a near-side center star times the tail path",
        },
        "no_gap_cover": {
            "cover_cells": len(cells),
            "dimension_counts": dimensions,
            "shift_target_counts": role_counts,
            "fixed_all_short_cells": len(fixed),
            "fixed_all_short_orders": [28, 38],
            "pigeonhole_rule": "if the order deficit is D across m long offsets, some present role-orbit offset is at least ceil(D/m)",
            "overlap_boundary": "near-large, tail-large, and companion-large suborthants can overlap; their role-orbit union is exact and gap-free",
            "exhausts_n28_plus": True,
        },
        "rank_totals": rank_totals,
        "cells": cells,
        "immutable_input_hashes": actual_hashes,
        "scope_boundary": "Only the pendant-interior root family of e6_skeleton_01. Center/leaf gates remain separate; other e=6 skeletons, increments, and Problem 993 remain open.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("cells", len(cells), dimensions, role_counts, flush=True)
    print("rank_totals", rank_totals, flush=True)
    print("source_sha256", source_hash, flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
