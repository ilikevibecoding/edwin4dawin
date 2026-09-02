#!/usr/bin/env python3
"""Fail-closed audit of the conditional global q3-envelope bridge.

This verifier separates three logically different statements:

1. the exact two-block terminal recurrence can propagate a q3 envelope,
   provided its forest-base anchor and payment hypotheses hold;
2. a tree q3 envelope implies the all-rank averaged component-surplus
   inequality;
3. neither statement currently implies the pendant cascade (PGC) or
   independence-sequence unimodality.

The output status is deliberately conditional.  No unresolved hypothesis is
promoted to a theorem.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_global_bridge_conditional_audit_20260829.json"

PINNED = {
    "TERMINAL_SUPPORT_Q3_ENVELOPE_RECURRENCE_INDEPENDENT_2026-08-28.md":
        "ED1733748294AF20E9C2A465C012C0B74A9CE4AB6235E269BF65E1F4DC78110D",
    "ROOTED_FOREST_Q3_RESERVE_ALL_RANK_ASSEMBLY_INDEPENDENT_2026-08-28.md":
        "7B58B853DD799782AD4EE6FDEAE64E3F80CC784F59CC8BD03E251D587F0FA2CF",
    "rooted_forest_q3_reserve_all_rank_assembly_independent_20260828.json":
        "A013FF2C5E2C3401A661A27C3503797B8C2E06DDB74C5F78314F5400523E26F3",
    "ALL_TREE_Q3_Q2_THEOREM_2026-08-28.md":
        "47070CC3148385AB1FCE887DE00E9C82FF71805FD5CD11ACFE6E64CBC777FE3D",
    "all_tree_q3_q2_theorem_exact_root_20260828.json":
        "6013B83860C4A5B9FC58CEA07762CA51A5CE908AC2F6849FB7EE7383F26F4A74",
    "TERMINAL_Q3_ANCHOR_ORDERING_THEOREM_2026-08-28.md":
        "7B47AD25614A0421E7D6165D2A7985FE83E67823436EDA0BC93BB127A405216D",
    "terminal_q3_anchor_ordering_independent_audit_20260828.json":
        "E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def trim(row: list[int]) -> list[int]:
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return row


def add(left: list[int], right: list[int]) -> list[int]:
    out = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        out[index] += value
    for index, value in enumerate(right):
        out[index] += value
    return trim(out)


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return trim(out)


def derivative(row: list[int]) -> list[int]:
    return trim([index * row[index] for index in range(1, len(row))] or [0])


def zero_one_edge_rows(graph: nx.Graph) -> tuple[list[int], list[int]]:
    """Literal subset rows; used only on the bounded witnesses below."""
    vertices = tuple(graph.nodes())
    edges = tuple((u, v) for u, v in graph.edges())
    zero = [0] * (len(vertices) + 1)
    one = [0] * (len(vertices) + 1)
    for mask in range(1 << len(vertices)):
        size = mask.bit_count()
        induced = 0
        for u, v in edges:
            if (mask >> u) & 1 and (mask >> v) & 1:
                induced += 1
                if induced > 1:
                    break
        if induced == 0:
            zero[size] += 1
        elif induced == 1:
            one[size] += 1
    return trim(zero), trim(one)


def q_profile_literal(graph: nx.Graph) -> dict[int, Fraction]:
    independent, one_edge = zero_one_edge_rows(graph)
    profile: dict[int, Fraction] = {}
    for rank in range(1, len(independent)):
        denominator = rank * independent[rank]
        if denominator:
            numerator = one_edge[rank + 1] if rank + 1 < len(one_edge) else 0
            profile[rank] = Fraction(numerator, denominator)
    return profile


def is_unimodal(row: list[int]) -> bool:
    descending = False
    for left, right in zip(row, row[1:]):
        if right < left:
            descending = True
        elif right > left and descending:
            return False
    return True


def symbolic_audit() -> dict[str, object]:
    # Exact two-block mixture identity.
    d0, d1, c0, c1 = sp.symbols("d0 d1 c0 c1")
    D0, D1, C0, C1 = sp.symbols("D0 D1 C0 C1")
    M0 = c0 * D0 - d0 * C0
    M1 = c1 * D1 - d1 * C1
    M = (c0 + c1) * (D0 + D1) - (d0 + d1) * (C0 + C1)
    U = c1 * d0 - c0 * d1
    Wt = d0 * D1 - d1 * D0
    mixture_rhs = (d0 + d1) * (d1 * M0 + d0 * M1) - U * Wt
    assert sp.expand(d0 * d1 * M - mixture_rhs) == 0
    anchor_cross = sp.expand((c0 + c1) * d0 - c0 * (d0 + d1))
    assert anchor_cross == U

    # The proved rooted reserve plus the smaller-forest q_j<=q_2 margin
    # gives the included block's self-envelope.
    j, t = sp.symbols("j t", integer=True)
    f2, fj, z2, zj, h2, hj = sp.symbols("f2 fj z2 zj h2 hj")
    included_margin = (
        (j + 1) * (z2 + h2 + t * f2) * fj
        - 3 * f2 * (zj + hj + t * fj)
    )
    q2_margin = j * z2 * fj - 2 * f2 * zj
    rooted_reserve = (
        (2 * (j + 1) * h2 + (j - 2) * (2 * f2 - z2)) * fj
        - 6 * hj * f2
    )
    included_decomposition = (
        3 * q2_margin
        + rooted_reserve
        + 2 * (j - 2) * (t - 1) * f2 * fj
    )
    assert sp.expand(2 * included_margin - included_decomposition) == 0

    # q_r<=q_3<=q_2 implies the all-rank tree component-surplus margin.
    r, ir, i2, i3, sr, s3, m2, W = sp.symbols(
        "r ir i2 i3 sr s3 m2 W"
    )
    envelope_margin = r * ir * s3 - 3 * i3 * sr
    low_anchor_margin = 3 * m2 * i3 - i2 * s3
    surplus_margin = r * m2 * ir - W * sr
    decomposition = (
        W * envelope_margin / (3 * i3)
        + W * r * ir * low_anchor_margin / (3 * i3 * i2)
        + r * m2 * ir * (i2 - W) / i2
    )
    assert sp.factor(surplus_margin - decomposition) == 0
    A = r * ir
    C = A - sr
    e = W - m2
    assert sp.expand(W * C - e * A - surplus_margin) == 0

    return {
        "mixture_identity": (
            "d0*d1*M=(d0+d1)(d1*M0+d0*M1)-U*W, "
            "U=c1*d0-c0*d1, W=d0*D1-d1*D0"
        ),
        "anchor_equivalence": (
            "q3(total)>=q3(excluded) iff U>=0 (positive denominators)"
        ),
        "included_margin_identity": (
            "2*M1=3*(j*z2*fj-2*f2*zj)+R_j+"
            "2*(j-2)*(t-1)*f2*fj"
        ),
        "tree_component_surplus_decomposition": (
            "r*m2*i_r-W*s_r = W/(3*i3)*(r*i_r*s3-3*i3*s_r) + "
            "W*r*i_r/(3*i3*i2)*(3*m2*i3-i2*s3) + "
            "r*m2*i_r*(i2-W)/i2"
        ),
        "component_form": "W*C_(r-1)-e*A_(r-1)=r*m2*i_r-W*s_r",
    }


def matching_base_audit() -> dict[str, object]:
    """Audit the all-order matching-plus-isolates base formula."""
    checks = 0
    literal_checks = 0
    for matching_edges in range(0, 9):
        for isolates in range(0, 9):
            if matching_edges == isolates == 0:
                continue
            independent = multiply(
                [math.comb(matching_edges, k) * 2**k for k in range(matching_edges + 1)],
                [math.comb(isolates, k) for k in range(isolates + 1)],
            )
            if matching_edges:
                residual = multiply(
                    [
                        matching_edges * math.comb(matching_edges - 1, k) * 2**k
                        for k in range(matching_edges)
                    ],
                    [math.comb(isolates, k) for k in range(isolates + 1)],
                )
            else:
                residual = [0]
            denominator = derivative(independent)
            profile = {
                index + 1: Fraction(
                    residual[index] if index < len(residual) else 0,
                    value,
                )
                for index, value in enumerate(denominator)
                if value
            }
            if matching_edges <= 3 and isolates <= 3:
                graph = nx.disjoint_union(
                    nx.Graph([
                        (2 * index, 2 * index + 1)
                        for index in range(matching_edges)
                    ]),
                    nx.empty_graph(isolates),
                )
                graph = nx.convert_node_labels_to_integers(graph)
                assert q_profile_literal(graph) == profile
                literal_checks += 1
            anchor = profile.get(3)
            if anchor is not None:
                for rank, value in profile.items():
                    if rank >= 4:
                        assert value <= anchor
                        checks += 1

    # If m,l>=1, after removing a common factor A the coefficient ratio is
    # m(1+u)/((2m+l)+(2m+2l)u).  Its derivative in u is -m*l/den^2.
    m, ell, u = sp.symbols("m ell u", positive=True)
    ratio = m * (1 + u) / ((2 * m + ell) + (2 * m + 2 * ell) * u)
    assert sp.factor(sp.diff(ratio, u)) == (
        -ell * m / (2 * ell * u + ell + 2 * m * u + 2 * m) ** 2
    )
    return {
        "theorem": (
            "Every matching plus isolated vertices has q_r<=q3 for every "
            "supported r>=4.  If there are no isolates q_r=1/2; otherwise "
            "the displayed ratio decreases because the common real-rooted "
            "factor has log-concave coefficients."
        ),
        "bounded_literal_checks": checks,
        "direct_subset_cross_checks": literal_checks,
        "bounded_range": "0<=matching_edges,isolates<=8",
    }


def terminal_decomposition_audit() -> dict[str, object]:
    """Check the structural induction split on every atlas forest."""
    forests = 0
    decomposed = 0
    base_matchings = 0
    for graph in nx.graph_atlas_g():
        if len(graph) and not nx.is_forest(graph):
            continue
        graph = nx.convert_node_labels_to_integers(graph)
        forests += 1
        large_components = [
            set(component)
            for component in nx.connected_components(graph)
            if len(component) >= 3
        ]
        if not large_components:
            assert all(len(component) <= 2 for component in nx.connected_components(graph))
            base_matchings += 1
            continue

        component = large_components[0]
        witness = None
        for v in sorted(component):
            neighbors = list(graph.neighbors(v))
            if len(neighbors) < 2:
                continue
            nonleaves = [x for x in neighbors if graph.degree(x) > 1]
            if len(nonleaves) > 1:
                continue
            w = nonleaves[0] if nonleaves else min(neighbors)
            leaves = [x for x in neighbors if x != w]
            if leaves and all(graph.degree(x) == 1 for x in leaves):
                witness = (v, w, leaves)
                break
        assert witness is not None
        v, w, leaves = witness
        base = graph.copy()
        base.remove_nodes_from({v, *leaves})
        rebuilt = base.copy()
        new_v = max(rebuilt.nodes(), default=-1) + 1
        rebuilt.add_edge(w, new_v)
        for offset in range(len(leaves)):
            rebuilt.add_edge(new_v, new_v + 1 + offset)
        assert nx.is_isomorphic(graph, rebuilt)
        assert len(leaves) >= 1
        assert len(base) < len(graph)
        decomposed += 1

    return {
        "atlas_forests": forests,
        "terminally_decomposed": decomposed,
        "matching_isolate_bases": base_matchings,
        "all_decomposition_checks_passed": True,
        "all_order_reason": (
            "In any tree component of order at least three, take an endpoint "
            "of a longest path and its neighbor v.  Every neighbor of v off "
            "that path is a leaf.  For a star, retain one leaf as w."
        ),
    }


def implication_failure_guards() -> dict[str, object]:
    # Two actual trees obey the q3 envelope but have negative Q4.  Hence the
    # envelope does not algebraically supply the three-halves reserve.
    q4_witnesses = []
    for graph6, expected_row, expected_q4 in (
        ("FpOGG", [1, 7, 15, 10, 1], -2),
        ("FqD?G", [1, 7, 15, 11, 1], -3),
    ):
        graph = nx.from_graph6_bytes(graph6.encode("ascii"))
        independent, _ = zero_one_edge_rows(graph)
        profile = q_profile_literal(graph)
        assert independent == expected_row
        assert all(value <= profile[3] for rank, value in profile.items() if rank >= 4)
        q4 = 8 * independent[4] ** 2 - independent[3] * independent[4]
        q4 -= 10 * independent[3] * (independent[5] if len(independent) > 5 else 0)
        assert q4 == expected_q4
        q4_witnesses.append({
            "graph6": graph6,
            "independence_row": independent,
            "q_profile": {str(rank): str(value) for rank, value in profile.items()},
            "Q4": q4,
        })

    # A graph-level guard: the complete multipartite graph with parts
    # (6,1,...,1) has no induced exactly-one-edge set of size >=3, so every
    # q_r from rank two onward is zero, but its independence sequence has a
    # strict valley 16>15<20.  This is not a forest counterexample; it proves
    # that any q-envelope-to-unimodality bridge must use acyclicity.
    multipartite = nx.complete_multipartite_graph(6, *([1] * 10))
    independent, one_edge = zero_one_edge_rows(multipartite)
    expected = [1, 16, 15, 20, 15, 6, 1]
    assert independent == expected
    assert not is_unimodal(independent)
    assert one_edge[2] == multipartite.number_of_edges()
    assert all((one_edge[size] if size < len(one_edge) else 0) == 0 for size in range(3, 17))
    profile = q_profile_literal(multipartite)
    assert all(profile.get(rank, Fraction(0)) == 0 for rank in range(2, 7))

    # Moment-level guard: q=1-E[C]/mu is identical in these two laws, while
    # the Q-normalized statistic 5-2(Var(X)+2E[C])/mu changes sign.
    laws = {
        "constant": {"mu": 4, "EC": 1, "var": 0},
        "split": {"mu": 4, "EC": 1, "var": 16},
    }
    for row in laws.values():
        row["q"] = str(Fraction(1) - Fraction(row["EC"], row["mu"]))
        row["Q_normalized"] = str(
            Fraction(5) - Fraction(2 * (row["var"] + 2 * row["EC"]), row["mu"])
        )
    assert laws["constant"]["q"] == laws["split"]["q"] == "3/4"
    assert Fraction(laws["constant"]["Q_normalized"]) > 0
    assert Fraction(laws["split"]["Q_normalized"]) < 0

    return {
        "q_envelope_does_not_supply_Q4": q4_witnesses,
        "nonforest_q_envelope_nonunimodal_guard": {
            "graph": "complete multipartite with parts (6,1,1,1,1,1,1,1,1,1,1)",
            "order": 16,
            "independence_row": independent,
            "exactly_one_edge_row": one_edge,
            "q_profile": {str(rank): str(value) for rank, value in profile.items()},
            "scope": "actual graph, not a forest",
        },
        "same_q_different_variance_guard": laws,
    }


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED
    rooted = json.loads(
        (HERE / "rooted_forest_q3_reserve_all_rank_assembly_independent_20260828.json")
        .read_text(encoding="utf-8")
    )
    low_anchor = json.loads(
        (HERE / "all_tree_q3_q2_theorem_exact_root_20260828.json")
        .read_text(encoding="utf-8")
    )
    anchor = json.loads(
        (HERE / "terminal_q3_anchor_ordering_independent_audit_20260828.json")
        .read_text(encoding="utf-8")
    )
    assert rooted["status"] == "PASS_EXACT_ALL_ORDER_ROOTED_FOREST_Q3_RESERVE_ASSEMBLY"
    assert low_anchor["status"] == "PASS_EXACT_ALL_TREE_Q3_AT_MOST_Q2_THEOREM"
    assert anchor["status"] == "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING_AUDIT"

    report = {
        "schema": "terminal-q3-global-bridge-conditional-audit-v1",
        "status": "PASS_EXACT_CONDITIONAL_BRIDGE_AUDIT_UNRESOLVED_FOREST_AND_UNIMODALITY_GAPS",
        "symbolic_audit": symbolic_audit(),
        "matching_base": matching_base_audit(),
        "terminal_decomposition": terminal_decomposition_audit(),
        "conditional_strong_induction": {
            "statement": (
                "If (i) q3<=q2 holds for every smaller forest, (ii) the q3 "
                "anchor ordering holds for every forest-base terminal "
                "extension, and (iii) the included-block payment holds for "
                "every such extension, then strong induction on total order "
                "proves q_r<=q3 for every forest."
            ),
            "excluded_block": (
                "Q=G disjoint-union t isolates has one fewer vertex than T, "
                "so its self-envelope is the induction hypothesis."
            ),
            "included_block": (
                "F=G-w is smaller.  Its q-envelope plus forest q3<=q2 and "
                "the proved rooted-forest reserve make M1 nonnegative by the "
                "audited identity."
            ),
            "mixture": (
                "Forest-base anchor U>=0 and the positive-part payment cover "
                "the only adverse denominator-weight shift."
            ),
            "base": "matchings plus isolates, proved above",
        },
        "proved_consequence_if_tree_envelope_is_available": {
            "theorem": (
                "For every tree and every supported rank r>=3, "
                "r*m2*i_r>=binom(n-2,2)*s_r; equivalently "
                "W*C_(r-1)>=e*A_(r-1)."
            ),
            "inputs": "q_r<=q3, the audited all-tree q3<=q2 theorem, and i2>=W",
            "proof": "exact nonnegative decomposition in symbolic_audit",
        },
        "unresolved_obligations": [
            {
                "id": "FQ32",
                "statement": "q3(F)<=q2(F) for every finite forest F",
                "reason": (
                    "The pinned theorem is tree-only, while F=G-w in the "
                    "included block is generally disconnected."
                ),
            },
            {
                "id": "FA",
                "statement": (
                    "q3(T)>=q3(G disjoint-union t isolates) for every marked "
                    "forest base G, not only every marked tree base"
                ),
                "reason": "This is exactly U>=0 in the mixture identity.",
            },
            {
                "id": "FP",
                "statement": (
                    "The terminal included-block positive-part payment for "
                    "every marked forest base and every supported target rank"
                ),
                "reason": (
                    "A tree-base payment does not cover the simultaneous "
                    "forest induction needed after vertex deletion."
                ),
            },
            {
                "id": "PGC_OR_REPLACEMENT",
                "statement": (
                    "A forest-specific theorem from the q envelope/component "
                    "surplus to the prefix pendant cascade, or a different "
                    "direct unimodality bridge"
                ),
                "reason": (
                    "q_r=1-E[C]/E[X] controls only a component-to-extension "
                    "mean.  PGC also contains Var(X) and the between-leaf-class "
                    "mean-separation payment."
                ),
            },
        ],
        "scope_guards": implication_failure_guards(),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This report proves a conditional induction and the component-"
            "surplus consequence.  It does not prove the forest hypotheses, "
            "PGC, unimodality, or Erdos Problem 993."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(report["status"])
    print("ATLAS_FORESTS", report["terminal_decomposition"]["atlas_forests"])
    print("MATCHING_BASE_CHECKS", report["matching_base"]["bounded_literal_checks"])
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
