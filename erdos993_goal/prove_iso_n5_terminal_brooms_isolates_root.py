#!/usr/bin/env python3
"""Prove rank-five N5>=0 for every terminal marked forest.

If no unmarked vertex supports an unmarked leaf, the marked forest is either
two rooted stars or a connected double broom, together with arbitrary
unmarked isolates.  The proof expands N5 in the product-binomial basis of the
two endpoint-leaf counts and the isolate count.  The connected tail also uses
the path-order binomial basis, derived symbolically from the path polynomial.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_terminal_brooms_isolates_root import (
    add,
    at,
    binomial_polynomial,
    binomial_row,
    coefficients,
    connected_rows,
    convolution,
    disconnected_rows,
    mixed_difference,
    n5,
    shift,
)


HERE = Path(__file__).resolve().parent
PROBE_SOURCE = HERE / "probe_iso_n5_terminal_brooms_isolates_root.py"
PROBE_REPORT = HERE / "iso_n5_terminal_brooms_isolates_probe_root_20260829.json"
RANK4_TERMINAL_SOURCE = HERE / "prove_iso_n4_terminal_brooms_isolates_independent_agent.py"
RANK4_TERMINAL_REPORT = HERE / "iso_n4_terminal_brooms_isolates_independent_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n5_terminal_brooms_isolates_exact_root_20260829.json"
DEGREE = 7
TAIL_START = 15


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def symbolic_path_row(order: sp.Expr):
    return tuple(
        binomial_polynomial(order - index + 1, index)
        for index in range(7)
    )


def connected_rows_symbolic(path_order, arm_u, arm_v, isolates):
    internal = path_order - 2
    arow = binomial_row(arm_u)
    brow = binomial_row(arm_v)
    trow = binomial_row(isolates)
    ab = convolution(arow, brow)
    p0 = symbolic_path_row(internal)
    p1 = symbolic_path_row(internal - 1)
    p2 = symbolic_path_row(internal - 2)
    e0 = add(
        convolution(ab, p0),
        shift(convolution(arow, p1)),
        shift(convolution(brow, p1)),
        shift(p2, 2),
    )
    u0 = convolution(arow, add(convolution(brow, p0), shift(p1)))
    v0 = convolution(brow, add(convolution(arow, p0), shift(p1)))
    w0 = convolution(ab, p0)
    return tuple(convolution(trow, row) for row in (e0, u0, v0, w0))


def reconstruct_leaf(records, arm_u, arm_v, isolates):
    return sp.expand(sum(
        value
        * binomial_polynomial(arm_u, i)
        * binomial_polynomial(arm_v, j)
        * binomial_polynomial(isolates, k)
        for i, j, k, value in records
    ))


def forward_column(values):
    first = []
    current = list(values)
    while current:
        first.append(sp.factor(current[0]))
        current = [sp.expand(current[index + 1] - current[index]) for index in range(len(current) - 1)]
    return first


def record_summary(records):
    values = [int(record[-1]) for record in records]
    positive = [value for value in values if value > 0]
    return {
        "coefficient_cells": len(records),
        "nonzero_coefficients": sum(value != 0 for value in values),
        "negative_coefficients": sum(value < 0 for value in values),
        "minimum": min(values),
        "minimum_positive": min(positive),
        "maximum": max(values),
        "ordered_stream_sha256": hashlib.sha256(
            json.dumps(records, separators=(",", ":")).encode()
        ).hexdigest().upper(),
    }


def main() -> None:
    probe = json.loads(PROBE_REPORT.read_text(encoding="utf-8"))
    rank4_terminal = json.loads(RANK4_TERMINAL_REPORT.read_text(encoding="utf-8"))
    assert probe["marker"] == "PROBE_EXACT_ISO_N5_TERMINAL_BROOMS_ISOLATES_ROOT"
    assert probe["leaf_isolate_total_degree"] == DEGREE
    assert not probe["negative_connected_orders"]
    assert rank4_terminal["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N4_TERMINAL_BROOMS_ISOLATES_AGENT"

    arm_u, arm_v, isolates = sp.symbols("a b t", integer=True, nonnegative=True)

    # Disconnected rooted stars plus isolates: one exact 120-cell product
    # binomial certificate for all arm/isolate counts.
    disconnected_expression = sp.expand(n5(disconnected_rows(arm_u, arm_v, isolates)))
    assert sp.Poly(disconnected_expression, arm_u, arm_v, isolates).total_degree() == DEGREE
    disconnected_records = coefficients(
        lambda aa, bb, tt: int(n5(disconnected_rows(aa, bb, tt))), DEGREE
    )
    assert len(disconnected_records) == 120
    assert all(value >= 0 for *_, value in disconnected_records)
    assert sp.expand(
        reconstruct_leaf(disconnected_records, arm_u, arm_v, isolates)
        - disconnected_expression
    ) == 0

    # Boundary connected path orders.  These are all orders before every path
    # coefficient through rank six is represented by its polynomial formula.
    boundary = {}
    for path_order in range(2, TAIL_START):
        expression = sp.expand(n5(connected_rows(path_order, arm_u, arm_v, isolates)))
        assert sp.Poly(expression, arm_u, arm_v, isolates).total_degree() <= DEGREE
        records = coefficients(
            lambda aa, bb, tt, order=path_order: int(n5(connected_rows(order, aa, bb, tt))),
            DEGREE,
        )
        assert len(records) == 120
        assert all(value >= 0 for *_, value in records)
        assert sp.expand(reconstruct_leaf(records, arm_u, arm_v, isolates) - expression) == 0
        boundary[str(path_order)] = record_summary(records)

    # Symbolic connected tail.  At path order n>=15 the three path rows have
    # orders n-2,n-3,n-4>=11, so every coefficient through rank six is exactly
    # binomial(order-k+1,k), with no recurrence-boundary truncation.
    path_order, path_excess = sp.symbols("n q_path", integer=True, nonnegative=True)
    tail_expression = sp.expand(
        n5(connected_rows_symbolic(path_order, arm_u, arm_v, isolates))
    )
    tail_polynomial = sp.Poly(tail_expression, arm_u, arm_v, isolates, path_order)
    assert sp.Poly(tail_expression, arm_u, arm_v, isolates).total_degree() <= DEGREE

    symbolic_leaf_records = []
    tail_newton_records = []
    for i in range(DEGREE + 1):
        for j in range(DEGREE + 1 - i):
            for k in range(DEGREE + 1 - i - j):
                coefficient = sp.factor(mixed_difference(
                    lambda aa, bb, tt: tail_expression.subs({
                        arm_u: aa, arm_v: bb, isolates: tt,
                    }),
                    i, j, k,
                ))
                coefficient_in_excess = sp.expand(coefficient.subs(path_order, TAIL_START + path_excess))
                degree = sp.Poly(coefficient_in_excess, path_excess).degree()
                assert degree <= DEGREE
                values = [
                    coefficient_in_excess.subs(path_excess, integer)
                    for integer in range(DEGREE + 2)
                ]
                differences = forward_column(values)
                assert differences[DEGREE + 1] == 0
                assert all(value >= 0 for value in differences[:DEGREE + 1])
                reconstructed = sp.expand(sum(
                    differences[path_degree] * binomial_polynomial(path_excess, path_degree)
                    for path_degree in range(DEGREE + 1)
                ))
                assert sp.expand(reconstructed - coefficient_in_excess) == 0
                symbolic_leaf_records.append((i, j, k, str(coefficient)))
                for path_degree, value in enumerate(differences[:DEGREE + 1]):
                    tail_newton_records.append((i, j, k, path_degree, int(value)))

    assert len(symbolic_leaf_records) == 120
    assert len(tail_newton_records) == 960
    assert all(record[-1] >= 0 for record in tail_newton_records)

    tail_reconstruction = sp.expand(sum(
        value
        * binomial_polynomial(arm_u, i)
        * binomial_polynomial(arm_v, j)
        * binomial_polynomial(isolates, k)
        * binomial_polynomial(path_excess, path_degree)
        for i, j, k, path_degree, value in tail_newton_records
    ))
    assert sp.expand(
        tail_reconstruction
        - tail_expression.subs(path_order, TAIL_START + path_excess)
    ) == 0

    tail_values = [record[-1] for record in tail_newton_records]
    tail_positive = [value for value in tail_values if value > 0]
    report = {
        "marker": "PASS_EXACT_ISO_N5_TERMINAL_BROOMS_ISOLATES_ROOT",
        "theorem": (
            "Let F be a finite forest with distinct marks u,v and no unmarked vertex "
            "adjacent to an unmarked leaf. Then N5(F;u,v)>=0."
        ),
        "dependencies": {
            PROBE_SOURCE.name: sha256(PROBE_SOURCE),
            PROBE_REPORT.name: sha256(PROBE_REPORT),
            RANK4_TERMINAL_SOURCE.name: sha256(RANK4_TERMINAL_SOURCE),
            RANK4_TERMINAL_REPORT.name: sha256(RANK4_TERMINAL_REPORT),
        },
        "terminal_classification": rank4_terminal["terminal_classification_theorem"],
        "row_precision": (
            "All E,U,V,W rows are retained through coefficient six, as required by N5; "
            "the resulting leaf/isolate total degree is seven."
        ),
        "disconnected_two_rooted_stars_plus_isolates": record_summary(disconnected_records),
        "connected_double_broom_plus_isolates": {
            "boundary_path_orders": [2, TAIL_START - 1],
            "boundary": boundary,
            "tail_path_order": f"n={TAIL_START}+q_path, q_path>=0",
            "symbolic_path_degree": sp.Poly(tail_expression, path_order).degree(),
            "symbolic_leaf_cells": len(symbolic_leaf_records),
            "symbolic_leaf_stream_sha256": hashlib.sha256(
                json.dumps(symbolic_leaf_records, separators=(",", ":")).encode()
            ).hexdigest().upper(),
            "tail_newton_cells": len(tail_newton_records),
            "tail_nonzero_cells": sum(value != 0 for value in tail_values),
            "tail_negative_cells": sum(value < 0 for value in tail_values),
            "tail_minimum": min(tail_values),
            "tail_minimum_positive": min(tail_positive),
            "tail_ordered_stream_sha256": hashlib.sha256(
                json.dumps(tail_newton_records, separators=(",", ":")).encode()
            ).hexdigest().upper(),
            "exact_full_reconstruction": True,
        },
        "finite_probe": {
            "path_orders": [2, 30],
            "negative_orders": probe["negative_connected_orders"],
            "role": "finite audit only; the theorem is the exact product/path Newton certificate above",
        },
        "scope_guard": "This proves only terminal N5. Nonterminal rank-five bundle coefficients g1-g3 and all N5 remain separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "disconnected": report["disconnected_two_rooted_stars_plus_isolates"],
        "connected_tail": report["connected_double_broom_plus_isolates"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
