#!/usr/bin/env python3
"""Independent audit of the ordinary-parent H--K adjacent-k00 scope lemma.

This auditor imports nothing from the producer, the census, or the shared
forest catalogue.  It enumerates forests by its own attach-to-an-earlier-vertex
construction with explicit isomorphism deduplication, decides realizability of
a parent-deletion set by a direct acyclicity test of H plus a new parent
vertex, recounts every (geometry, K-mask) instance, replays the lemma on the
completed forests A=H+p of order at most nine from the other side, rebuilds the
32-key -> 24-core partition from the frozen lower report, recomputes every core
hash from the recorded lower expressions, and re-derives the 20 remaining
cores.  Every reported figure of the producer is compared exactly.
"""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path
import warnings

import networkx as nx
import sympy as sp

# The Weisfeiler-Lehman digest is only a bucketing key; every candidate is
# still compared by an explicit isomorphism test, so its version note is moot.
warnings.filterwarnings("ignore", category=UserWarning, module="networkx.algorithms.graph_hashing")


HERE = Path(__file__).resolve().parent
LOWERS = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_lower_exact_root_20260901.json"
CENSUS = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_census_root_20260901.json"
DOMINANCE = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_exact_root_20260901.json"
PRODUCER_SOURCE = HERE / "derive_iso_n6_bundle_g1_ordinary_parent_hk_adjacent_k00_scope_root.py"
PRODUCER_REPORT = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_adjacent_k00_scope_exact_root_20260902.json"
OUTPUT = HERE / (
    "iso_n6_bundle_g1_ordinary_parent_hk_adjacent_k00_scope_independent_audit_root_20260902.json"
)
EXPECTED_SHA256 = {
    LOWERS.name: "22F1F54F597B2CBA68CD24BC547D1C36075B2BE73DCC0416699CEADEF4E02CDF",
    CENSUS.name: "08CD091C18BFEE1C87C42E7B4872D23C6CFF2B84BE4414F5C50FA47C54CF95BE",
    DOMINANCE.name: "7B25D57EBEE367C236AA48CB9565877898BA093C27DE68ACB46CA46710D349D6",
    PRODUCER_SOURCE.name: "56C41BEC4B5A42FEF6C5CFE55B1F10FFA3898F5C629A06307FD5B592A651B1B1",
    PRODUCER_REPORT.name: "E7D736F9305C11BBFC957A85E77FCF84218ED59E70F30512B39EABDC17B328F7",
}
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_ADJACENT_K00_SCOPE_ROOT"
FAIL_MARKER = "FAIL_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_ADJACENT_K00_SCOPE_ROOT"
PRODUCER_MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_ADJACENT_K00_SCOPE_ROOT"
MAX_ORDER = 8
# OEIS A005195: number of forests on n unlabeled vertices.
FOREST_COUNTS = {1: 1, 2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37, 8: 76, 9: 153}
GEOMETRIES = ("adjacent", "nonadjacent")
MASKS = ("k00", "k01", "k10", "k11")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def unlabeled_forests(order: int) -> list[nx.Graph]:
    """All forests of the given order up to isomorphism.

    Every forest admits a vertex order in which each vertex has at most one
    earlier neighbour (breadth-first order inside each component), so the
    labelled graphs in which vertex i is joined to nothing or to one vertex
    among 0..i-1 exhaust all isomorphism types.
    """
    buckets: dict[str, list[nx.Graph]] = {}
    answer = []
    for choices in itertools.product(*[range(-1, index) for index in range(order)]):
        graph = nx.Graph()
        graph.add_nodes_from(range(order))
        graph.add_edges_from((index, earlier) for index, earlier in enumerate(choices) if earlier >= 0)
        if not nx.is_forest(graph):
            raise RuntimeError("construction produced a cycle")
        key = nx.weisfeiler_lehman_graph_hash(graph, iterations=order)
        bucket = buckets.setdefault(key, [])
        if any(nx.is_isomorphic(graph, other) for other in bucket):
            continue
        bucket.append(graph)
        answer.append(graph)
    return answer


def acyclic_after_attaching_parent(graph: nx.Graph, deleted: tuple[int, ...]) -> bool:
    parent = ("p",)
    extended = graph.copy()
    extended.add_node(parent)
    extended.add_edges_from((parent, vertex) for vertex in deleted)
    return nx.is_forest(extended)


def component_labels(graph: nx.Graph) -> dict:
    labels = {}
    for index, component in enumerate(sorted(nx.connected_components(graph), key=min)):
        for vertex in component:
            labels[vertex] = index
    return labels


def expression_class_hash(text: str) -> str:
    """Recompute the frozen class digest: sha256 of srepr of the expanded lower."""
    plain = sp.sympify(text)
    names = {str(symbol): sp.Symbol(str(symbol), integer=True, nonnegative=True) for symbol in plain.free_symbols}
    expression = sp.expand(sp.sympify(text, locals=names))
    return hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()


def main() -> None:
    hashes = {}
    for path in (LOWERS, CENSUS, DOMINANCE, PRODUCER_SOURCE, PRODUCER_REPORT):
        digest = sha256(path)
        if digest != EXPECTED_SHA256[path.name]:
            raise RuntimeError(f"hash drift: {path.name} {digest}")
        hashes[path.name] = digest
    lowers = json.loads(LOWERS.read_text(encoding="utf-8"))
    census = json.loads(CENSUS.read_text(encoding="utf-8"))
    dominance = json.loads(DOMINANCE.read_text(encoding="utf-8"))
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    if producer["marker"] != PRODUCER_MARKER:
        raise RuntimeError(("producer marker", producer["marker"]))
    if producer["source_sha256"] != hashes[PRODUCER_SOURCE.name]:
        raise RuntimeError("producer report does not pin the producer source on disk")
    if producer["input_sha256"][LOWERS.name] != hashes[LOWERS.name] \
            or producer["input_sha256"][CENSUS.name] != hashes[CENSUS.name] \
            or producer["input_sha256"][DOMINANCE.name] != hashes[DOMINANCE.name]:
        raise RuntimeError("producer input hashes disagree with the files on disk")

    # ------------------------------------------------------------------
    # Side one: forests H, marks, realizable deletion sets by acyclicity.
    # ------------------------------------------------------------------
    forests_by_order = {}
    deletion_sets_by_order = {}
    counts_geometry_mask = Counter()
    counts_component_mask = Counter()
    order8_counts = Counter()
    ordered_pairs = 0
    instances = 0
    adjacent_k00 = []
    same_component_k00 = []
    characterization_failures = []
    stream = hashlib.sha256()
    for order in range(1, MAX_ORDER + 1):
        forests = unlabeled_forests(order)
        forests_by_order[order] = len(forests)
        if len(forests) != FOREST_COUNTS[order]:
            raise RuntimeError(("forest count", order, len(forests)))
        deletion_sets_by_order[order] = 0
        for forest_index, graph in enumerate(forests):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            labels = component_labels(graph)
            nodes = tuple(sorted(graph))
            realizable = []
            for size in range(len(nodes) + 1):
                for subset in itertools.combinations(nodes, size):
                    acyclic = acyclic_after_attaching_parent(graph, subset)
                    one_per_component = len({labels[vertex] for vertex in subset}) == len(subset)
                    if acyclic != one_per_component:
                        characterization_failures.append((order, graph6, list(subset)))
                    if acyclic:
                        realizable.append(subset)
            deletion_sets_by_order[order] += len(realizable)
            for u, v in itertools.permutations(nodes, 2):
                ordered_pairs += 1
                adjacent = graph.has_edge(u, v)
                geometry = "adjacent" if adjacent else "nonadjacent"
                same = labels[u] == labels[v]
                component = "same_component" if same else "different_components"
                for deleted in realizable:
                    kappa_u = 0 if u in deleted else 1
                    kappa_v = 0 if v in deleted else 1
                    mask = f"k{kappa_u}{kappa_v}"
                    instances += 1
                    counts_geometry_mask[(geometry, mask)] += 1
                    counts_component_mask[(geometry, component, mask)] += 1
                    if order == 8:
                        order8_counts[(geometry, mask)] += 1
                    if adjacent and mask == "k00":
                        adjacent_k00.append((order, graph6, u, v, list(deleted)))
                    if same and mask == "k00":
                        same_component_k00.append((order, graph6, u, v, list(deleted)))
                    stream.update(
                        f"{order}|{forest_index}|{graph6}|{u}|{v}|{','.join(map(str, deleted))}|{geometry}|{mask};".encode()
                    )

    # ------------------------------------------------------------------
    # Side two: completed forests A of order <= 9, any vertex p, marks in A-p.
    # ------------------------------------------------------------------
    completed_configurations = 0
    completed_adjacent_both_neighbours = []
    completed_same_component_both_neighbours = []
    completed_forest_count = 0
    for order in range(2, MAX_ORDER + 2):
        forests = unlabeled_forests(order)
        if len(forests) != FOREST_COUNTS[order]:
            raise RuntimeError(("completed forest count", order, len(forests)))
        completed_forest_count += len(forests)
        for graph in forests:
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for p in graph:
                neighbours = set(graph.neighbors(p))
                h = graph.copy()
                h.remove_node(p)
                labels = component_labels(h)
                for u, v in itertools.permutations(sorted(h), 2):
                    completed_configurations += 1
                    both = u in neighbours and v in neighbours
                    if both and graph.has_edge(u, v):
                        completed_adjacent_both_neighbours.append((order, graph6, p, u, v))
                    if both and labels[u] == labels[v]:
                        completed_same_component_both_neighbours.append((order, graph6, p, u, v))

    # ------------------------------------------------------------------
    # Partition: 32 keys -> 24 cores -> 20 in scope, with recomputed hashes.
    # ------------------------------------------------------------------
    branches = lowers["branches"]
    classes = lowers["classes"]
    recomputed = {digest: expression_class_hash(row["lower_expression"]) for digest, row in classes.items()}
    hash_recomputation_ok = all(digest == value for digest, value in recomputed.items()) and len(recomputed) == 56
    key_to_core = {}
    for geometry in GEOMETRIES:
        for epsilon, eta in itertools.product((0, 1), repeat=2):
            for mask in MASKS:
                key = f"{geometry}_e{epsilon}_t{eta}_{mask}"
                label = f"{key}_j00"
                branch = branches[label]
                if branch["K_mark_mask"] != [int(mask[1]), int(mask[2])] or branch["geometry"] != geometry \
                        or branch["epsilon"] != epsilon or branch["eta"] != eta or branch["J_mark_mask"] != [0, 0]:
                    raise RuntimeError(("branch metadata", label))
                key_to_core[key] = branch["class_sha256"]
    core_to_keys: dict[str, list[str]] = {}
    for key, core in key_to_core.items():
        core_to_keys.setdefault(core, []).append(key)
    cores = sorted(core_to_keys)
    dominance_cores = sorted(
        row["core_class_sha256"] for row in dominance["families"].values()
    )
    dominance_key_match = all(
        dominance["families"][key]["core_class_sha256"] == core for key, core in key_to_core.items()
    )
    removed = sorted(key_to_core[f"adjacent_e{e}_t{t}_k00"] for e, t in itertools.product((0, 1), repeat=2))
    remaining = sorted(core for core in cores if core not in set(removed))
    unrealizable_keys = {key for key in key_to_core if key.startswith("adjacent") and key.endswith("k00")}
    realizable_remaining = all(
        set(core_to_keys[core]).isdisjoint(unrealizable_keys) for core in remaining
    )
    removed_isolated = all(set(core_to_keys[core]) <= unrealizable_keys for core in removed)

    expected_order8_from_census = {}
    for geometry in GEOMETRIES:
        # The census counted unordered pairs once per applicable class; the
        # k01/k10 classes coincide, so their census count is the ordered k01
        # count (and the ordered k10 count); k00 and k11 double.
        j00_by_mask = {mask: key_to_core[f"{geometry}_e0_t0_{mask}"] for mask in MASKS}
        for mask in MASKS:
            census_count = sum(census["counts"][j00_by_mask[mask]].values())
            expected_order8_from_census[(geometry, mask)] = census_count if mask in ("k01", "k10") else 2 * census_count

    checks = {
        "forest_counts_match_oeis_a005195": forests_by_order == {order: FOREST_COUNTS[order] for order in range(1, MAX_ORDER + 1)},
        "realizability_is_one_vertex_per_component": not characterization_failures,
        "no_adjacent_k00_instance": not adjacent_k00,
        "no_same_component_k00_instance": not same_component_k00,
        "nonadjacent_k00_realized_by_different_components": counts_component_mask[("nonadjacent", "different_components", "k00")] > 0,
        "completed_forests_no_adjacent_double_neighbour": not completed_adjacent_both_neighbours,
        "completed_forests_no_same_component_double_neighbour": not completed_same_component_both_neighbours,
        "order8_counts_match_census": all(
            order8_counts[key] == value for key, value in expected_order8_from_census.items()
        ),
        "order8_deletion_sets_match_census": deletion_sets_by_order[8] == census["attachable_relation_instances"],
        "producer_forests_by_order_match": producer["forests_by_order"] == {str(k): v for k, v in forests_by_order.items()},
        "producer_deletion_sets_by_order_match": producer["deletion_sets_by_order"] == {str(k): v for k, v in deletion_sets_by_order.items()},
        "producer_instances_match": producer["instances"] == instances and producer["ordered_marked_pairs"] == ordered_pairs,
        "producer_geometry_mask_counts_match": producer["instance_counts_by_geometry_mask"] == {
            f"{geometry}_{mask}": counts_geometry_mask[(geometry, mask)] for geometry in GEOMETRIES for mask in MASKS
        },
        "producer_component_mask_counts_match": producer["instance_counts_by_geometry_component_mask"] == {
            f"{geometry}_{component}_{mask}": counts_component_mask[(geometry, component, mask)]
            for geometry in GEOMETRIES for component in ("same_component", "different_components") for mask in MASKS
        },
        "56_class_hashes_recomputed_from_expressions": hash_recomputation_ok,
        "32_keys_map_to_24_cores": len(key_to_core) == 32 and len(cores) == 24,
        "cores_match_dominance_report": cores == dominance["remaining_unique_class_sha256"] == sorted(set(dominance_cores)) and dominance_key_match,
        "four_distinct_removed_cores": len(set(removed)) == 4,
        "removed_cores_keyed_only_adjacent_k00": removed_isolated,
        "remaining_cores_never_keyed_adjacent_k00": realizable_remaining,
        "twenty_remaining_cores": len(remaining) == 20,
        "producer_removed_hashes_match": producer["removed_out_of_scope_core_sha256"] == removed,
        "producer_remaining_hashes_match": producer["remaining_in_scope_core_sha256"] == remaining,
        "producer_key_to_core_match": producer["key_to_core_class_sha256"] == key_to_core,
        "producer_checks_all_true": all(producer["checks"].values()),
    }
    passed = all(checks.values())
    report = {
        "marker": MARKER if passed else FAIL_MARKER,
        "source_sha256": sha256(Path(__file__).resolve()),
        "input_sha256": hashes,
        "implementation": (
            "Own forest enumeration (attach each vertex to at most one earlier vertex, "
            "Weisfeiler-Lehman bucketing plus explicit isomorphism tests), realizability "
            "by direct acyclicity of H plus a new parent, completed-forest replay through "
            "order nine, class hashes recomputed from the recorded lower expressions; "
            "no import from the producer, the census, or the shared forest catalogue."
        ),
        "lemma_verdict": (
            "TRUE in the code's actual domain: kappa=0 means the mark is a neighbour of "
            "the parent; adjacent marks (and, more strongly, marks in one component of H) "
            "are never both neighbours of the parent."
        ),
        "forests_by_order": {str(order): count for order, count in forests_by_order.items()},
        "deletion_sets_by_order": {str(order): count for order, count in deletion_sets_by_order.items()},
        "ordered_marked_pairs": ordered_pairs,
        "instances": instances,
        "instance_counts_by_geometry_mask": {
            f"{geometry}_{mask}": counts_geometry_mask[(geometry, mask)] for geometry in GEOMETRIES for mask in MASKS
        },
        "instance_counts_by_geometry_component_mask": {
            f"{geometry}_{component}_{mask}": counts_component_mask[(geometry, component, mask)]
            for geometry in GEOMETRIES for component in ("same_component", "different_components") for mask in MASKS
        },
        "order8_ordered_counts": {f"{g}_{m}": order8_counts[(g, m)] for g in GEOMETRIES for m in MASKS},
        "order8_expected_from_census": {f"{g}_{m}": expected_order8_from_census[(g, m)] for g in GEOMETRIES for m in MASKS},
        "completed_forests_orders_2_to_9": completed_forest_count,
        "completed_configurations": completed_configurations,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "stream_note": (
            "Own enumeration order and labelling; this stream is not expected to equal "
            "the producer's stream, the isomorphism-invariant counts are compared instead."
        ),
        "key_to_core_class_sha256": key_to_core,
        "removed_out_of_scope_core_sha256": removed,
        "remaining_in_scope_core_sha256": remaining,
        "remaining_in_scope_core_count": len(remaining),
        "checks": checks,
        "scope_guard": (
            "Independent replay of the scope lemma and the 24 -> 20 core partition only; "
            "the 20 remaining all-order H--K core signs are not proved here."
        ),
    }
    if not passed:
        raise RuntimeError((FAIL_MARKER, {name: value for name, value in checks.items() if not value}))
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": report["marker"],
        "instances": instances,
        "completed_configurations": completed_configurations,
        "remaining_in_scope_core_count": len(remaining),
        "checks_true": sum(checks.values()),
        "checks_total": len(checks),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
