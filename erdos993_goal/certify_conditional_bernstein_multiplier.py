#!/usr/bin/env python3
"""Convert a floating conditional Bernstein multiplier into an exact proof.

The search LP identifies a sparse basis.  This replay reconstructs all
Bernstein coefficients over QQ, identifies a consistent full-rank set of
tight constraints, solves it exactly, and then checks every multiplier and
remainder coefficient without floating point.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import sympy as sp


U, V, W = sp.symbols("u v w")


def bernstein(expression: sp.Expr, degrees: tuple[int, int, int]) -> dict[tuple[int, int, int], sp.Rational]:
    polynomial = sp.Poly(sp.expand(expression), U, V, W)
    power = {monomial: sp.Rational(coefficient) for monomial, coefficient in polynomial.terms()}
    output = {}
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        output[index] = sp.factor(
            sum(
                coefficient
                * sp.prod(
                    sp.Rational(comb(index[axis], monomial[axis]), comb(degrees[axis], monomial[axis]))
                    for axis in range(3)
                )
                for monomial, coefficient in power.items()
                if all(monomial[axis] <= index[axis] for axis in range(3))
            )
        )
    return output


def product_coefficient(
    output_index: tuple[int, int, int],
    condition_index: tuple[int, int, int],
    multiplier_index: tuple[int, int, int],
    condition_value: sp.Rational,
    condition_degrees: tuple[int, int, int],
    multiplier_degrees: tuple[int, int, int],
) -> sp.Expr:
    if any(
        condition_index[axis] + multiplier_index[axis] != output_index[axis]
        for axis in range(3)
    ):
        return sp.S.Zero
    return condition_value * sp.prod(
        sp.Rational(
            comb(condition_degrees[axis], condition_index[axis])
            * comb(multiplier_degrees[axis], multiplier_index[axis]),
            comb(
                condition_degrees[axis] + multiplier_degrees[axis],
                output_index[axis],
            ),
        )
        for axis in range(3)
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-report", type=Path, required=True)
    parser.add_argument("--lp-report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    base = json.loads(args.base_report.read_text(encoding="utf-8"))["records"][0]
    lp = json.loads(args.lp_report.read_text(encoding="utf-8"))
    assert lp["status"] == "feasible"
    c_max = sp.Rational(lp["c_max"])
    r_value = int(base["r_specialization"])
    local = {"u": U, "v": V, "c": c_max * W, "r": sp.Integer(r_value)}
    condition = sp.sympify(
        base["target_expressions"]["endpoint_margin_at_zero_shift"], locals=local
    )
    target = sp.sympify(base["target_expressions"][lp["target"]], locals=local)
    condition_numerator, _ = sp.fraction(sp.cancel(condition))
    target_numerator, _ = sp.fraction(sp.cancel(target))
    condition_degrees = tuple(map(int, lp["condition_degrees"]))
    target_degrees = tuple(map(int, lp["target_degrees"]))
    multiplier_degrees = tuple(map(int, lp["multiplier_degrees"]))
    g = bernstein(condition_numerator, condition_degrees)
    m = bernstein(target_numerator, target_degrees)
    active = [
        tuple(map(int, record["index"]))
        for record in lp["nonzero_multiplier_controls_scaled"]
    ]
    g_scale = max(abs(value) for value in g.values())
    m_scale = max(abs(value) for value in m.values())
    q_float = [
        float(record["value"]) * float(m_scale / g_scale)
        for record in lp["nonzero_multiplier_controls_scaled"]
    ]

    def exact_row(index: tuple[int, int, int]) -> list[sp.Expr]:
        return [
            sum(
                (
                    product_coefficient(
                        index,
                        gi,
                        qi,
                        gv,
                        condition_degrees,
                        multiplier_degrees,
                    )
                    for gi, gv in g.items()
                ),
                sp.S.Zero,
            )
            for qi in active
        ]

    candidates = []
    for index, value in m.items():
        row = exact_row(index)
        residual = float(value) + sum(float(coefficient) * q for coefficient, q in zip(row, q_float))
        scale = max(
            [abs(float(value)), 1.0]
            + [abs(float(coefficient) * q) for coefficient, q in zip(row, q_float)]
        )
        candidates.append((abs(residual) / scale, index, row, -value))
    candidates.sort(key=lambda record: record[0])

    rows: list[list[sp.Expr]] = []
    right: list[sp.Expr] = []
    selected = []
    rank = 0
    for residual, index, row, value in candidates:
        matrix = sp.Matrix(rows + [row])
        vector = sp.Matrix(right + [value])
        new_rank = matrix.rank()
        if new_rank > rank and matrix.row_join(vector).rank() == new_rank:
            rows.append(row)
            right.append(value)
            selected.append((residual, index))
            rank = new_rank
            if rank == len(active):
                break
    assert rank == len(active)
    solution_set = sp.linsolve((sp.Matrix(rows), sp.Matrix(right)))
    solution = tuple(next(iter(solution_set)))
    assert not set().union(*(value.free_symbols for value in solution))

    remainder = dict(m)
    for multiplier_index, multiplier_value in zip(active, solution):
        for condition_index, condition_value in g.items():
            output_index = tuple(
                condition_index[axis] + multiplier_index[axis] for axis in range(3)
            )
            remainder[output_index] += product_coefficient(
                output_index,
                condition_index,
                multiplier_index,
                condition_value,
                condition_degrees,
                multiplier_degrees,
            ) * multiplier_value
    negative_multiplier = [
        (index, value)
        for index, value in zip(active, solution)
        if bool(value < 0)
    ]
    negative_remainder = [
        (index, value) for index, value in remainder.items() if bool(value < 0)
    ]
    assert not negative_multiplier
    assert not negative_remainder
    digest_payload = "|".join(
        f"{index}:{value}" for index, value in zip(active, solution)
    ) + "||" + "|".join(f"{index}:{value}" for index, value in remainder.items())
    report = {
        "status": "EXACT_CONDITIONAL_BERNSTEIN_CERTIFICATE",
        "base_report": str(args.base_report),
        "lp_report": str(args.lp_report),
        "parity": base["parity"],
        "r_specialization": r_value,
        "target": lp["target"],
        "identity": "target = remainder + (-condition) * multiplier",
        "condition": "endpoint_margin_at_zero_shift < 0",
        "c_interval": ["0", str(c_max)],
        "active_multiplier_control_count": len(active),
        "positive_multiplier_control_count": sum(bool(value > 0) for value in solution),
        "zero_multiplier_control_count": sum(value == 0 for value in solution),
        "positive_remainder_control_count": sum(bool(value > 0) for value in remainder.values()),
        "zero_remainder_control_count": sum(value == 0 for value in remainder.values()),
        "selected_exact_equalities": [
            {"index": list(index), "floating_residual": residual}
            for residual, index in selected
        ],
        "multiplier_controls": [
            {"index": list(index), "value": str(value)}
            for index, value in zip(active, solution)
        ],
        "certificate_sha256": hashlib.sha256(digest_payload.encode("utf-8")).hexdigest(),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "multiplier_controls"}, indent=2))


if __name__ == "__main__":
    main()
