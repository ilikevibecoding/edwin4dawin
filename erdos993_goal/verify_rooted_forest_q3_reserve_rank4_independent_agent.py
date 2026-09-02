#!/usr/bin/env python3
"""All-order proof of the rank-j=4 rooted-forest reserve.

Large parameter ranges are closed by exact polynomial endpoint bounds.  The
remaining bounded rooted cores are enumerated exactly through augmented tree
order 18.  Isolated root components are restored by the frozen preservation
theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rooted_forest_q3_reserve_rank4_exact_independent_20260828.json"
REDUCTION_SOURCE = HERE / "verify_rooted_forest_q3_reserve_reduction_independent_agent.py"
REDUCTION_REPORT = HERE / "rooted_forest_q3_reserve_reduction_exact_independent_20260828.json"
EXPECTED_REDUCTION_SOURCE = "4FF559B971D5C62ECBF82FD822F53AFABF5F770AA3B8A69BB6261167D886FF5A"
EXPECTED_REDUCTION_REPORT = "22127852392861F649556669959C9E2EC2365146DB6BA20788A27887D34817B4"
EXPECTED_REDUCTION_STATUS = "PASS_EXACT_ROOTED_FOREST_Q3_RESERVE_REDUCTION_TO_RANKS_3_4_5"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k else 0


def positive(expression: sp.Expr, *variables: sp.Symbol) -> dict[str, object]:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    assert polynomial.coeffs() and all(coefficient >= 0 for coefficient in polynomial.coeffs())
    return {
        "term_count": len(polynomial.terms()),
        "minimum_coefficient": str(min(polynomial.coeffs())),
        "expression": str(sp.factor(expression)),
    }


def symbolic_ranges() -> dict[str, object]:
    M, c = sp.symbols("M c", integer=True, positive=True)
    N = M + c
    f2 = sp.expand_func(sp.binomial(N, 2) - M)
    hmin = sp.expand_func(sp.binomial(M - 1, 2) + c - 1)
    hmax = sp.expand_func(sp.binomial(M, 2))
    Kmin = M * (c + 1) + c**2 - 3 * c
    f4min = sp.expand_func(sp.binomial(N - 3, 4))
    shadow_factor = sp.expand_func(sp.binomial(M - 2, 2))

    slope = sp.expand(10 * f4min - shadow_factor * f2)
    endpoint_min = sp.expand(slope * hmin + 2 * Kmin * f4min)
    endpoint_max = sp.expand(slope * hmax + 2 * Kmin * f4min)

    r, u = sp.symbols("r u", integer=True, nonnegative=True)
    ranges = {
        "c_at_least_4": ({M: 4 + r, c: 4 + u}, (r, u)),
        "c_3_M_at_least_9": ({M: 9 + r, c: 3}, (r,)),
        "c_2_M_at_least_14": ({M: 14 + r, c: 2}, (r,)),
        "c_1_M_at_least_19": ({M: 19 + r, c: 1}, (r,)),
    }
    certificates = {}
    for name, (substitution, variables) in ranges.items():
        certificates[name] = {
            "nonnegative_slope": positive(slope.subs(substitution), *variables),
            "hmin_endpoint": positive(endpoint_min.subs(substitution), *variables),
        }
    transition_specs = {
        "c_3": (3, [5, 6, 7, 8], [10, 270, 1330, 4340]),
        "c_2": (2, [12, 13], [5610, 28050]),
        "c_1": (1, [17, 18], [1680, 99280]),
    }
    transitions = {}
    for name, (fixed_c, values_M, expected_endpoint_values) in transition_specs.items():
        observed_slopes = [int(slope.subs({M: value, c: fixed_c})) for value in values_M]
        observed_endpoints = [
            int(endpoint_max.subs({M: value, c: fixed_c})) for value in values_M
        ]
        assert all(value < 0 for value in observed_slopes)
        assert observed_endpoints == expected_endpoint_values
        transitions[name] = {
            "M_values": values_M,
            "negative_slopes": observed_slopes,
            "hmax_endpoint_values": observed_endpoints,
        }

    # The coefficientwise path floor follows by leaf deletion:
    # i_k(F)=i_k(F-v)+i_(k-1)(F-{u,v}) and Pascal's identity.
    n, k = sp.symbols("n k", integer=True, nonnegative=True)
    path_floor_pascal = sp.simplify(
        sp.binomial(n - k, k)
        + sp.binomial(n - k, k - 1)
        - sp.binomial(n - k + 1, k)
    )
    assert path_floor_pascal == 0
    return {
        "bounds": {
            "f2": str(f2),
            "h2_interval": [str(hmin), str(hmax)],
            "K2_lower": str(Kmin),
            "f4_lower": str(sp.factor(f4min)),
            "f4_lower_proof": (
                "leaf-deletion induction gives i_k(F)>=C(N-k+1,k); at k=4 "
                "this is C(N-3,4)"
            ),
            "shadow": "6h4<=C(M-2,2)h2",
            "affine_slope": str(sp.factor(slope)),
        },
        "endpoint_ranges": certificates,
        "negative_slope_transition_cases": transitions,
        "remaining_parameters": (
            "c=1,4<=M<=16; c=2,4<=M<=11; c=3,M=4"
        ),
    }


def forest_metrics(mask: int, adjacency: list[int], edges: list[tuple[int, int]]) -> dict[str, int]:
    vertices = [v for v in range(len(adjacency)) if mask >> v & 1]
    order = len(vertices)
    degrees = {v: (adjacency[v] & mask).bit_count() for v in vertices}
    internal_edges = [(u, v) for u, v in edges if (mask >> u & 1) and (mask >> v & 1)]
    edge_count = len(internal_edges)
    wedges = sum(choose(degrees[v], 2) for v in vertices)
    connected_four = sum(choose(degrees[v], 3) for v in vertices)
    connected_four += sum(
        (degrees[u] - 1) * (degrees[v] - 1) for u, v in internal_edges
    )
    i2 = choose(order, 2) - edge_count
    i4 = (
        choose(order, 4)
        - edge_count * choose(order - 2, 2)
        + wedges * (order - 4)
        + choose(edge_count, 2)
        - connected_four
    )
    s2 = sum(order - degrees[u] - degrees[v] for u, v in internal_edges)
    if min(i2, i4, s2) < 0:
        raise AssertionError("forest motif formula produced a negative count")
    return {"order": order, "edges": edge_count, "i2": i2, "i4": i4, "s2": s2}


def literal_independent_four(mask: int, adjacency: list[int]) -> int:
    vertices = [v for v in range(len(adjacency)) if mask >> v & 1]
    total = 0
    for chosen in itertools.combinations(vertices, 4):
        chosen_mask = sum(1 << v for v in chosen)
        if all(not (adjacency[v] & chosen_mask) for v in chosen):
            total += 1
    return total


def finite_exception_census() -> dict[str, object]:
    trees = 0
    rooted_cells = 0
    checks = 0
    literal_formula_checks = 0
    minimum = None
    per_order = []

    for n in range(2, 19):
        order_trees = order_cells = order_checks = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(n)):
            trees += 1
            order_trees += 1
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            adjacency = [0] * n
            edges = []
            for u, v in tree.edges():
                adjacency[u] |= 1 << v
                adjacency[v] |= 1 << u
                edges.append((u, v))
            full = (1 << n) - 1

            for root in range(n):
                c = adjacency[root].bit_count()
                M = n - 1 - c
                exception = (
                    (c == 1 and 4 <= M <= 16)
                    or (c == 2 and 4 <= M <= 11)
                    or (c == 3 and M == 4)
                )
                if not exception:
                    continue
                # A component root is isolated in F iff it was a leaf of the
                # augmented tree.  Those cases are handled by preservation,
                # not by the all-nontrivial core census.
                neighbors = [v for v in range(n) if adjacency[root] >> v & 1]
                if any(adjacency[v].bit_count() == 1 for v in neighbors):
                    continue

                rooted_cells += 1
                order_cells += 1
                Fmask = full & ~(1 << root)
                Hmask = Fmask & ~adjacency[root]
                F = forest_metrics(Fmask, adjacency, edges)
                H = forest_metrics(Hmask, adjacency, edges)
                if F["order"] != M + c or F["edges"] != M or H["order"] != M:
                    raise AssertionError("rooted-forest parameter reconstruction failed")
                if n <= 11:
                    if F["i4"] != literal_independent_four(Fmask, adjacency):
                        raise AssertionError("literal f4 check failed")
                    if H["i4"] != literal_independent_four(Hmask, adjacency):
                        raise AssertionError("literal h4 check failed")
                    literal_formula_checks += 2

                K2 = 2 * F["i2"] - F["s2"]
                margin = (10 * H["i2"] + 2 * K2) * F["i4"] - 6 * H["i4"] * F["i2"]
                if margin < 0:
                    raise AssertionError(
                        f"rank4 reserve failure n={n}, tree={tree_index}, root={root}"
                    )
                checks += 1
                order_checks += 1
                candidate = (margin, n, tree_index, root, c, M, code)
                if minimum is None or candidate < minimum:
                    minimum = candidate
        per_order.append(
            {"order": n, "trees": order_trees, "rooted_exception_cells": order_cells, "checks": order_checks}
        )
    if minimum is None:
        raise AssertionError("finite exception census was empty")
    return {
        "trees_enumerated": trees,
        "rooted_exception_cells": rooted_cells,
        "reserve_checks": checks,
        "literal_i4_formula_checks": literal_formula_checks,
        "minimum_margin": {
            "margin": minimum[0],
            "augmented_order": minimum[1],
            "tree_index": minimum[2],
            "augmenting_vertex": minimum[3],
            "components": minimum[4],
            "nonroots": minimum[5],
            "graph6": minimum[6],
        },
        "per_order": per_order,
    }


def main() -> None:
    assert sha256(REDUCTION_SOURCE) == EXPECTED_REDUCTION_SOURCE
    assert sha256(REDUCTION_REPORT) == EXPECTED_REDUCTION_REPORT
    reduction = json.loads(REDUCTION_REPORT.read_text(encoding="utf-8"))
    assert reduction["status"] == EXPECTED_REDUCTION_STATUS
    assert reduction["source_sha256"] == EXPECTED_REDUCTION_SOURCE

    symbolic = symbolic_ranges()
    finite = finite_exception_census()
    report = {
        "status": "PASS_EXACT_ALL_ORDER_ROOTED_FOREST_Q3_RESERVE_RANK4",
        "theorem": (
            "For every rooted forest F and H=F-roots, "
            "(10h2+2K2)f4>=6h4f2."
        ),
        "analytic_proof": symbolic,
        "finite_exception_proof": finite,
        "isolated_root_preservation_dependency": {
            "status": reduction["status"],
            "source_sha256": EXPECTED_REDUCTION_SOURCE,
            "report_sha256": EXPECTED_REDUCTION_REPORT,
        },
        "scope": {
            "proved": "the rooted reserve at j=4 for every finite rooted forest",
            "remaining": "the rooted reserve at j=5",
            "not_proved": (
                "the complete terminal two-block payment, all-tree higher-rank "
                "envelope, or Erdos Problem 993"
            ),
        },
        "correction": (
            "Uses the exact lower bound h2>=C(M-1,2)+c-1; no result from "
            "the superseded off-by-one draft is imported."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(finite, indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
