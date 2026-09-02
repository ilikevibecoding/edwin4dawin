#!/usr/bin/env python3
"""Fail-closed assembly of the all-marked-forest rank-four theorem.

For a finite forest B with distinct marks u,v, this verifier assembles the
exact whole-sibling-bundle identity, the all-forest N2/N3 theorem, the
nonnegative rank-four bundle coefficients in every rooted deepest-support
mode, and the terminal double-broom theorem.  The conclusion is

    N4(B;u,v) >= 0

for every marked forest.  This is one dependency of the Erdos #993 proof
program; it does not by itself prove independent-set unimodality.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from math import comb
from pathlib import Path

import networkx as nx

from probe_iso_four_minor_third_leaf_root import four_minor_vector


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_all_forest_n4_bundle_induction_exact_root_20260829.json"


DEPENDENCIES = {
    "bundle_identity_and_g4_g6": {
        "report": "iso_n4_whole_bundle_binomial_symbolic_root_20260829.json",
        "report_sha256": "8B69FF78991FBB882FEEC5FC2A7A94D44EB5024AEB913B9DE4D6F3CC22B03494",
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_TOP_BINOMIAL_COEFFICIENTS",
        "source": "derive_iso_n4_bundle_polynomial_root.py",
        "source_sha256": "F312FB481C76129380823CFC5E1FA6BB2B7D794846136A14477FCC9245D8870E",
    },
    "g3_universal": {
        "report": "iso_n4_bundle_g3_independent_audit_bundle_g3_20260829.json",
        "report_sha256": "0747B3A21A7CBB37D927B5ABC846E45ADC4697FFB66BCB07C2D0FBA11B301BFF",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G3_FOREST_PROOF_AUDIT_BUNDLE_G3",
        "source": "audit_iso_n4_bundle_g3_independent_bundle_g3.py",
        "source_sha256": "ED17F97BBE47502CF2C839DCB7B72740DB4DC74BFE33EB7788A437E1AA1DF318",
    },
    "g1_singleton_ordinary": {
        "report": "iso_n4_bundle_g1_deepest_ordinary_exact_root_20260829.json",
        "report_sha256": "EF8A3E68E821B51B46744B508D6C1C846686BDFE6C9CCFFC0625C1CDF5343351",
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G1_DEEPEST_ORDINARY",
        "source": "prove_iso_n4_bundle_g1_deepest_ordinary_root.py",
        "source_sha256": "DA33E9F2C461AF57F3C4000955CFD1687F6EDEB5682ABE2A898EB9E9632D7FEA",
    },
    "g2_singleton_ordinary": {
        "report": "iso_n4_bundle_g2_deepest_ordinary_exact_root_20260829.json",
        "report_sha256": "55CFC6ACEC4A3647F3547F7C6E89085D12471A7D8027411A0752FCC027CF2D17",
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G2_DEEPEST_ORDINARY",
        "source": "prove_iso_n4_bundle_g2_deepest_ordinary_root.py",
        "source_sha256": "72AD4B255DFD7F4217081249551B1E85CE102B1C6E4C0D296434AF45973BB5ED",
    },
    "g12_singleton_endpoint": {
        "report": "iso_n4_bundle_g12_endpoint_parent_independent_audit_g1_bernstein_20260829.json",
        "report_sha256": "6BD3EEA426C08AA1C65DCC0A5EB74635A7849BA7011BA8C6AB60BD2ADC74CE05",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_G1_G2_AUDIT_G1_BERNSTEIN",
        "source": "audit_iso_n4_bundle_g12_endpoint_parent_independent_g1_bernstein.py",
        "source_sha256": "DE8A182E15D9624E3C2F492C177F94AD66064DD2BC8D9048C6026A5F7B3CB363",
    },
    "g12_no_mark_root_k0": {
        "report": "iso_n4_bundle_g12_no_parent_k0_independent_audit_agent_20260829.json",
        "report_sha256": "0644F23004A3EDCEED1D3147C7AD18F9F0FF2B5B55C0E4BA602C43C2A3D007DE",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K0_AUDIT_AGENT",
        "source": "audit_iso_n4_bundle_g12_no_parent_k0_independent_agent.py",
        "source_sha256": "BE7F1A401BCA0BAB69F81FD2B1FAC5C97ED53F663909C34A433902A968E6FC3C",
    },
    "g12_internal_spine_broom": {
        "report": "iso_n4_bundle_internal_spine_broom_g12_independent_exact_g1_bernstein_20260829.json",
        "report_sha256": "944D02AA0F366D8E9CD2ACA22C9C6C4CF3AE6747FCD57BB5FD6014F35B60C3F8",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_G12_G1_BERNSTEIN",
        "source": "prove_iso_n4_bundle_internal_spine_broom_g12_independent_g1_bernstein.py",
        "source_sha256": "01B49C9B6E7A8108770FD075B0012223447917EE0F333AFC800A5A0CE6F538A9",
    },
    "all_forest_n2_n3": {
        "report": "iso_all_forest_n2_n3_assembly_exact_root_20260829.json",
        "report_sha256": "0E35EDD2D7AA726A9F9A8B0BDF78A97F15E3004F717B495306B90A2FA0CEA157",
        "marker": "PASS_EXACT_ALL_MARKED_FOREST_N2_N3_ASSEMBLY_ROOT",
        "source": "assemble_iso_all_forest_n2_n3_root.py",
        "source_sha256": "47DFB8842F06EA5193D6436ED36C08B5690C4082486AA49452657FF9158CDE79",
    },
    "terminal_rank4": {
        "report": "iso_n4_terminal_brooms_isolates_independent_exact_agent_20260829.json",
        "report_sha256": "91B157AF31E2DA4D42F250AA79D6FD3C00DC42362EC2A1263E7F073099C8C148",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_TERMINAL_BROOMS_ISOLATES_AGENT",
        "source": "prove_iso_n4_terminal_brooms_isolates_independent_agent.py",
        "source_sha256": "425E9616C9424D1DAA05E9D4BD17C6D9D63A4B83BED605591BDE02E836686627",
    },
}


MODES = {
    "no_mark_root_k0",
    "singleton_ordinary",
    "singleton_endpoint",
    "internal_spine_ordinary",
    "internal_spine_endpoint",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_dependencies() -> dict[str, dict[str, str]]:
    pins: dict[str, dict[str, str]] = {}
    for name, spec in DEPENDENCIES.items():
        report_path = HERE / spec["report"]
        source_path = HERE / spec["source"]
        assert report_path.is_file(), report_path
        assert source_path.is_file(), source_path
        assert sha256(report_path) == spec["report_sha256"], name
        assert sha256(source_path) == spec["source_sha256"], name
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["marker"] == spec["marker"], name
        assert report.get("source_sha256") == spec["source_sha256"], name
        pins[name] = dict(spec)

    top = json.loads((HERE / DEPENDENCIES["bundle_identity_and_g4_g6"]["report"]).read_text())
    assert top["degree_in_M"] == 6
    assert top["identity"] == (
        "Gamma_M=N4((1+x)^M C+xD)-N4(C+xD)-sum_(t=0)^(M-1)N3((1+x)^t C)"
    )
    assert top["proved_top_coefficients"]["binom_M_4_lower_bound"] == "33*n+12"
    assert top["proved_top_coefficients"]["binom_M_5"] == "50"
    assert top["proved_top_coefficients"]["binom_M_6"] == "0"

    low = json.loads((HERE / DEPENDENCIES["all_forest_n2_n3"]["report"]).read_text())
    assert low["theorem"] == "N2(B;u,v)>=0 and N3(B;u,v)>=0 for every finite marked forest."

    terminal = json.loads((HERE / DEPENDENCIES["terminal_rank4"]["report"]).read_text())
    assert terminal["theorem"] == (
        "Let F be a forest with distinct marked vertices u,v and no unmarked vertex "
        "adjacent to an unmarked leaf.  Then the rank-four four-minor Newton quantity "
        "N4(F;u,v) is nonnegative."
    )
    return pins


def rooted_forest_data(
    graph: nx.Graph, u: int, v: int
) -> tuple[dict[int, int | None], dict[int, int], dict[int, list[int]], dict[int, int]]:
    parent: dict[int, int | None] = {}
    depth: dict[int, int] = {}
    children: dict[int, list[int]] = {node: [] for node in graph}
    root_of: dict[int, int] = {}
    for component in nx.connected_components(graph):
        if v in component:
            root = v
        elif u in component:
            root = u
        else:
            root = min(component)
        parent[root] = None
        depth[root] = 0
        root_of[root] = root
        stack = [root]
        while stack:
            node = stack.pop()
            for neighbor in sorted(graph.neighbors(node), reverse=True):
                if neighbor == parent[node]:
                    continue
                assert neighbor not in parent, "cycle encountered in forest rooting"
                parent[neighbor] = node
                depth[neighbor] = depth[node] + 1
                root_of[neighbor] = root
                children[node].append(neighbor)
                stack.append(neighbor)
    assert set(parent) == set(graph)
    return parent, depth, children, root_of


def deepest_eligible_support(graph: nx.Graph, u: int, v: int) -> dict | None:
    parent, depth, children, root_of = rooted_forest_data(graph, u, v)
    candidates = []
    for support in graph:
        if support in (u, v):
            continue
        bundle = sorted(
            child
            for child in children[support]
            if child not in (u, v) and graph.degree(child) == 1
        )
        if bundle:
            candidates.append((depth[support], -support, support, bundle))
    if not candidates:
        return None
    _, _, support, bundle = max(candidates)
    return {
        "support": support,
        "bundle": bundle,
        "parent": parent,
        "depth": depth,
        "children": children,
        "root_of": root_of,
    }


def descendants(children: dict[int, list[int]], start: int) -> set[int]:
    out: set[int] = set()
    stack = [start]
    while stack:
        node = stack.pop()
        if node in out:
            continue
        out.add(node)
        stack.extend(children[node])
    return out


def classify_deepest_support(graph: nx.Graph, u: int, v: int, cell: dict) -> dict:
    support = cell["support"]
    bundle = set(cell["bundle"])
    parent = cell["parent"][support]
    children = cell["children"]
    nonbundle_children = [child for child in children[support] if child not in bundle]

    connector = None
    if nx.node_connected_component(graph, u) == nx.node_connected_component(graph, v):
        connector = nx.shortest_path(graph, u, v)

    if connector is not None and support in connector:
        assert parent is not None
        assert len(nonbundle_children) == 1
        child = nonbundle_children[0]
        position = connector.index(support)
        assert position > 0 and position < len(connector) - 1
        assert connector[position - 1] == child
        assert connector[position + 1] == parent

        child_subtree = descendants(children, child)
        child_path = nx.shortest_path(graph, child, u)
        assert set(child_path).issubset(child_subtree)
        extra = child_subtree - set(child_path)
        assert all(graph.degree(node) == 1 and graph.has_edge(node, u) for node in extra)
        mode = "internal_spine_endpoint" if parent == v else "internal_spine_ordinary"
        result = {
            "mode": mode,
            "ell": len(child_path),
            "k": len(extra),
            "parent": parent,
        }
    else:
        # A deepest support outside the protected connector has no nonleaf
        # child: such a child subtree has an unmarked leaf and hence a deeper
        # eligible unmarked support.
        assert not nonbundle_children
        if parent is None:
            component = nx.node_connected_component(graph, support)
            assert u not in component and v not in component
            assert set(graph.neighbors(support)) == bundle
            result = {"mode": "no_mark_root_k0", "parent": None}
        elif parent in (u, v):
            result = {"mode": "singleton_endpoint", "parent": parent}
        else:
            result = {"mode": "singleton_ordinary", "parent": parent}

    assert result["mode"] in MODES
    return result


def classify_terminal(graph: nx.Graph, u: int, v: int) -> str:
    marks = {u, v}
    same_component = nx.node_connected_component(graph, u) == nx.node_connected_component(graph, v)
    for component in nx.connected_components(graph):
        component_marks = marks & component
        if not component_marks:
            assert len(component) == 1
            continue
        if len(component_marks) == 1:
            mark = next(iter(component_marks))
            assert all(
                graph.degree(node) == 1 and graph.has_edge(node, mark)
                for node in component - {mark}
            )
            continue
        path = nx.shortest_path(graph, u, v)
        extra = component - set(path)
        assert all(
            graph.degree(node) == 1
            and (graph.has_edge(node, u) or graph.has_edge(node, v))
            for node in extra
        )
    return "connected_double_broom_plus_isolates" if same_component else "disconnected_rooted_stars_plus_isolates"


def add_leaves(graph: nx.Graph, support: int, count: int) -> nx.Graph:
    out = graph.copy()
    next_node = max(out.nodes, default=-1) + 1
    for offset in range(count):
        leaf = next_node + offset
        out.add_edge(support, leaf)
    return out


def add_isolates(graph: nx.Graph, count: int) -> nx.Graph:
    out = graph.copy()
    next_node = max(out.nodes, default=-1) + 1
    out.add_nodes_from(range(next_node, next_node + count))
    return out


def rank_value(graph: nx.Graph, u: int, v: int, rank: int) -> int:
    vector = four_minor_vector(graph, u, v)
    # The defining coefficient expression is zero beyond the stored support.
    return vector[rank] if rank < len(vector) else 0


def binomial_coefficients(values: list[int]) -> list[int]:
    rows = [values]
    while len(rows[-1]) > 1:
        row = rows[-1]
        rows.append([row[index + 1] - row[index] for index in range(len(row) - 1)])
    return [row[0] for row in rows]


def direct_bundle_coefficients(base: nx.Graph, support: int, u: int, v: int) -> list[int]:
    assert support not in (u, v)
    c_graph = base.copy()
    c_graph.remove_node(support)
    base_n4 = rank_value(base, u, v, 4)
    gamma = []
    for bundle_size in range(8):
        bundled = add_leaves(base, support, bundle_size)
        lower_payment = 0
        for isolates in range(bundle_size):
            lower_payment += rank_value(add_isolates(c_graph, isolates), u, v, 3)
        gamma.append(rank_value(bundled, u, v, 4) - base_n4 - lower_payment)
    coefficients = binomial_coefficients(gamma)
    assert coefficients[0] == 0
    assert coefficients[7] == 0
    assert all(value >= 0 for value in coefficients[1:7])
    assert coefficients[5] == 50
    assert coefficients[6] == 0
    assert coefficients[4] >= 33 * len(c_graph) + 12
    assert coefficients[3] > 0
    return coefficients


def fixture_cells() -> list[tuple[nx.Graph, int, int, str]]:
    fixtures = []

    graph = nx.Graph([(0, 1), (0, 2)])
    graph.add_nodes_from([10, 11])
    fixtures.append((graph, 10, 11, "no_mark_root_k0"))

    graph = nx.Graph([(0, 1), (1, 2)])
    graph.add_nodes_from([10, 11])
    fixtures.append((graph, 10, 11, "singleton_ordinary"))

    graph = nx.Graph([(0, 1), (1, 2)])
    graph.add_node(3)
    fixtures.append((graph, 0, 3, "singleton_endpoint"))

    graph = nx.Graph([(0, 1), (1, 2), (2, 3), (3, 4), (2, 5), (0, 6)])
    fixtures.append((graph, 0, 4, "internal_spine_ordinary"))

    graph = nx.Graph([(0, 1), (1, 2), (2, 3), (2, 4), (0, 5)])
    fixtures.append((graph, 0, 3, "internal_spine_endpoint"))
    return fixtures


def finite_structural_and_literal_replay(maximum_order: int = 6) -> dict:
    mode_counts: Counter[str] = Counter()
    terminal_counts: Counter[str] = Counter()
    minimum_coefficients = {index: None for index in range(1, 7)}
    marked_cells = bundle_cells = 0

    cases: list[tuple[nx.Graph, int, int, str | None]] = []
    for graph0 in nx.graph_atlas_g():
        if len(graph0) < 2 or len(graph0) > maximum_order or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        for u in graph:
            for v in graph:
                if u < v:
                    cases.append((graph, u, v, None))
    cases.extend(fixture_cells())

    for graph, u, v, expected_mode in cases:
        marked_cells += 1
        cell = deepest_eligible_support(graph, u, v)
        if cell is None:
            assert expected_mode is None
            terminal_counts[classify_terminal(graph, u, v)] += 1
            assert rank_value(graph, u, v, 4) >= 0
            continue

        classification = classify_deepest_support(graph, u, v, cell)
        mode = classification["mode"]
        if expected_mode is not None:
            assert mode == expected_mode
        mode_counts[mode] += 1
        bundle_cells += 1

        base = graph.copy()
        base.remove_nodes_from(cell["bundle"])
        coefficients = direct_bundle_coefficients(base, cell["support"], u, v)
        for index in range(1, 7):
            value = coefficients[index]
            previous = minimum_coefficients[index]
            minimum_coefficients[index] = value if previous is None else min(previous, value)

        # Directly replay the telescope for the bundle actually present in
        # the atlas/fixture cell.
        actual_bundle = len(cell["bundle"])
        c_graph = base.copy()
        c_graph.remove_node(cell["support"])
        lower = sum(
            rank_value(add_isolates(c_graph, isolates), u, v, 3)
            for isolates in range(actual_bundle)
        )
        gamma = rank_value(graph, u, v, 4) - rank_value(base, u, v, 4) - lower
        reconstructed = sum(
            coefficients[index] * comb(actual_bundle, index)
            for index in range(1, 7)
        )
        assert gamma == reconstructed >= 0

    assert set(mode_counts) == MODES
    assert set(terminal_counts) == {
        "connected_double_broom_plus_isolates",
        "disconnected_rooted_stars_plus_isolates",
    }
    return {
        "atlas_orders": [2, maximum_order],
        "unordered_marked_cells_including_fixtures": marked_cells,
        "bundle_cells": bundle_cells,
        "mode_counts": dict(sorted(mode_counts.items())),
        "terminal_counts": dict(sorted(terminal_counts.items())),
        "minimum_direct_binomial_coefficients": {
            f"g{index}": value for index, value in minimum_coefficients.items()
        },
        "role": (
            "Independent finite replay of the structural classifier, the exact Gamma telescope, "
            "and all seven forward differences. The all-order theorem is the dependency-pinned "
            "structural induction, not this finite census."
        ),
    }


def assemble_report() -> dict:
    pins = load_dependencies()
    replay = finite_structural_and_literal_replay()
    return {
        "marker": "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT",
        "theorem": "N4(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v.",
        "rooting_and_exhaustion": {
            "roots": (
                "Root the component containing v at v; if u is in another component, root that "
                "component at u; root every component with neither mark arbitrarily."
            ),
            "choice": (
                "Choose a deepest unmarked vertex s having at least one unmarked leaf child, "
                "and let Z be the complete bundle of such children."
            ),
            "no_mark_component": (
                "Every nonleaf child subtree would contain a deeper eligible support. Hence s has "
                "only its leaf bundle and, unless it is the root, one parent. The root case is "
                "exactly no-mark no-parent k=0; the nonroot case is singleton ordinary."
            ),
            "one_mark_or_off_connector": (
                "The same deepest-support argument leaves only the parent outside Z. A parent equal "
                "to u or v is singleton endpoint; otherwise it is singleton ordinary."
            ),
            "protected_connector": (
                "If s lies on the u-v connector, it has parent p toward v and one child branch toward u. "
                "No internal unmarked vertex of that branch can support an off-path leaf without being "
                "a deeper eligible support. Only the marked endpoint u can support extra leaves. Thus "
                "the branch is exactly the one-ended broom B_(ell,k), with p=v or p!=v."
            ),
            "modes": sorted(MODES),
            "terminal": (
                "If an unmarked leaf has an unmarked neighbor, then it is a leaf child of that "
                "neighbor, except when it is the chosen root of a no-mark component; in that exceptional "
                "orientation the same finite component has another unmarked leaf child (or is K2 and the "
                "root itself supports its leaf child). Hence absence of an eligible support is exactly the "
                "terminal theorem's condition. Components without marks are then isolates; a one-mark "
                "component is a star centered at its mark; and a two-mark component is a double broom "
                "on the u-v path."
            ),
        },
        "bundle_payment": {
            "rows": "For H=B-Z, C=H-s and D=H-N_H[s], the four independence rows of B are (1+x)^M C+xD.",
            "identity": (
                "N4(B)-N4(H)-sum_(t=0)^(M-1)N3((H-s) union tK1) "
                "=sum_(j=1)^6 g_j binom(M,j)."
            ),
            "coefficient_coverage": {
                "g1_g2": {
                    "singleton_ordinary": ["g1_singleton_ordinary", "g2_singleton_ordinary"],
                    "singleton_endpoint": ["g12_singleton_endpoint"],
                    "no_mark_root_k0": ["g12_no_mark_root_k0"],
                    "internal_spine_ordinary": ["g12_internal_spine_broom"],
                    "internal_spine_endpoint": ["g12_internal_spine_broom"],
                },
                "g3": "g3_universal",
                "g4_g5_g6": "bundle_identity_and_g4_g6",
            },
            "signs": "All g1,...,g6 are nonnegative; universally g3>0, g4>=33|C|+12, g5=50, g6=0.",
            "lower_rank_payment": "Every N3((H-s) union tK1;u,v) is nonnegative by the pinned all-forest N2/N3 theorem.",
        },
        "strong_induction": {
            "measure": "number of unmarked vertices (equivalently total order, since the two marks persist)",
            "step": (
                "For M=|Z|>=1, bundle positivity and all-forest N3 give N4(B)>=N4(H). "
                "The forest H has M fewer unmarked vertices, so the induction hypothesis gives N4(H)>=0."
            ),
            "base": "With no eligible support, the pinned terminal theorem gives N4>=0.",
            "conclusion": "N4(B;u,v)>=0 for every finite marked forest.",
        },
        "dependencies": pins,
        "finite_replay": replay,
        "scope_guard": (
            "This completes the all-forest rank-four four-minor theorem only. Ranks five and above, "
            "the final ISO/Newton propagation, and Erdos Problem #993 remain separate obligations."
        ),
        "source_sha256": sha256(Path(__file__)),
    }


def main() -> None:
    report = assemble_report()
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    summary = {
        "marker": report["marker"],
        "theorem": report["theorem"],
        "finite_replay": report["finite_replay"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
