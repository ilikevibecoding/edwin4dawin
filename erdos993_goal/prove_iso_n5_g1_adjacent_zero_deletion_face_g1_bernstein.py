#!/usr/bin/env python3
"""Exact all-forest theorem for the zero-deletion face of adjacent S.

For adjacent marks write A=G-u-v, B=G-N[v], C=G-N[u].  On the geometric
face |B|=|C|=|A| the two deleted neighbor sets are empty, so B=C=A exactly.
This source proves

    S(A,A,A)=M5+3*C5 >= 0

for every finite forest A.  Orders through twelve are enumerated exactly;
orders at least thirteen use the pinned rank-four/rank-five factorial-drop
cones and exact Bernstein conversion in the bounded low sector.

This is one exact face of adjacent g1, not the full adjacent theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_zero_deletion_face_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_ADJACENT_ZERO_DELETION_FACE_G1_BERNSTEIN"
DEPENDENCIES = {
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
    "derive_iso_n5_g1_adjacent_deletion_deficit_form_root.py":
        "B45D369DB8A5FF26FC1D43C22198D693581A23C8D283F79757BEBC949688AD48",
}
KNOWN_FOREST_COUNTS = {
    0: 1, 1: 1, 2: 2, 3: 3, 4: 6, 5: 10, 6: 20,
    7: 37, 8: 76, 9: 153, 10: 329, 11: 710, 12: 1601,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def s_face_value(row: tuple[int, ...]) -> int:
    a = [at(row, rank) for rank in range(7)]
    return (
        4*a[1]*a[2] + 2*a[1]*a[3] - 26*a[1]*a[4]
        - 29*a[1]*a[5] - 6*a[1]*a[6] + 14*a[2]**2
        + 30*a[2]*a[3] - 8*a[2]*a[4] - 8*a[2]*a[5]
        + 21*a[3]**2 + 6*a[3]*a[4]
    )


def forest_graphs(order: int):
    if order == 0:
        yield nx.Graph()
        return
    types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining: int, start: int, chosen: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([types[index][1] for index in chosen])
            return
        for index in range(start, len(types)):
            size = types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def finite_certificate() -> dict:
    rows = {}
    total = 0
    global_minimum = None
    positive_minimum = None
    digest = hashlib.sha256()
    for order in range(13):
        count = 0
        minimum = None
        witness = None
        for forest_index, graph in enumerate(forest_graphs(order)):
            count += 1
            polynomial = tuple(poly_forest(graph))
            value = s_face_value(polynomial)
            assert value >= 0, (order, forest_index, value)
            if minimum is None or value < minimum:
                minimum = value
                witness = {
                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                    "independence_polynomial": polynomial,
                }
            if value > 0:
                positive_minimum = value if positive_minimum is None else min(positive_minimum, value)
            digest.update(f"{order}|{forest_index}|{polynomial}|{value};".encode())
        assert count == KNOWN_FOREST_COUNTS[order]
        total += count
        global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
        rows[str(order)] = {
            "unlabeled_forests": count,
            "minimum_S_AAA": minimum,
            "witness": witness,
        }
    assert total == 2949
    assert global_minimum == 0
    return {
        "orders": [0, 12],
        "unlabeled_forests": total,
        "global_minimum": global_minimum,
        "smallest_positive": positive_minimum,
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "rows": rows,
        "role": "complete exact finite branch, not extrapolated",
    }


def algebra_and_cone_certificate() -> dict:
    a = sp.symbols("a0:7")
    h = (
        2*a[1]*a[4]-5*a[1]*a[5]-6*a[1]*a[6]+6*a[2]*a[3]
        -8*a[2]*a[5]+5*a[3]**2+6*a[3]*a[4]
    )
    ell = 2*(
        a[1]*a[3]-2*a[1]*a[4]-3*a[1]*a[5]
        +2*a[2]**2+2*a[2]*a[3]-a[2]*a[4]
        +a[3]*a[1]+2*a[3]*a[2]+4*a[3]**2
        -2*a[4]*a[1]-a[4]*a[2]-3*a[5]*a[1]
    )
    k = (
        2*a[1]*a[2]-3*a[1]*a[3]-6*a[1]*a[4]
        +2*a[2]*a[1]+6*a[2]**2+4*a[2]*a[3]
        -3*a[3]*a[1]+4*a[3]*a[2]-6*a[4]*a[1]
    )
    face = sp.expand(h + 2*ell + k)
    expected_face = (
        4*a[1]*a[2]+2*a[1]*a[3]-26*a[1]*a[4]-29*a[1]*a[5]
        -6*a[1]*a[6]+14*a[2]**2+30*a[2]*a[3]-8*a[2]*a[4]
        -8*a[2]*a[5]+21*a[3]**2+6*a[3]*a[4]
    )
    assert sp.expand(face - expected_face) == 0

    n = sp.Symbol("n", positive=True)
    rho = sp.symbols("rho1:6", nonnegative=True)
    q = [sp.Integer(1), 2*n]
    for value in rho:
        q.append(sp.expand(q[-1] * value))
    ratio_a = [q[index] / (sp.Integer(2)**index * sp.factorial(index)) for index in range(7)]
    ratio_face = sp.expand(face.subs(dict(zip(a, ratio_a))))
    bracket = (
        5*rho[0]*rho[1]**2*rho[2]+140*rho[0]*rho[1]**2
        -4*rho[0]*rho[1]*rho[2]*rho[3]-40*rho[0]*rho[1]*rho[2]
        +1200*rho[0]*rho[1]+3360*rho[0]
        -rho[1]*rho[2]*rho[3]*rho[4]-58*rho[1]*rho[2]*rho[3]
        -520*rho[1]*rho[2]+320*rho[1]+3840
    )
    assert sp.expand(11520*ratio_face/n**2 - 3*rho[0]*bracket) == 0

    t, d1, d2, d3, d4 = sp.symbols("t d1 d2 d3 d4", nonnegative=True)
    high = sp.Poly(sp.expand(bracket.subs({
        rho[4]: t,
        rho[3]: t+1+d4,
        rho[2]: t+2+d4+d3,
        rho[1]: t+3+d4+d3+d2,
        rho[0]: t+4+d4+d3+d2+d1,
    })), t, d1, d2, d3, d4)
    assert len(high.terms()) == 102
    assert all(value > 0 for value in high.coeffs())
    assert min(high.coeffs()) == 1

    bounded = sp.Symbol("r", nonnegative=True)
    low = sp.expand(bracket.subs({
        rho[4]: t,
        rho[3]: t+1+d4,
        rho[2]: t+2+d4+d3,
        rho[1]: t+4-bounded+d4+d3+d2,
        rho[0]: t+4+d4+d3+d2,
    }))
    assert sp.degree(low, bounded) == 2
    power = [low.coeff(bounded, index) for index in range(3)]
    bernstein = [sp.expand(sum(
        sp.Rational(sp.binomial(k_index, index), sp.binomial(2, index)) * power[index]
        for index in range(k_index + 1)
    )) for k_index in range(3)]
    low_stats = []
    for coefficient in bernstein:
        polynomial = sp.Poly(coefficient, t, d2, d3, d4)
        assert len(polynomial.terms()) == 68
        assert all(value > 0 for value in polynomial.coeffs())
        assert min(polynomial.coeffs()) == 1
        low_stats.append({"terms": 68, "minimum_scalar_coefficient": 1})

    return {
        "occupation_identity": "S=H(A)+L(A,B)+L(A,C)+K(B,C)",
        "zero_deletion_substitution": "B=C=A",
        "S_AAA": str(expected_face),
        "ratio_identity": "11520*S_AAA/n^2=3*rho1*B(rho1,...,rho5)",
        "ratio_bracket": str(bracket),
        "large_order_scope": (
            "n>=13 gives alpha>=7; delta1>=0, delta2>=1, "
            "delta1+delta2>=2, delta3>=1, delta4>=1."
        ),
        "high_delta1_cone": {"terms": 102, "minimum_scalar_coefficient": 1},
        "low_delta1_cone": {
            "degree_in_r": 2,
            "bernstein_coefficients": low_stats,
        },
        "all_cone_coefficients_strictly_positive": True,
    }


def main() -> None:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    finite = finite_certificate()
    cone = algebra_and_cone_certificate()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest A, the adjacent-mark zero-deletion face "
            "B=C=A satisfies S(A,A,A)=M5+3*C5>=0."
        ),
        "geometric_reason": (
            "If |B|=|A| then the B-deleted neighbor set is empty, hence B=A; "
            "likewise |C|=|A| implies C=A."
        ),
        "finite_certificate": finite,
        "algebra_and_all_order_cone_certificate": cone,
        "dependencies_sha256": DEPENDENCIES,
        "scope": (
            "Only the adjacent zero-deletion face dB=dC=0. Positive deletion "
            "deficits, full adjacent S, g1, all N5, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "finite_minimum": finite["global_minimum"],
        "high_terms": cone["high_delta1_cone"]["terms"],
        "low_bernstein_terms": [
            row["terms"] for row in cone["low_delta1_cone"]["bernstein_coefficients"]
        ],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
