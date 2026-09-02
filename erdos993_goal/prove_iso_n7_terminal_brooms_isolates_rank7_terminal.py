#!/usr/bin/env python3
"""Exact all-order rank-seven terminal theorem for marked forests.

The only imported logical input is the independently audited terminal-family
classifier.  If the protected-root deepest-support step has no eligible
unmarked support-leaf edge, the marked forest is either two rooted stars or
one connected double broom, together with unmarked isolates.  This producer
rebuilds the N7 four-minor algebra directly and proves its sign for every
integer parameter by exact Newton-basis and power-basis certificates.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_terminal_brooms_isolates_exact_rank7_terminal_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_TERMINAL_BROOMS_ISOLATES_RANK7_TERMINAL"
RANK = 7
MAXIMUM = RANK + 1
NEWTON_DEGREE = 2 * RANK - 3
TAIL_START = 2 * MAXIMUM + 3

CLASSIFIER_SOURCE = "audit_iso_n6_terminal_brooms_isolates_independent_rank5_g2_alt.py"
CLASSIFIER_SOURCE_SHA256 = "D47A8D3F8452462BFECD526BE56192A87E5349E6E40452DA4284C0F799538B9E"
CLASSIFIER_REPORT = (
    "iso_n6_terminal_brooms_isolates_independent_audit_exact_rank5_g2_alt_20260830.json"
)
CLASSIFIER_REPORT_SHA256 = "EEEC14D1F418DBE4CAAA1F34A400A486D7ABBFC3D0CE050F7D10FBBF0BB3D677"
CLASSIFIER_MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_TERMINAL_BROOMS_ISOLATES_RANK5_G2_ALT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, index):
    return row[index] if 0 <= index < len(row) else 0


def add_rows(*rows):
    return tuple(
        sp.expand(sum(at(row, index) for row in rows))
        for index in range(MAXIMUM + 1)
    )


def shift(row, amount=1):
    return tuple(at(row, index - amount) for index in range(MAXIMUM + 1))


def convolve(left, right):
    return tuple(
        sp.expand(
            sum(at(left, index) * at(right, rank - index) for index in range(rank + 1))
        )
        for rank in range(MAXIMUM + 1)
    )


def falling_binomial(value, index):
    numerator = sp.Integer(1)
    for offset in range(index):
        numerator *= value - offset
    return sp.expand(numerator / sp.Integer(factorial(index)))


def binomial_row(parameter):
    if isinstance(parameter, int):
        return tuple(
            comb(parameter, index) if index <= parameter else 0
            for index in range(MAXIMUM + 1)
        )
    return tuple(falling_binomial(parameter, index) for index in range(MAXIMUM + 1))


def actual_path_count(order, index):
    if index < 0:
        return 0
    if order == -2:
        return 0
    if order == -1:
        return int(index == 0)
    assert order >= 0
    top = order - index + 1
    return comb(top, index) if top >= index else 0


def actual_path_row(order):
    return tuple(actual_path_count(order, index) for index in range(MAXIMUM + 1))


def symbolic_path_row(order):
    return tuple(
        falling_binomial(order - index + 1, index)
        for index in range(MAXIMUM + 1)
    )


def nested_n7(rows):
    """Exact nonsibling four-minor remainder N_7(B;u,v)."""
    e, u, v, w = rows
    r = RANK
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


def connected_rows(path_order, arm_u, arm_v, isolates, symbolic_path=False):
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


def mixed_difference(value, i, j, k):
    return sum(
        (-1) ** (i - aa + j - bb + k - tt)
        * comb(i, aa)
        * comb(j, bb)
        * comb(k, tt)
        * value(aa, bb, tt)
        for aa in range(i + 1)
        for bb in range(j + 1)
        for tt in range(k + 1)
    )


def newton_records(value):
    return [
        (i, j, k, int(mixed_difference(value, i, j, k)))
        for i in range(NEWTON_DEGREE + 1)
        for j in range(NEWTON_DEGREE + 1 - i)
        for k in range(NEWTON_DEGREE + 1 - i - j)
    ]


def reconstruct_newton(records, variables):
    a, b, t = variables
    return sp.expand(
        sum(
            coefficient
            * falling_binomial(a, i)
            * falling_binomial(b, j)
            * falling_binomial(t, k)
            for i, j, k, coefficient in records
        )
    )


def record_summary(records):
    values = [record[-1] for record in records]
    positive = [value for value in values if value > 0]
    return {
        "coefficients": len(records),
        "negative": sum(value < 0 for value in values),
        "zero": sum(value == 0 for value in values),
        "minimum": min(values),
        "minimum_positive": min(positive),
        "ordered_stream_sha256": hashlib.sha256(
            json.dumps(records, separators=(",", ":")).encode()
        ).hexdigest().upper(),
    }


def literal_minor_rows(number_of_vertices, edges, u, v):
    rows = []
    for removed in (0, 1 << u, 1 << v, (1 << u) | (1 << v)):
        coefficients = [0] * (MAXIMUM + 1)
        for mask in range(1 << number_of_vertices):
            if mask & removed:
                continue
            size = mask.bit_count()
            if size > MAXIMUM:
                continue
            if all(
                not ((mask >> left) & 1 and (mask >> right) & 1)
                for left, right in edges
            ):
                coefficients[size] += 1
        rows.append(tuple(coefficients))
    return tuple(rows)


def disconnected_literal_graph(arm_u, arm_v, isolates):
    u, v, cursor = 0, 1, 2
    edges = []
    for _ in range(arm_u):
        edges.append((u, cursor))
        cursor += 1
    for _ in range(arm_v):
        edges.append((v, cursor))
        cursor += 1
    cursor += isolates
    return cursor, tuple(edges), u, v


def connected_literal_graph(path_order, arm_u, arm_v, isolates):
    u, v, cursor = 0, path_order - 1, path_order
    edges = [(vertex, vertex + 1) for vertex in range(path_order - 1)]
    for _ in range(arm_u):
        edges.append((u, cursor))
        cursor += 1
    for _ in range(arm_v):
        edges.append((v, cursor))
        cursor += 1
    cursor += isolates
    return cursor, tuple(edges), u, v


def main():
    assert sha256(HERE / CLASSIFIER_SOURCE) == CLASSIFIER_SOURCE_SHA256
    assert sha256(HERE / CLASSIFIER_REPORT) == CLASSIFIER_REPORT_SHA256
    classifier = json.loads((HERE / CLASSIFIER_REPORT).read_text(encoding="utf-8"))
    assert classifier["marker"] == CLASSIFIER_MARKER
    exhaustion = classifier["independent_terminal_family_exhaustion"]
    assert classifier["coverage"]["terminal_families_exhausted"] is True
    assert set(exhaustion["proof"]) == {
        "converse",
        "one_mark_component",
        "two_mark_component",
        "unmarked_components",
    }
    assert exhaustion["atlas_replay"]["equivalence_failures"] == 0

    a, b, t = sp.symbols("a b t", integer=True, nonnegative=True)
    disconnected_expression = sp.expand(nested_n7(disconnected_rows(a, b, t)))
    disconnected_polynomial = sp.Poly(disconnected_expression, a, b, t)
    assert disconnected_polynomial.total_degree() == NEWTON_DEGREE
    disconnected = newton_records(
        lambda aa, bb, tt: nested_n7(disconnected_rows(aa, bb, tt))
    )
    disconnected_summary = record_summary(disconnected)
    assert disconnected_summary["coefficients"] == comb(NEWTON_DEGREE + 3, 3)
    assert disconnected_summary["negative"] == 0
    assert sp.expand(
        reconstruct_newton(disconnected, (a, b, t)) - disconnected_expression
    ) == 0

    finite_connected = {}
    finite_stream = []
    for order in range(2, TAIL_START):
        expression = sp.expand(nested_n7(connected_rows(order, a, b, t)))
        polynomial = sp.Poly(expression, a, b, t)
        assert polynomial.total_degree() <= NEWTON_DEGREE
        records = newton_records(
            lambda aa, bb, tt, order=order: nested_n7(
                connected_rows(order, aa, bb, tt)
            )
        )
        summary = record_summary(records)
        assert summary["coefficients"] == comb(NEWTON_DEGREE + 3, 3)
        assert summary["negative"] == 0
        assert sp.expand(reconstruct_newton(records, (a, b, t)) - expression) == 0
        finite_connected[str(order)] = summary
        finite_stream.extend((order, *record) for record in records)

    path_order, h = sp.symbols("path_order h", integer=True, nonnegative=True)
    tail_general = sp.expand(
        nested_n7(connected_rows(path_order, a, b, t, symbolic_path=True))
    )
    tail_expression = sp.expand(tail_general.subs(path_order, h + TAIL_START))
    tail_polynomial = sp.Poly(tail_expression, h, a, b, t)
    tail_terms = tail_polynomial.terms()
    tail_coefficients = tail_polynomial.coeffs()
    assert tail_polynomial.total_degree() == NEWTON_DEGREE
    assert all(coefficient > 0 for coefficient in tail_coefficients)
    tail_stream = [
        (list(monomial), str(coefficient))
        for monomial, coefficient in tail_terms
    ]
    tail_stream_sha = hashlib.sha256(
        json.dumps(tail_stream, separators=(",", ":")).encode()
    ).hexdigest().upper()

    literal_checks = 0
    for arm_u, arm_v, isolates in itertools.product(range(3), repeat=3):
        graph = disconnected_literal_graph(arm_u, arm_v, isolates)
        literal = literal_minor_rows(*graph)
        formula = disconnected_rows(arm_u, arm_v, isolates)
        assert literal == formula and nested_n7(literal) == nested_n7(formula)
        literal_checks += 1
    for order in range(2, 10):
        for arm_u, arm_v, isolates in itertools.product(range(3), repeat=3):
            graph = connected_literal_graph(order, arm_u, arm_v, isolates)
            literal = literal_minor_rows(*graph)
            formula = connected_rows(order, arm_u, arm_v, isolates)
            assert literal == formula and nested_n7(literal) == nested_n7(formula)
            literal_checks += 1
    assert literal_checks == 243

    report = {
        "marker": MARKER,
        "theorem": (
            "N7(B;u,v)>=0 for every terminal marked forest B consisting of either two "
            "disjoint rooted stars or a connected double broom, together with arbitrarily "
            "many unmarked isolates."
        ),
        "classifier_dependency": {
            "role": (
                "independently audited terminal-family exhaustion only; no N6 sign algebra "
                "or rank-six conclusion is reused"
            ),
            "source": CLASSIFIER_SOURCE,
            "source_sha256": CLASSIFIER_SOURCE_SHA256,
            "report": CLASSIFIER_REPORT,
            "report_sha256": CLASSIFIER_REPORT_SHA256,
            "marker": CLASSIFIER_MARKER,
            "proof_lemmas": sorted(exhaustion["proof"]),
        },
        "row_contract": {
            "rank": RANK,
            "maximum_coefficient": MAXIMUM,
            "reason": "N7 uses I_8(B) in -(7+1)*I_8(B)*I_4(B-u-v)",
            "literal_four_minor_row_replays": literal_checks,
            "literal_grid": "arms and isolates 0..2; connected path orders 2..9",
        },
        "disconnected_two_rooted_stars": {
            "parameters": "arm_u,arm_v,isolates>=0",
            "total_degree": disconnected_polynomial.total_degree(),
            "Newton_basis": disconnected_summary,
            "exact_reconstruction": True,
        },
        "connected_double_brooms": {
            "finite_path_orders": [2, TAIL_START - 1],
            "finite_Newton_basis": finite_connected,
            "finite_total_coefficients": len(finite_stream),
            "finite_ordered_stream_sha256": hashlib.sha256(
                json.dumps(finite_stream, separators=(",", ":")).encode()
            ).hexdigest().upper(),
            "symbolic_tail": {
                "path_orders": f">={TAIL_START}",
                "shift": f"h=path_order-{TAIL_START}>=0",
                "variables": ["h", "arm_u", "arm_v", "isolates"],
                "total_degree": tail_polynomial.total_degree(),
                "power_monomials": len(tail_terms),
                "negative_scalar_coefficients": sum(bool(c < 0) for c in tail_coefficients),
                "zero_scalar_coefficients": sum(bool(c == 0) for c in tail_coefficients),
                "minimum_scalar_coefficient": str(min(tail_coefficients)),
                "ordered_power_stream_sha256": tail_stream_sha,
                "path_formula_boundary": (
                    "All P_(N-2), P_(N-3), and P_(N-4) coefficients through index 8 "
                    f"equal C(order-k+1,k) for N>={TAIL_START}."
                ),
            },
        },
        "coverage": {
            "disconnected": "all arm_u,arm_v,isolates>=0",
            "connected_finite": (
                f"every path order 2..{TAIL_START - 1} and all arm_u,arm_v,isolates>=0"
            ),
            "connected_tail": (
                f"every path order >={TAIL_START} and all arm_u,arm_v,isolates>=0"
            ),
            "terminal_families_exhausted": True,
            "no_gap": True,
        },
        "proof_logic": (
            "For the disconnected family and each finite path order, the exact polynomial "
            "has a reconstructed nonnegative Newton expansion in C(a,i)C(b,j)C(t,k). "
            "For the symbolic tail every ordinary power-basis coefficient in nonnegative "
            "h,a,b,t is positive. These domains cover every integer parameter without a gap."
        ),
        "scope_guard": (
            "This proves only the exact all-order terminal base for marked N7. It does not "
            "prove nonterminal rank-seven bundle coefficients, all-N7, the Newton-tail bridge, "
            "or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": report["marker"],
                "disconnected": disconnected_summary,
                "finite_path_orders": report["connected_double_brooms"]["finite_path_orders"],
                "finite_coefficients": len(finite_stream),
                "tail": report["connected_double_brooms"]["symbolic_tail"],
                "source_sha256": report["source_sha256"],
                "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
            },
            indent=2,
            sort_keys=True,
        )
    )
    print(report["marker"])


if __name__ == "__main__":
    main()
