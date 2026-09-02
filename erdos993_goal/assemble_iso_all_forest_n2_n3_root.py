#!/usr/bin/env python3
"""Assemble the exact all-marked-forest N2 and N3 theorems.

The three Four-Minor Leaf Lemma modes are already proved at ranks two and
three.  Successive strong inductions on the number of unmarked vertices
reduce every marked forest to either two isolated marks or a bare path whose
endpoints are the marks.  The rank-lowered ordinary/isolate term for N2 is
N1=0 identically; for N3 it is the already established all-forest N2 theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_four_minor_third_leaf_root import four_minor_vector


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_all_forest_n2_n3_assembly_exact_root_20260829.json"
DEPENDENCIES = {
    "ordinary": (
        "iso_compact_ordinary_prefix_r2_r3_exact_root_20260829.json",
        "PASS_EXACT_ALL_FOREST_COMPACT_ORDINARY_PREFIX_R2_R3_SPLIT",
    ),
    "isolate": (
        "iso_isolate_r2_r3_exact_root_20260829.json",
        "PASS_EXACT_ALL_FOREST_ISOLATE_FML_R2_R3",
    ),
    "collision": (
        "iso_collision_r2_r3_exact_root_20260829.json",
        "PASS_EXACT_ALL_FOREST_COLLISION_FML_R2_R3",
    ),
    "two_terminal_path": (
        "iso_leaf_nested_path_bases_exact_root_20260829.json",
        "PASS_EXACT_ISO_LEAF_NESTED_IDENTITIES_AND_TERMINAL_BASES",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def fixed_rank_path_base() -> dict[str, object]:
    """Prove N2,N3>=0 for every path with its endpoints marked.

    For P_n, I_k(P_n)=binomial(n-k+1,k).  Substitution in the defining
    nine-term four-minor expression gives the displayed fixed-rank forms.
    At rank three the formula is valid from n=3 onward; P_2 is checked
    directly because the formal W=P_(n-2) binomial extension has negative
    upper arguments there.
    """

    n = sp.symbols("n", integer=True, positive=True)

    def path_coefficient(order: sp.Expr, rank: int) -> sp.Expr:
        return sp.binomial(order - rank + 1, rank)

    def symbolic_value(rank: int) -> sp.Expr:
        e = lambda k: path_coefficient(n, k)
        u = lambda k: path_coefficient(n - 1, k)
        w = lambda k: path_coefficient(n - 2, k)
        return sp.factor(sp.combsimp(
            2 * rank * e(rank) * w(rank - 2)
            - (rank + 1) * e(rank + 1) * w(rank - 3)
            + e(rank - 1) * (2 * w(rank - 3) - (rank + 1) * w(rank - 1))
            + u(rank) * (-(rank + 1) * u(rank - 2) - w(rank - 3))
            + u(rank - 1) * (2 * rank * u(rank - 1) + 2 * w(rank - 2))
            + u(rank - 2) * (-(rank + 1) * u(rank) + 2 * u(rank - 2) - w(rank - 1))
            - u(rank) * w(rank - 3)
            + 2 * u(rank - 1) * w(rank - 2)
            - u(rank - 2) * w(rank - 1)
        ))

    n2 = symbolic_value(2)
    n3 = symbolic_value(3)
    expected_n2 = 9 * n - 8
    expected_n3 = 5 * n**3 - 33 * n**2 + 74 * n - 50
    assert sp.expand(n2 - expected_n2) == 0
    assert sp.expand(n3 - expected_n3) == 0

    # N2 is positive for n>=2.  N3 is increasing on the real line because
    # its derivative has negative discriminant, and N3(3)=10.  P2 has N3=2.
    derivative_n3 = sp.diff(expected_n3, n)
    assert expected_n2.subs(n, 2) > 0
    assert sp.discriminant(derivative_n3, n) < 0
    assert sp.LC(sp.Poly(derivative_n3, n)) > 0
    assert expected_n3.subs(n, 3) == 10

    literal = {}
    for order in range(2, 51):
        vector = four_minor_vector(nx.path_graph(order), 0, order - 1)
        assert vector[2] == expected_n2.subs(n, order)
        if order == 2:
            assert vector[3] == 2
        else:
            assert vector[3] == expected_n3.subs(n, order)
        literal[str(order)] = {"N2": vector[2], "N3": vector[3]}

    return {
        "N2_all_n_at_least_2": str(expected_n2),
        "N3_n_at_least_3": str(expected_n3),
        "N3_P2": 2,
        "N3_derivative": str(derivative_n3),
        "N3_derivative_discriminant": int(sp.discriminant(derivative_n3, n)),
        "literal_replay_orders": [2, 50],
        "literal_endpoint_values": {
            "P2": literal["2"],
            "P50": literal["50"],
        },
    }


def main():
    pins = {}
    for name, (filename, marker) in DEPENDENCIES.items():
        path = HERE / filename
        report = json.loads(path.read_text(encoding="utf-8"))
        assert report["marker"] == marker
        pins[name] = {
            "file": filename,
            "sha256": sha256(path),
            "marker": marker,
        }

    # Exact terminal bases after no unmarked leaf or isolate remains.
    two_isolates = nx.empty_graph(2)
    terminal = {
        "two_isolated_marks": four_minor_vector(two_isolates, 0, 1),
        "connected_bare_path": fixed_rank_path_base(),
    }
    assert terminal["two_isolated_marks"][1:4] == [0, 14, 4]

    # Independent finite replay of the assembled consequence.
    checks = 0
    minima = {2: None, 3: None}
    for graph0 in nx.graph_atlas_g():
        if len(graph0) < 2 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        for u in graph:
            for v in graph:
                if u == v:
                    continue
                values = four_minor_vector(graph, u, v)
                for rank in (2, 3):
                    value = values[rank]
                    assert value >= 0
                    minima[rank] = value if minima[rank] is None else min(minima[rank], value)
                    checks += 1

    report = {
        "marker": "PASS_EXACT_ALL_MARKED_FOREST_N2_N3_ASSEMBLY_ROOT",
        "theorem": "N2(B;u,v)>=0 and N3(B;u,v)>=0 for every finite marked forest.",
        "induction": {
            "measure": "number of unmarked vertices",
            "order_of_proof": (
                "First prove N2 by strong induction on the number of unmarked vertices, "
                "using N1=0. Then prove N3 by the same induction, using the already "
                "proved all-forest N2 theorem for every rank-lowered term."
            ),
            "ordinary_leaf": (
                "FML gives Nr(B)>=Nr(B-z)+N_(r-1)(B-{z,s}); "
                "the same-rank graph has fewer unmarked vertices, while the lower-rank "
                "term is N1=0 for r=2 and is covered by all-forest N2 for r=3."
            ),
            "isolated_unmarked_vertex": (
                "FML gives Nr(B)>=Nr(B-z)+N_(r-1)(B-z), with the same rank/order logic."
            ),
            "marked_support_leaf": "collision FML gives Nr(B)>=Nr(B-z).",
            "exhaustion": (
                "If an unmarked isolate or leaf exists, use the corresponding FML mode. "
                "If neither exists, no component without a mark can remain; a component "
                "with exactly one mark contains no unmarked vertex; and a component with "
                "both marks is a tree whose only leaves can be u,v, hence is the bare u-v path. "
                "Thus the only terminal forests are two isolated marks or one bare path "
                "with endpoints u,v."
            ),
            "rank_one_base": "Direct substitution in the nine-term definition gives N1=0 identically.",
            "terminal": (
                "For 2K1 the direct vector is nonnegative. For P_n, endpoint-marked, "
                "N2=9n-8 (n>=2), N3=5n^3-33n^2+74n-50 (n>=3), and N3(P2)=2; "
                "the cubic is increasing because its derivative has negative discriminant."
            ),
        },
        "terminal_vectors_N0_up": terminal,
        "dependencies": pins,
        "finite_replay": {
            "ordered_marked_rank_checks": checks,
            "atlas_orders": [2, 7],
            "minima": {str(rank): value for rank, value in minima.items()},
            "role": "independent finite replay only; the theorem is the induction above",
        },
        "scope_guard": "This proves N2,N3 only; N4 and Erdos Problem 993 are separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "terminal": terminal,
        "finite_replay": report["finite_replay"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
