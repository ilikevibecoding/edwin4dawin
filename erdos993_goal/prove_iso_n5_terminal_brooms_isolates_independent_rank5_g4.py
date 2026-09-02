#!/usr/bin/env python3
"""Independent exact rank-five terminal theorem for marked forests.

Terminal forests under the protected-root support induction have one of two
marked cores: two disjoint rooted stars, or a connected double broom whose
spine joins the two marks.  Arbitrarily many unmarked isolates may also be
present.  This script proves N5>=0 in both families.

The four minor rows are kept through coefficient six.  That truncation is
essential because N5 contains the term I_6(B) I_2(B-u-v).
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER_SOURCE = HERE / "prove_iso_n5_terminal_brooms_isolates_root.py"
PRODUCER_REPORT = HERE / "iso_n5_terminal_brooms_isolates_exact_root_20260829.json"
OUTPUT = HERE / "iso_n5_terminal_brooms_isolates_independent_exact_rank5_g4_20260829.json"
MAXIMUM = 6
EXPECTED_PRODUCER_SOURCE_SHA = "92E23478A925D2CF8B7D1BECE0306D1242638CAB41939E41ED896472E71A4044"
EXPECTED_PRODUCER_REPORT_SHA = "A945C2C1C5909D4C886C7E09F1CFF475A6866A9259E04414A32ED82B13852E83"
EXPECTED_PRODUCER_CANONICAL_LF_SHA = "15CC124502580477D187A2BA8BADAC31F1E93C77C20DB1F12C110E0A90F39DA5"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, index: int):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def add_rows(*rows):
    return tuple(sp.expand(sum(at(row, index) for row in rows))
                 for index in range(MAXIMUM + 1))


def shift(row, amount: int = 1):
    return tuple(at(row, index - amount) for index in range(MAXIMUM + 1))


def convolve(left, right):
    return tuple(
        sp.expand(sum(at(left, index) * at(right, rank - index)
                      for index in range(rank + 1)))
        for rank in range(MAXIMUM + 1)
    )


def falling_binomial(value, index: int):
    numerator = sp.Integer(1)
    for offset in range(index):
        numerator *= value - offset
    return sp.expand(numerator / sp.Integer(factorial(index)))


def binomial_row(parameter):
    if isinstance(parameter, int):
        return tuple(comb(parameter, index) if index <= parameter else 0
                     for index in range(MAXIMUM + 1))
    return tuple(falling_binomial(parameter, index) for index in range(MAXIMUM + 1))


def actual_path_count(order: int, index: int):
    """Independent k-set count of P_order, including recurrence sentinels."""
    if index < 0:
        return 0
    if order == -2:
        return 0
    if order == -1:
        return int(index == 0)
    assert order >= 0
    top = order - index + 1
    return comb(top, index) if top >= index else 0


def actual_path_row(order: int):
    return tuple(actual_path_count(order, index) for index in range(MAXIMUM + 1))


def symbolic_path_row(order):
    """Polynomial C(order-k+1,k); combinatorial on the tail used below."""
    return tuple(falling_binomial(order - index + 1, index)
                 for index in range(MAXIMUM + 1))


def nested_n5(rows):
    e, u, v, w = rows
    r = 5
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def disconnected_rows(arm_u, arm_v, isolates):
    arow, brow, trow = map(binomial_row, (arm_u, arm_v, isolates))
    one = (1,) + (0,) * MAXIMUM
    left = add_rows(arow, shift(one))
    right = add_rows(brow, shift(one))
    return (
        convolve(trow, convolve(left, right)),
        convolve(trow, convolve(arow, right)),
        convolve(trow, convolve(left, brow)),
        convolve(trow, convolve(arow, brow)),
    )


def connected_rows(path_order, arm_u, arm_v, isolates, symbolic_path: bool = False):
    internal = path_order - 2
    path = symbolic_path_row if symbolic_path else actual_path_row
    arow, brow, trow = map(binomial_row, (arm_u, arm_v, isolates))
    ab = convolve(arow, brow)
    p0, p1, p2 = path(internal), path(internal - 1), path(internal - 2)
    e0 = add_rows(
        convolve(ab, p0),
        shift(convolve(arow, p1)),
        shift(convolve(brow, p1)),
        shift(p2, 2),
    )
    u0 = convolve(arow, add_rows(convolve(brow, p0), shift(p1)))
    v0 = convolve(brow, add_rows(convolve(arow, p0), shift(p1)))
    w0 = convolve(ab, p0)
    return tuple(convolve(trow, row) for row in (e0, u0, v0, w0))


def mixed_difference(value, i: int, j: int, k: int):
    return sum(
        (-1) ** (i - aa + j - bb + k - tt)
        * comb(i, aa) * comb(j, bb) * comb(k, tt)
        * value(aa, bb, tt)
        for aa in range(i + 1)
        for bb in range(j + 1)
        for tt in range(k + 1)
    )


def newton_records(value, degree: int = 7):
    return [
        (i, j, k, int(mixed_difference(value, i, j, k)))
        for i in range(degree + 1)
        for j in range(degree + 1 - i)
        for k in range(degree + 1 - i - j)
    ]


def reconstruct_newton(records, variables):
    a, b, t = variables
    return sp.expand(sum(
        coefficient * falling_binomial(a, i) * falling_binomial(b, j) * falling_binomial(t, k)
        for i, j, k, coefficient in records
    ))


def record_summary(records):
    values = [record[-1] for record in records]
    positives = [value for value in values if value > 0]
    return {
        "coefficients": len(records),
        "negative": sum(value < 0 for value in values),
        "zero": sum(value == 0 for value in values),
        "minimum": min(values),
        "minimum_positive": min(positives),
        "ordered_stream_sha256": hashlib.sha256(
            json.dumps(records, separators=(",", ":")).encode()
        ).hexdigest().upper(),
    }


def forward_column(values):
    answer = []
    current = list(values)
    while current:
        answer.append(sp.factor(current[0]))
        current = [sp.expand(current[index + 1] - current[index])
                   for index in range(len(current) - 1)]
    return answer


def literal_minor_rows(number_of_vertices: int, edges, u: int, v: int):
    rows = []
    for removed in (0, 1 << u, 1 << v, (1 << u) | (1 << v)):
        coefficients = [0] * (MAXIMUM + 1)
        for mask in range(1 << number_of_vertices):
            if mask & removed:
                continue
            size = mask.bit_count()
            if size > MAXIMUM:
                continue
            if all(not ((mask >> left) & 1 and (mask >> right) & 1)
                   for left, right in edges):
                coefficients[size] += 1
        rows.append(tuple(coefficients))
    return tuple(rows)


def disconnected_literal_graph(arm_u: int, arm_v: int, isolates: int):
    u, v, cursor = 0, 1, 2
    edges = []
    for _ in range(arm_u):
        edges.append((u, cursor)); cursor += 1
    for _ in range(arm_v):
        edges.append((v, cursor)); cursor += 1
    cursor += isolates
    return cursor, tuple(edges), u, v


def connected_literal_graph(path_order: int, arm_u: int, arm_v: int, isolates: int):
    u, v, cursor = 0, path_order - 1, path_order
    edges = [(vertex, vertex + 1) for vertex in range(path_order - 1)]
    for _ in range(arm_u):
        edges.append((u, cursor)); cursor += 1
    for _ in range(arm_v):
        edges.append((v, cursor)); cursor += 1
    cursor += isolates
    return cursor, tuple(edges), u, v


def main() -> None:
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert sha256(PRODUCER_SOURCE) == EXPECTED_PRODUCER_SOURCE_SHA
    assert sha256(PRODUCER_REPORT) == EXPECTED_PRODUCER_REPORT_SHA
    assert producer["marker"] == "PASS_EXACT_ISO_N5_TERMINAL_BROOMS_ISOLATES_ROOT"
    producer_canonical_lf_sha = hashlib.sha256(
        (json.dumps(producer, indent=2, sort_keys=True) + "\n").encode()
    ).hexdigest().upper()
    assert producer_canonical_lf_sha == EXPECTED_PRODUCER_CANONICAL_LF_SHA
    a, b, t = sp.symbols("a b t", integer=True, nonnegative=True)

    disconnected_expression = sp.expand(nested_n5(disconnected_rows(a, b, t)))
    disconnected_polynomial = sp.Poly(disconnected_expression, a, b, t)
    assert disconnected_polynomial.total_degree() == 7
    disconnected = newton_records(
        lambda aa, bb, tt: nested_n5(disconnected_rows(aa, bb, tt))
    )
    disconnected_summary = record_summary(disconnected)
    assert disconnected_summary == {
        "coefficients": 120,
        "negative": 0,
        "zero": 9,
        "minimum": 0,
        "minimum_positive": 4,
        "ordered_stream_sha256": "9AC359622F01E7F4B730A3D5BCFE86685F09AC1DA8D855F0851E1E1259972930",
    }
    assert sp.expand(reconstruct_newton(disconnected, (a, b, t)) - disconnected_expression) == 0

    finite_connected = {}
    finite_stream = []
    for order in range(2, 15):
        expression = sp.expand(nested_n5(connected_rows(order, a, b, t)))
        assert sp.Poly(expression, a, b, t).total_degree() <= 7
        records = newton_records(
            lambda aa, bb, tt, order=order: nested_n5(
                connected_rows(order, aa, bb, tt)
            )
        )
        summary = record_summary(records)
        assert summary["negative"] == 0
        assert sp.expand(reconstruct_newton(records, (a, b, t)) - expression) == 0
        finite_connected[str(order)] = summary
        finite_stream.extend((order, *record) for record in records)
        producer_boundary = producer["connected_double_broom_plus_isolates"]["boundary"][str(order)]
        assert producer_boundary["ordered_stream_sha256"] == summary["ordered_stream_sha256"]

    # On the tail every path coefficient used in every row through index six
    # equals the falling-binomial polynomial.  The most restrictive factor is
    # P_(N-4) at index six, valid from N=15 onward.
    # Name the path variable ``n`` to make the producer's canonical symbolic
    # leaf stream byte-for-byte comparable; h is our independent tail shift.
    path_order, h = sp.symbols("n h", integer=True, nonnegative=True)
    tail_general = sp.expand(nested_n5(
        connected_rows(path_order, a, b, t, symbolic_path=True)
    ))
    tail_expression = sp.expand(tail_general.subs(path_order, h + 15))
    tail_polynomial = sp.Poly(tail_expression, h, a, b, t)
    tail_terms = tail_polynomial.terms()
    tail_coefficients = tail_polynomial.coeffs()
    assert tail_polynomial.total_degree() == 7
    assert len(tail_terms) == 330
    assert all(coefficient > 0 for coefficient in tail_coefficients)
    assert min(tail_coefficients) == sp.Rational(11, 360)
    tail_stream = [(list(monomial), str(coefficient)) for monomial, coefficient in tail_terms]
    tail_stream_sha = hashlib.sha256(
        json.dumps(tail_stream, separators=(",", ":")).encode()
    ).hexdigest().upper()
    assert tail_stream_sha == "3EDF674BAC289F6FC0704AB17FCE1997429CD0C785AF2A5B5357BE6547C2F964"

    # Independently reconstruct the producer's second, product-Newton tail
    # certificate as a cross-audit of its frozen 960-cell stream.
    symbolic_leaf_records = []
    producer_tail_records = []
    for i in range(8):
        for j in range(8 - i):
            for k in range(8 - i - j):
                leaf_coefficient = sp.factor(mixed_difference(
                    lambda aa, bb, tt: tail_general.subs({a: aa, b: bb, t: tt}),
                    i, j, k,
                ))
                shifted = sp.expand(leaf_coefficient.subs(path_order, h + 15))
                values = [shifted.subs(h, integer) for integer in range(9)]
                differences = forward_column(values)
                assert differences[8] == 0
                assert all(value >= 0 for value in differences[:8])
                reconstruction = sp.expand(sum(
                    differences[degree] * falling_binomial(h, degree)
                    for degree in range(8)
                ))
                assert sp.expand(reconstruction - shifted) == 0
                symbolic_leaf_records.append((i, j, k, str(leaf_coefficient)))
                producer_tail_records.extend(
                    (i, j, k, degree, int(value))
                    for degree, value in enumerate(differences[:8])
                )
    assert len(symbolic_leaf_records) == 120
    assert len(producer_tail_records) == 960
    assert all(record[-1] >= 0 for record in producer_tail_records)
    producer_tail_reconstruction = sp.expand(sum(
        value
        * falling_binomial(a, i)
        * falling_binomial(b, j)
        * falling_binomial(t, k)
        * falling_binomial(h, degree)
        for i, j, k, degree, value in producer_tail_records
    ))
    assert sp.expand(producer_tail_reconstruction - tail_expression) == 0
    leaf_sha = hashlib.sha256(
        json.dumps(symbolic_leaf_records, separators=(",", ":")).encode()
    ).hexdigest().upper()
    producer_tail_sha = hashlib.sha256(
        json.dumps(producer_tail_records, separators=(",", ":")).encode()
    ).hexdigest().upper()
    producer_tail = producer["connected_double_broom_plus_isolates"]
    assert leaf_sha == producer_tail["symbolic_leaf_stream_sha256"]
    assert producer_tail_sha == producer_tail["tail_ordered_stream_sha256"]
    assert sum(record[-1] != 0 for record in producer_tail_records) == producer_tail["tail_nonzero_cells"] == 330
    assert min(value for *_, value in producer_tail_records if value > 0) == producer_tail["tail_minimum_positive"] == 94

    # Literal graph enumeration independently checks every four-minor row,
    # including coefficient six, on a nontrivial finite grid.
    literal_checks = 0
    for arm_u, arm_v, isolates in itertools.product(range(3), repeat=3):
        graph = disconnected_literal_graph(arm_u, arm_v, isolates)
        literal = literal_minor_rows(*graph)
        formula = disconnected_rows(arm_u, arm_v, isolates)
        assert literal == formula
        assert nested_n5(literal) == nested_n5(formula)
        literal_checks += 1
    for order in range(2, 8):
        for arm_u, arm_v, isolates in itertools.product(range(3), repeat=3):
            graph = connected_literal_graph(order, arm_u, arm_v, isolates)
            literal = literal_minor_rows(*graph)
            formula = connected_rows(order, arm_u, arm_v, isolates)
            assert literal == formula
            assert nested_n5(literal) == nested_n5(formula)
            literal_checks += 1
    assert literal_checks == 189

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N5_TERMINAL_BROOMS_ISOLATES_RANK5_G4",
        "theorem": (
            "N5(B;u,v)>=0 for every terminal marked forest B consisting of either "
            "two disjoint rooted stars or a connected double broom, together with "
            "arbitrarily many unmarked isolates."
        ),
        "row_contract": {
            "maximum_coefficient": MAXIMUM,
            "reason": "N5 uses I_6(B) in -(5+1)*I_6(B)*I_2(B-u-v)",
            "literal_four_minor_row_replays": literal_checks,
            "literal_grid": "arms and isolates 0..2; connected path orders 2..7",
        },
        "disconnected_two_rooted_stars": {
            "parameters": "arm_u,arm_v,isolates>=0",
            "leaf_isolate_total_degree": disconnected_polynomial.total_degree(),
            "newton": disconnected_summary,
            "exact_newton_reconstructions": 1,
        },
        "connected_double_brooms": {
            "finite_path_orders": [2, 14],
            "finite_newton": finite_connected,
            "finite_total_coefficients": len(finite_stream),
            "finite_ordered_stream_sha256": hashlib.sha256(
                json.dumps(finite_stream, separators=(",", ":")).encode()
            ).hexdigest().upper(),
            "exact_newton_reconstructions": len(finite_connected),
            "symbolic_tail": {
                "path_orders": ">=15",
                "shift": "h=path_order-15>=0",
                "variables": ["h", "arm_u", "arm_v", "isolates"],
                "total_degree": tail_polynomial.total_degree(),
                "power_monomials": len(tail_terms),
                "negative_scalar_coefficients": 0,
                "zero_scalar_coefficients": 0,
                "minimum_scalar_coefficient": str(min(tail_coefficients)),
                "ordered_power_stream_sha256": tail_stream_sha,
                "path_formula_boundary": (
                    "All stored P_(N-2),P_(N-3),P_(N-4) coefficients through "
                    "index 6 equal C(order-k+1,k) for N>=15."
                ),
            },
        },
        "terminal_classification": (
            "Under protected-root deepest-support induction, no eligible support "
            "leaves only unmarked isolates off the marked core; the marked core is "
            "a double broom if u,v are connected and two rooted stars otherwise."
        ),
        "producer_cross_audit": {
            "source_sha256": EXPECTED_PRODUCER_SOURCE_SHA,
            "report_sha256": EXPECTED_PRODUCER_REPORT_SHA,
            "canonical_lf_serialization_sha256": producer_canonical_lf_sha,
            "hash_note": "canonical LF serialization hash is not the on-disk Windows report hash",
            "marker": producer["marker"],
            "boundary_streams_matched": len(finite_connected),
            "symbolic_leaf_cells": len(symbolic_leaf_records),
            "symbolic_leaf_stream_sha256": leaf_sha,
            "tail_newton_cells": len(producer_tail_records),
            "tail_newton_nonzero_cells": sum(record[-1] != 0 for record in producer_tail_records),
            "tail_newton_stream_sha256": producer_tail_sha,
            "exact_tail_newton_reconstruction": True,
        },
        "scope": (
            "Exact rank-five terminal N5 theorem only.  It does not prove rank-five "
            "bundle coefficients g1-g3, all N5, or Erdos Problem #993."
        ),
        "dependencies": {
            PRODUCER_SOURCE.name: EXPECTED_PRODUCER_SOURCE_SHA,
            PRODUCER_REPORT.name: EXPECTED_PRODUCER_REPORT_SHA,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "disconnected_newton_coefficients": disconnected_summary["coefficients"],
        "finite_connected_newton_coefficients": len(finite_stream),
        "tail_power_monomials": len(tail_terms),
        "tail_minimum_scalar_coefficient": str(min(tail_coefficients)),
        "literal_row_replays": literal_checks,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
