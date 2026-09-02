#!/usr/bin/env python3
"""Exact all-forest theorem for the single-row C5 reserve H_C.

For a forest independence row a_j=i_j(F), this proves

    H_C(F) = a_3^2 - a_1 a_5 >= 0.

The large-order proof is an exact factorial-ratio cone certificate; orders
through twelve are exhaustively checked by a literal independent-set census.
This does not prove the coupled marked-deletion blocks or C5 itself.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_c5_hc_all_forest_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_C5_HC_ALL_FOREST_G1_BERNSTEIN"
FOREST_COUNTS = {
    0: 1, 1: 1, 2: 2, 3: 3, 4: 6, 5: 10, 6: 20,
    7: 37, 8: 76, 9: 153, 10: 329, 11: 710, 12: 1601,
}
DEPENDENCIES = {
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def forest_graphs(order: int):
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


def independence_row(graph: nx.Graph) -> tuple[int, ...]:
    vertices = tuple(graph.nodes())
    index = {vertex: j for j, vertex in enumerate(vertices)}
    neighbor_masks = tuple(
        sum(1 << index[neighbor] for neighbor in graph.neighbors(vertex))
        for vertex in vertices
    )
    counts = [0] * (len(vertices) + 1)
    for mask in range(1 << len(vertices)):
        remaining = mask
        valid = True
        while remaining:
            bit = remaining & -remaining
            j = bit.bit_length() - 1
            if neighbor_masks[j] & mask:
                valid = False
                break
            remaining ^= bit
        if valid:
            counts[mask.bit_count()] += 1
    while len(counts) > 1 and counts[-1] == 0:
        counts.pop()
    return tuple(counts)


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def finite_certificate() -> dict:
    total = 0
    global_minimum = None
    by_order = {}
    digest = hashlib.sha256()
    for order, expected in FOREST_COUNTS.items():
        count = 0
        minimum = None
        witness = None
        for graph in forest_graphs(order):
            row = independence_row(graph)
            value = at(row, 3) ** 2 - at(row, 1) * at(row, 5)
            assert value >= 0
            digest.update(f"{order}:{row}:{value};".encode())
            count += 1
            if minimum is None or value < minimum:
                minimum = value
                witness = {
                    "independence_polynomial": row,
                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                }
        assert count == expected
        total += count
        global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
        by_order[str(order)] = {
            "unlabeled_forests": count,
            "minimum_H_C": minimum,
            "witness": witness,
        }
    assert total == 2949 and global_minimum == 0
    return {
        "orders": [0, 12],
        "unlabeled_forests": total,
        "global_minimum": global_minimum,
        "ordered_row_value_sha256": digest.hexdigest().upper(),
        "by_order": by_order,
    }


def cone_certificate() -> dict:
    rho1, rho2, rho3, rho4 = sp.symbols("rho1 rho2 rho3 rho4", nonnegative=True)
    q1 = sp.Symbol("q1", nonnegative=True)
    q = [None, q1]
    for ratio in (rho1, rho2, rho3, rho4):
        q.append(sp.expand(q[-1] * ratio))
    a1 = q[1] / 2
    a3 = q[3] / (2**3 * sp.factorial(3))
    a5 = q[5] / (2**5 * sp.factorial(5))
    hc = sp.expand(a3**2 - a1 * a5)
    normalized = sp.expand(23040 * hc)
    expected = sp.expand(q1**2 * rho1 * rho2 * (10 * rho1 * rho2 - 3 * rho3 * rho4))
    assert sp.expand(normalized - expected) == 0

    # For n>=13, bipartiteness gives alpha>=7.  The pinned rank-four
    # theorem gives delta3=rho3-rho4>=1; universal delta1>=0 and delta2>=1
    # give the remaining parameterization.  A terminal rho4=t is enough.
    t, d1, d2, d3 = sp.symbols("t d1 d2 d3", nonnegative=True)
    rules = {
        rho4: t,
        rho3: t + 1 + d3,
        rho2: t + 2 + d3 + d2,
        rho1: t + 2 + d3 + d2 + d1,
    }
    bracket = sp.expand((10 * rho1 * rho2 - 3 * rho3 * rho4).subs(rules))
    polynomial = sp.Poly(bracket, t, d1, d2, d3)
    assert all(value > 0 for value in polynomial.coeffs())
    stream = "".join(f"{powers}:{value};" for powers, value in polynomial.terms())
    return {
        "ratio_identity": "23040*H_C=q1^2*rho1*rho2*(10rho1rho2-3rho3rho4)",
        "large_order_scope": (
            "n>=13 implies alpha>=7. Universal delta1>=0 and delta2>=1, "
            "plus pinned delta3>=1, imply the displayed nonnegative-slack cone."
        ),
        "slack_substitution": {
            "rho4": "t",
            "rho3": "t+1+d3",
            "rho2": "t+2+d3+d2",
            "rho1": "t+2+d3+d2+d1",
        },
        "positive_bracket_terms": len(polynomial.terms()),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "coefficient_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


def main() -> None:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    finite = finite_certificate()
    cone = cone_certificate()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest F with independence coefficients a_j, "
            "H_C(F)=a3^2-a1*a5 is nonnegative."
        ),
        "finite_certificate": finite,
        "all_order_ratio_cone_certificate": cone,
        "dependencies": DEPENDENCIES,
        "scope": (
            "This proves only the single-row H_C(A) block in the marked "
            "partition of C5=R44-R35. The coupled L_C/K_C blocks, C5 itself, "
            "rank-five g1, all N5, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "positive_bracket_terms": cone["positive_bracket_terms"],
        "minimum_scalar_coefficient": cone["minimum_scalar_coefficient"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
