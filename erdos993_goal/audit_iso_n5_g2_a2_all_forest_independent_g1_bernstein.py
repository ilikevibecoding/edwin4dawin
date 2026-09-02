#!/usr/bin/env python3
"""Independent exact audit of the all-forest rank-five g2 A2 reserve.

The audit reconstructs the normalized factorial-ratio identity, the order
floor, both high/low ratio cones, the degree-two Bernstein conversion, and a
fresh finite forest census through order twelve.  It does not import any
proof function from the producer and does not assert the coupled g2 terms.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_a2_all_forest_independent_audit_g1_bernstein_20260830.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N5_G2_A2_ALL_FOREST_AUDIT_G1_BERNSTEIN"
PRODUCER = HERE / "prove_iso_n5_g2_a2_all_forest_rank5_g2_alt.py"
PRODUCER_REPORT = HERE / "iso_n5_g2_a2_all_forest_exact_rank5_g2_alt_20260830.json"
EXPECTED_PRODUCER_SHA = "94287C8131E6866B70A200945C2F7A848D8444F2C92A0714D64E88E20427D91D"
EXPECTED_REPORT_SHA = "62F0724C7A893C953858BDD80D0AC453B0B0B9245AD77D5DA82C68C2D698935C"
FOREST_COUNTS = {
    0: 1, 1: 1, 2: 2, 3: 3, 4: 6, 5: 10, 6: 20,
    7: 37, 8: 76, 9: 153, 10: 329, 11: 710, 12: 1601,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independence_row(graph: nx.Graph) -> tuple[int, ...]:
    """Literal subset census, independent of the producer's polynomial DP."""
    vertices = tuple(graph.nodes())
    index = {vertex: j for j, vertex in enumerate(vertices)}
    forbidden = tuple(
        sum(1 << index[neighbor] for neighbor in graph.neighbors(vertex))
        for vertex in vertices
    )
    counts = [0] * (len(vertices) + 1)
    for mask in range(1 << len(vertices)):
        valid = True
        remaining = mask
        while remaining:
            bit = remaining & -remaining
            j = bit.bit_length() - 1
            if forbidden[j] & mask:
                valid = False
                break
            remaining ^= bit
        if valid:
            counts[mask.bit_count()] += 1
    while len(counts) > 1 and counts[-1] == 0:
        counts.pop()
    return tuple(counts)


def forest_graphs(order: int):
    """Component-multiset construction of every unlabeled forest."""
    if order == 0:
        yield nx.Graph()
        return
    components = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            components.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining: int, start: int, chosen: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([components[index][1] for index in chosen])
            return
        for index in range(start, len(components)):
            size = components[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def a2_value(row: tuple[int, ...]) -> int:
    a = lambda rank: at(row, rank)
    return (
        4 * a(0) * a(3) - 3 * a(0) * a(4) - 15 * a(0) * a(5)
        - 6 * a(0) * a(6) + 12 * a(1) * a(2) + 8 * a(1) * a(3)
        - 19 * a(1) * a(4) - 14 * a(1) * a(5) + 11 * a(2) ** 2
        + 18 * a(2) * a(3) - 2 * a(2) * a(4) + 6 * a(3) ** 2
    )


def finite_audit() -> dict:
    total = 0
    by_order = {}
    global_minimum = None
    ordered_digest = hashlib.sha256()
    for order, expected in FOREST_COUNTS.items():
        count = 0
        minimum = None
        minimum_row = None
        for graph in forest_graphs(order):
            row = independence_row(graph)
            value = a2_value(row)
            assert value >= 0
            ordered_digest.update(f"{order}:{row}:{value};".encode())
            count += 1
            if minimum is None or value < minimum:
                minimum, minimum_row = value, row
        assert count == expected
        total += count
        global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
        by_order[str(order)] = {
            "unlabeled_forests": count,
            "minimum_A2": minimum,
            "minimum_independence_polynomial": minimum_row,
        }
    assert total == 2949 and global_minimum == 0
    return {
        "orders": [0, 12],
        "unlabeled_forests": total,
        "global_minimum": global_minimum,
        "ordered_row_value_sha256": ordered_digest.hexdigest().upper(),
        "by_order": by_order,
    }


def bernstein_rows(expression: sp.Expr, variable: sp.Symbol) -> list[sp.Expr]:
    degree = int(sp.degree(expression, variable))
    power = [sp.expand(expression).coeff(variable, j) for j in range(degree + 1)]
    rows = []
    for k in range(degree + 1):
        rows.append(sp.expand(sum(
            sp.Rational(sp.binomial(k, j), sp.binomial(degree, j)) * power[j]
            for j in range(k + 1)
        )))
    # Independent inversion back to the power basis.
    reconstructed = sp.expand(sum(
        rows[k] * sp.binomial(degree, k) * variable**k * (1 - variable) ** (degree - k)
        for k in range(degree + 1)
    ))
    assert sp.expand(reconstructed - expression) == 0
    return rows


def positive_record(expression: sp.Expr, variables: tuple[sp.Symbol, ...]) -> dict:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    assert all(value > 0 for value in polynomial.coeffs())
    stream = "".join(f"{powers}:{value};" for powers, value in polynomial.terms())
    return {
        "terms": len(polynomial.terms()),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "coefficient_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


def cone_audit() -> dict:
    n = sp.Symbol("n", positive=True, integer=True)
    rho = sp.symbols("rho1:6", nonnegative=True)
    q = [sp.Integer(1), 2 * n]
    for ratio in rho:
        q.append(sp.expand(q[-1] * ratio))
    a = [q[k] / (sp.Integer(2) ** k * sp.factorial(k)) for k in range(7)]
    functional = sp.expand(
        4 * a[0] * a[3] - 3 * a[0] * a[4] - 15 * a[0] * a[5]
        - 6 * a[0] * a[6] + 12 * a[1] * a[2] + 8 * a[1] * a[3]
        - 19 * a[1] * a[4] - 14 * a[1] * a[5] + 11 * a[2] ** 2
        + 18 * a[2] * a[3] - 2 * a[2] * a[4] + 6 * a[3] ** 2
    )
    normalized = sp.expand(3840 * functional)
    r1, r2, r3, r4, r5 = rho
    bracket = sp.cancel(normalized / (n * r1))
    assert sp.expand(normalized - n * r1 * bracket) == 0
    assert sp.degree(bracket, n) == 1

    slope = sp.expand(sp.diff(bracket, n))
    order_floor = (r1 + 2) / 2
    floor = sp.expand(bracket.subs(n, order_floor))
    assert sp.expand(bracket - floor - (n - order_floor) * slope) == 0
    # rho1=4*i2/n <= 2(n-1), so n-order_floor is nonnegative.

    t, d1, d2, d3, d4 = sp.symbols("t d1 d2 d3 d4", nonnegative=True)
    high_rules = {
        r5: t,
        r4: t + 1 + d4,
        r3: t + 2 + d4 + d3,
        r2: t + 3 + d4 + d3 + d2,
        r1: t + 4 + d4 + d3 + d2 + d1,
    }
    high_variables = (t, d1, d2, d3, d4)
    high = {
        "slope": positive_record(slope.subs(high_rules), high_variables),
        "floor": positive_record(floor.subs(high_rules), high_variables),
    }

    bounded = sp.Symbol("bounded_r", nonnegative=True)
    low_rules = {
        r5: t,
        r4: t + 1 + d4,
        r3: t + 2 + d4 + d3,
        r2: t + 4 - bounded + d4 + d3 + d2,
        r1: t + 4 + d4 + d3 + d2,
    }
    low_variables = (t, d2, d3, d4)
    low = {}
    for label, expression in (("slope", slope), ("floor", floor)):
        reduced = sp.expand(expression.subs(low_rules))
        assert sp.degree(reduced, bounded) == 2
        low[label] = [
            positive_record(row, low_variables)
            for row in bernstein_rows(reduced, bounded)
        ]

    return {
        "normalized_identity": str(sp.factor(normalized)),
        "affine_order_split_checked": True,
        "order_floor_justification": "rho1=4*i2/n<=2(n-1)",
        "high": high,
        "low": low,
        "low_bernstein_inversion_checked": True,
        "large_order_logic": (
            "n>=13 implies alpha>=7; delta1>=0, delta2>=1, "
            "delta1+delta2>=2, delta3>=1, delta4>=1 give the exhaustive "
            "high delta1>=1 and low 0<=delta1<=1 parameterizations."
        ),
    }


def main() -> None:
    assert sha256(PRODUCER) == EXPECTED_PRODUCER_SHA
    assert sha256(PRODUCER_REPORT) == EXPECTED_REPORT_SHA
    producer_report = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer_report["marker"] == "PASS_EXACT_ISO_N5_G2_A2_ALL_FOREST_RANK5_G2_ALT"
    finite = finite_audit()
    cone = cone_audit()
    assert cone["high"]["slope"]["terms"] == 50
    assert cone["high"]["floor"]["terms"] == 119
    assert [row["terms"] for row in cone["low"]["slope"]] == [35, 35, 35]
    assert [row["terms"] for row in cone["low"]["floor"]] == [69, 69, 69]
    report = {
        "marker": MARKER,
        "audited_theorem": "A2(F)>=0 for every finite forest F.",
        "finite_independent_census": finite,
        "independent_ratio_cone_audit": cone,
        "producer_pins": {
            PRODUCER.name: EXPECTED_PRODUCER_SHA,
            PRODUCER_REPORT.name: EXPECTED_REPORT_SHA,
        },
        "scope": (
            "Independent audit of the single-row A2 reserve only. The coupled "
            "L2/K2 terms, complete g2, other canonical modes, all N5, and "
            "Erdos Problem 993 remain unproved here."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "high_terms": [cone["high"][key]["terms"] for key in ("slope", "floor")],
        "low_terms": {
            key: [row["terms"] for row in cone["low"][key]]
            for key in ("slope", "floor")
        },
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
