#!/usr/bin/env python3
"""Exact Delta0/Delta1 certificate for every remaining quartic-star arm cell.

The root lies on one arm.  ``near`` and ``tail`` count the vertices strictly
between the root and, respectively, the degree-four center and the leaf;
the other three arms have positive lengths.  Every segment is split without
a gap into a fixed short value (0..6 for near/tail, 1..6 for another arm) or
``7 + offset``.  Two or three long, symmetric other arms are compressed with
the exact rank-eight two-path identity, leaving at most three variables in
each of the cells not already covered by the sealed all-long theorem.

The runner is deliberately serial.  It writes an atomic checkpoint and stops
at the first signed coefficient, so a partial run cannot be mistaken for a
certificate.
"""

from __future__ import annotations

import argparse
import gc
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


ROOT = Path(__file__).resolve().parent
CHECKPOINT = ROOT / "rank8_delta01_e3_quartic_star_arm_short_boundary_checkpoint_agent_20260822.json"
OUTPUT = ROOT / "rank8_delta01_e3_quartic_star_arm_short_boundary_exact_agent_20260822.json"
FAILURE = ROOT / "rank8_delta01_e3_quartic_star_arm_short_boundary_first_failure_agent_20260822.json"
ALL_LONG_REPORT = ROOT / "rank8_delta01_e3_quartic_star_arm_all_long_compressed_agent_20260822.json"
RANKS = (0, 1)
LONG = "L"
SOURCE_SYMBOLS = (*c[3:9], h[6], h[7])
EXPECTED_DEPENDENCIES = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_delta01_e3_quartic_star_arm_all_long_compressed_agent_20260822.json":
        "B4532D4B1D4B9714DC29D6454812D554B4721687338AD497B2DB6D7617770ED5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def rational(value: sp.Expr) -> fmpq:
    numerator, denominator = sp.fraction(value)
    return fmpq(int(numerator), int(denominator))


DELTA_TERMS = {
    rank: [
        (powers, rational(coefficient))
        for powers, coefficient in sp.Poly(
            sp.expand(newton_coefficients(residual())[rank]), *SOURCE_SYMBOLS
        ).terms()
    ]
    for rank in RANKS
}


def path_count(
    order: int | fmpq_mpoly,
    rank: int,
    context: fmpq_mpoly_ctx,
) -> fmpq_mpoly:
    if isinstance(order, int):
        if order == -1:
            return context.constant(1 if rank == 0 else 0)
        if order < -1:
            raise ValueError(order)
        top = order - rank + 1
        value = math.comb(top, rank) if top >= rank >= 0 else 0
        return context.constant(value)
    value = context.constant(1)
    for index in range(rank):
        value *= order - rank + 1 - index
    return value / math.factorial(rank)


def path_vector(
    order: int | fmpq_mpoly,
    max_rank: int,
    context: fmpq_mpoly_ctx,
) -> list[fmpq_mpoly]:
    return [path_count(order, rank, context) for rank in range(max_rank + 1)]


def vector_product(
    factors: list[list[fmpq_mpoly]],
    max_rank: int,
    context: fmpq_mpoly_ctx,
) -> list[fmpq_mpoly]:
    values = [context.constant(1)] + [context.constant(0)] * max_rank
    for factor in factors:
        values = [
            sum(
                (values[index] * factor[rank - index] for index in range(rank + 1)),
                context.constant(0),
            )
            for rank in range(max_rank + 1)
        ]
    return values


def convolve(
    left: list[fmpq_mpoly],
    right: list[fmpq_mpoly],
    rank: int,
    context: fmpq_mpoly_ctx,
) -> fmpq_mpoly:
    return sum(
        (left[index] * right[rank - index] for index in range(rank + 1)),
        context.constant(0),
    )


def two_long_paths(
    total_order: fmpq_mpoly,
    max_rank: int,
    context: fmpq_mpoly_ctx,
) -> list[fmpq_mpoly]:
    """Return I(P_a)I(P_b) through rank 8 from a+b, for a,b>=7."""
    return [
        sum(
            (
                path_count(total_order - 4 * paired, rank - 2 * paired, context)
                for paired in range(rank // 2 + 1)
            ),
            context.constant(0),
        )
        for rank in range(max_rank + 1)
    ]


def star_vector(
    first_arm: int | fmpq_mpoly,
    other_excluded: list[list[fmpq_mpoly]],
    other_reduced: list[list[fmpq_mpoly]],
    max_rank: int,
    context: fmpq_mpoly_ctx,
) -> list[fmpq_mpoly]:
    excluded = vector_product(
        [path_vector(first_arm, max_rank, context), *other_excluded],
        max_rank,
        context,
    )
    reduced = vector_product(
        [path_vector(first_arm - 1, max_rank, context), *other_reduced],
        max_rank,
        context,
    )
    return [
        excluded[rank] + (reduced[rank - 1] if rank else context.constant(0))
        for rank in range(max_rank + 1)
    ]


def state_key(value: int | str) -> str:
    return str(value)


def cell_key(pattern: dict, representative: str, shift: int) -> str:
    others = "-".join(state_key(value) for value in pattern["others"])
    return (
        f"near={state_key(pattern['near'])};tail={state_key(pattern['tail'])};"
        f"others={others};large={representative};shift={shift}"
    )


def patterns() -> list[dict]:
    near_tail_states: tuple[int | str, ...] = (*range(7), LONG)
    other_states: tuple[int | str, ...] = (*range(1, 7), LONG)
    rows = []
    for near in near_tail_states:
        for tail in near_tail_states:
            for others in itertools.combinations_with_replacement(other_states, 3):
                states = (near, tail, *others)
                long_count = sum(value == LONG for value in states)
                if long_count == 0:
                    continue
                baseline_segment_sum = sum(7 if value == LONG else value for value in states)
                needed = max(0, 35 - baseline_segment_sum)
                shift = math.ceil(needed / long_count)
                representatives = (
                    ["none"]
                    if needed == 0
                    else [
                        role
                        for role, present in (
                            ("near", near == LONG),
                            ("tail", tail == LONG),
                            ("other", LONG in others),
                        )
                        if present
                    ]
                )
                rows.append({
                    "near": near,
                    "tail": tail,
                    "others": tuple(others),
                    "long_count": long_count,
                    "baseline_segment_sum": baseline_segment_sum,
                    "offset_total_needed": needed,
                    "shift": shift,
                    "representatives": representatives,
                })
    return rows


def all_cells() -> tuple[list[dict], dict]:
    cells = []
    inherited = None
    for pattern in patterns():
        for representative in pattern["representatives"]:
            row = {
                "pattern": pattern,
                "representative": representative,
                "shift": pattern["shift"],
            }
            row["key"] = cell_key(pattern, representative, pattern["shift"])
            if pattern["offset_total_needed"] == 0:
                assert inherited is None
                inherited = row
            else:
                cells.append(row)
    assert inherited is not None
    assert inherited["key"] == "near=L;tail=L;others=L-L-L;large=none;shift=0"
    assert len(cells) == 3133
    assert len({row["key"] for row in cells}) == len(cells)
    return cells, inherited


def universe_digest(cells: list[dict], inherited: dict) -> str:
    text = "\n".join([*(row["key"] for row in cells), "INHERITED:" + inherited["key"]])
    return hashlib.sha256((text + "\n").encode("utf-8")).hexdigest().upper()


def build_raw(cell: dict):
    pattern = cell["pattern"]
    representative = cell["representative"]
    shift = cell["shift"]
    other_long_count = sum(value == LONG for value in pattern["others"])
    variable_names = []
    if pattern["near"] == LONG:
        variable_names.append("N")
    if pattern["tail"] == LONG:
        variable_names.append("T")
    if other_long_count == 1:
        variable_names.append("O")
    elif other_long_count == 2:
        variable_names.append("S")
    elif other_long_count == 3:
        variable_names.extend(("S", "O"))
    assert 1 <= len(variable_names) <= 3
    context = fmpq_mpoly_ctx.get(variable_names, "degrevlex")
    variables = dict(zip(variable_names, context.gens()))

    if pattern["near"] == LONG:
        near = variables["N"] + 7 + (shift if representative == "near" else 0)
    else:
        near = pattern["near"]
    if pattern["tail"] == LONG:
        tail = variables["T"] + 7 + (shift if representative == "tail" else 0)
    else:
        tail = pattern["tail"]

    other_excluded = []
    other_reduced = []
    fixed_others = [value for value in pattern["others"] if value != LONG]
    for value in fixed_others:
        other_excluded.append(path_vector(value, 8, context))
        other_reduced.append(path_vector(value - 1, 8, context))
    if other_long_count == 1:
        long_order = variables["O"] + 7 + (shift if representative == "other" else 0)
        other_excluded.append(path_vector(long_order, 8, context))
        other_reduced.append(path_vector(long_order - 1, 8, context))
    elif other_long_count == 2:
        total_order = variables["S"] + 14 + (shift if representative == "other" else 0)
        other_excluded.append(two_long_paths(total_order, 8, context))
        other_reduced.append(two_long_paths(total_order - 2, 8, context))
    elif other_long_count == 3:
        pair_total = variables["S"] + 14
        singled_order = variables["O"] + 7 + (shift if representative == "other" else 0)
        other_excluded.extend((
            two_long_paths(pair_total, 8, context),
            path_vector(singled_order, 8, context),
        ))
        other_reduced.extend((
            two_long_paths(pair_total - 2, 8, context),
            path_vector(singled_order - 1, 8, context),
        ))

    selected_arm = near + tail + 1
    core = star_vector(
        selected_arm, other_excluded, other_reduced, 8, context
    )
    deleted_center = star_vector(
        near, other_excluded, other_reduced, 7, context
    )
    tail_vector = path_vector(tail, 7, context)
    raw = {c[rank]: core[rank] for rank in range(3, 9)}
    raw.update({
        h[rank]: convolve(tail_vector, deleted_center, rank, context)
        for rank in (6, 7)
    })
    return raw, context, variable_names


def polynomial_digest(polynomial: fmpq_mpoly) -> str:
    terms = sorted(list(polynomial.terms()))
    body = "".join(
        f"{','.join(map(str, powers))}:{coefficient}\n"
        for powers, coefficient in terms
    )
    return hashlib.sha256(body.encode("ascii")).hexdigest().upper()


def evaluate_cell(cell: dict) -> dict:
    started = time.perf_counter()
    raw, context, variable_names = build_raw(cell)
    source_values = [raw[symbol] for symbol in SOURCE_SYMBOLS]
    max_powers = [
        max(powers[index] for rank in RANKS for powers, _ in DELTA_TERMS[rank])
        for index in range(len(SOURCE_SYMBOLS))
    ]
    powers = [
        [context.constant(1), *[value ** power for power in range(1, maximum + 1)]]
        for value, maximum in zip(source_values, max_powers)
    ]
    rows = {}
    for rank in RANKS:
        result = context.constant(0)
        for source_powers, coefficient in DELTA_TERMS[rank]:
            term = context.constant(coefficient)
            for index, power in enumerate(source_powers):
                if power:
                    term *= powers[index][power]
            result += term
        coefficients = result.coeffs()
        negative = sum(bool(value < 0) for value in coefficients)
        positive = sum(bool(value > 0) for value in coefficients)
        zero = len(coefficients) - negative - positive
        constant = result[(0,) * len(variable_names)]
        rows[str(rank)] = {
            "degrees": [int(value) for value in result.degrees()],
            "terms": len(result),
            "negative_coefficients": negative,
            "zero_coefficients": zero,
            "positive_coefficients": positive,
            "minimum_coefficient": str(min(coefficients)),
            "constant_coefficient": str(constant),
            "polynomial_sha256": polynomial_digest(result),
            "negative_terms": [
                {
                    "powers": [int(value) for value in monomial],
                    "coefficient": str(coefficient),
                }
                for monomial, coefficient in result.terms()
                if coefficient < 0
            ],
        }
    passing = all(
        row["negative_coefficients"] == 0
        and row["zero_coefficients"] == 0
        and fmpq(row["minimum_coefficient"]) > 0
        and fmpq(row["constant_coefficient"]) > 0
        for row in rows.values()
    )
    return {
        "key": cell["key"],
        "pattern": {
            "near": pattern_json(cell["pattern"]["near"]),
            "tail": pattern_json(cell["pattern"]["tail"]),
            "others": [pattern_json(value) for value in cell["pattern"]["others"]],
            "long_segments": cell["pattern"]["long_count"],
            "baseline_segment_sum": cell["pattern"]["baseline_segment_sum"],
            "offset_total_needed": cell["pattern"]["offset_total_needed"],
        },
        "large_representative": cell["representative"],
        "shift": cell["shift"],
        "variables": variable_names,
        "ranks": rows,
        "passing": passing,
        "runtime_seconds": time.perf_counter() - started,
    }


def pattern_json(value: int | str) -> int | str:
    return value


def checkpoint_payload(
    cells: list[dict], inherited: dict, completed: dict[str, dict], cumulative: float
) -> dict:
    dependencies = {name: sha256(ROOT / name) for name in EXPECTED_DEPENDENCIES}
    return {
        "schema": "rank8-delta01-e3-quartic-star-arm-short-boundary-checkpoint-agent-v1",
        "status": "IN_PROGRESS_EXACT_SERIAL_CHECKPOINT",
        "source_sha256": sha256(Path(__file__)),
        "immutable_dependencies": dependencies,
        "cell_universe_sha256": universe_digest(cells, inherited),
        "expected_computed_cells": len(cells),
        "inherited_all_long_key": inherited["key"],
        "completed_cells": completed,
        "cumulative_cell_runtime_seconds": cumulative,
    }


def load_checkpoint(cells: list[dict], inherited: dict) -> tuple[dict[str, dict], float]:
    if not CHECKPOINT.exists():
        return {}, 0.0
    payload = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    assert payload["schema"] == "rank8-delta01-e3-quartic-star-arm-short-boundary-checkpoint-agent-v1"
    assert payload["source_sha256"] == sha256(Path(__file__))
    assert payload["immutable_dependencies"] == EXPECTED_DEPENDENCIES
    assert payload["cell_universe_sha256"] == universe_digest(cells, inherited)
    assert payload["expected_computed_cells"] == len(cells)
    assert payload["inherited_all_long_key"] == inherited["key"]
    expected_keys = {row["key"] for row in cells}
    assert set(payload["completed_cells"]) <= expected_keys
    assert all(row["passing"] for row in payload["completed_cells"].values())
    return payload["completed_cells"], payload["cumulative_cell_runtime_seconds"]


def final_payload(
    cells: list[dict], inherited: dict, completed: dict[str, dict], cumulative: float
) -> dict:
    ordered = [completed[row["key"]] for row in cells]
    rank_totals = {}
    for rank in RANKS:
        rank_rows = [row["ranks"][str(rank)] for row in ordered]
        rank_totals[str(rank)] = {
            "computed_cells": len(rank_rows),
            "coefficients": sum(row["terms"] for row in rank_rows),
            "negative_coefficients": sum(row["negative_coefficients"] for row in rank_rows),
            "zero_coefficients": sum(row["zero_coefficients"] for row in rank_rows),
            "minimum_coefficient": str(
                min(fmpq(row["minimum_coefficient"]) for row in rank_rows)
            ),
        }
    return {
        "schema": "rank8-delta01-e3-quartic-star-arm-short-boundary-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_ARM_ALL_N37_PLUS",
        "theorem": (
            "For every subdivision of the four-arm star of order n>=37 and "
            "every root internal to or at the leaf of an arm, Delta0>0 and Delta1>0."
        ),
        "coordinate_definition": {
            "near": "vertices strictly between the root and the degree-four center; short 0..6 or N+7",
            "tail": "vertices strictly between the root and its leaf; short 0..6 or T+7",
            "other_arms": "the three unrooted arm lengths, unordered; short 1..6 or offset+7",
            "order": "n=near+tail+other1+other2+other3+2",
            "order_threshold": "n>=37 iff the five segment lengths sum to at least 35",
        },
        "no_gap_cover": {
            "patterns_with_a_long_segment": len(patterns()),
            "computed_shifted_cells": len(cells),
            "inherited_all_long_cells": 1,
            "total_cover_cells": len(cells) + 1,
            "pigeonhole_rule": (
                "If m long offsets have sum at least D, one offset is at least ceil(D/m). "
                "Near, tail, and the symmetric other-arm orbit are shifted separately."
            ),
            "cell_universe_sha256": universe_digest(cells, inherited),
        },
        "compression": {
            "identity": (
                "For a,b>=7 and k<=8, [x^k]I(P_a)I(P_b)="
                "sum_{j=0}^{floor(k/2)}[x^(k-2j)]I(P_(a+b-4j))."
            ),
            "use": (
                "Two long other arms are represented by their offset sum; with three, "
                "two are paired and the pigeonhole-distinguished arm remains explicit."
            ),
            "maximum_variables_per_computed_cell": 3,
        },
        "inherited_all_long_certificate": {
            "key": inherited["key"],
            "report": ALL_LONG_REPORT.name,
            "report_sha256": EXPECTED_DEPENDENCIES[ALL_LONG_REPORT.name],
            "status": json.loads(ALL_LONG_REPORT.read_text(encoding="utf-8"))["status"],
        },
        "rank_totals": rank_totals,
        "cells": ordered,
        "resources": {
            "engine": "python-flint fmpq_mpoly, serial",
            "cumulative_cell_runtime_seconds": cumulative,
        },
        "immutable_dependencies": EXPECTED_DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes only Delta0/Delta1 for the quartic-star e=3 skeleton. "
            "The distinct e=3 cubic skeleton, other surplus families, Delta2/Delta3, "
            "connected Q8, forest Q8, rank-eight PGC, and Problem 993 remain."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-new-cells", type=int)
    parser.add_argument("--checkpoint-every", type=int, default=10)
    args = parser.parse_args()
    assert args.max_new_cells is None or args.max_new_cells >= 0
    assert args.checkpoint_every >= 1
    actual_dependencies = {name: sha256(ROOT / name) for name in EXPECTED_DEPENDENCIES}
    assert actual_dependencies == EXPECTED_DEPENDENCIES
    inherited_report = json.loads(ALL_LONG_REPORT.read_text(encoding="utf-8"))
    assert inherited_report["status"] == "PASS_EXACT_POSITIVE_COMPRESSED_COEFFICIENT_CELL"
    assert inherited_report["cell"] == "arm"

    cells, inherited = all_cells()
    completed, cumulative = load_checkpoint(cells, inherited)
    new_count = 0
    since_checkpoint = 0
    for index, cell in enumerate(cells, 1):
        if cell["key"] in completed:
            continue
        if args.max_new_cells is not None and new_count >= args.max_new_cells:
            break
        row = evaluate_cell(cell)
        cumulative += row["runtime_seconds"]
        completed[cell["key"]] = row
        new_count += 1
        since_checkpoint += 1
        if not row["passing"] or new_count == 1 or new_count % 25 == 0:
            print(
                "CELL", index, len(cells), row["key"],
                "PASS" if row["passing"] else "FAIL",
                f"{row['runtime_seconds']:.3f}s", flush=True,
            )
        if not row["passing"]:
            failure = {
                "schema": "rank8-delta01-e3-quartic-star-arm-short-boundary-first-failure-agent-v1",
                "status": "OBSTRUCTION_SIGNED_COEFFICIENT_CELL",
                "cell_index": index,
                "cell": row,
                "source_sha256": sha256(Path(__file__)),
                "immutable_dependencies": EXPECTED_DEPENDENCIES,
            }
            atomic_json(FAILURE, failure)
            atomic_json(CHECKPOINT, checkpoint_payload(cells, inherited, completed, cumulative))
            print("OBSTRUCTION", row["key"], "REPORT", sha256(FAILURE), flush=True)
            return 2
        if since_checkpoint >= args.checkpoint_every:
            atomic_json(CHECKPOINT, checkpoint_payload(cells, inherited, completed, cumulative))
            since_checkpoint = 0
        del row
        if new_count % 25 == 0:
            gc.collect()

    atomic_json(CHECKPOINT, checkpoint_payload(cells, inherited, completed, cumulative))
    if len(completed) != len(cells):
        print("CHECKPOINTED", len(completed), len(cells), sha256(CHECKPOINT), flush=True)
        return 0
    payload = final_payload(cells, inherited, completed, cumulative)
    assert all(row["passing"] for row in payload["cells"])
    assert all(payload["rank_totals"][str(rank)]["negative_coefficients"] == 0 for rank in RANKS)
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("RANK_TOTALS", payload["rank_totals"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("OUTPUT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
