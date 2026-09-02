#!/usr/bin/env python3
"""Freeze the adjacent-k00 impossibility for the ordinary-parent H--K family.

Setting (ordinary-parent leaf mode of rank-six G1).  A leaf z has an unmarked
parent p (p is neither mark), A=F-z, H=A-p and K=A-N_A[p]=H-N_H(p).  The
marks u,v are distinct vertices of H.  The frozen H--K lower classes carry a
K mark mask (kappa_u,kappa_v) with KU1=k-kappa_u, so kappa_u=1 means u is
retained in K and kappa_u=0 means u is deleted from H when forming K, that
is, u is a neighbour of p.  The mask k00 therefore means "both marks are
neighbours of the parent".

Lemma (adjacent-k00 impossibility).  If uv is an edge of H, no ordinary parent
has both u and v as neighbours: p-u-v-p would be a triangle in the forest.
Hence every (adjacent, k00) instance is unrealizable, and the four j00 cores
keyed (adjacent, epsilon, eta, k00) are outside the ordinary-parent domain.

The stronger structural fact is that N_H(p) meets every component of H in at
most one vertex (a second vertex of the same component would close a cycle
through p), so u and v can never both be deleted when they lie in the same
component of H, adjacent or not.  The frozen classes only distinguish
adjacent from nonadjacent marks, and the nonadjacent k00 mask is realized
whenever u and v lie in different components of H, so only the adjacent k00
classes leave the scope at class level.

This producer states the lemma, replays it exhaustively on every
nonisomorphic forest H of order at most eight with every ordered marked pair
and every realizable parent-deletion set, and removes the four adjacent-k00
core hashes from the 24 frozen j00 cores, leaving 20.  It proves no sign.
"""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from audit_rank8_forest_root_deletion_attachment_floor_root import (
    nonisomorphic_forests,
    tree_catalog,
)
from census_iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_root import (
    attachable_deletion_sets,
)


HERE = Path(__file__).resolve().parent
LOWERS = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_lower_exact_root_20260901.json"
CENSUS = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_census_root_20260901.json"
DOMINANCE = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_exact_root_20260901.json"
DOMINANCE_AUDIT = HERE / (
    "iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_independent_audit_root_20260901.json"
)
OUTPUT = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_adjacent_k00_scope_exact_root_20260902.json"
EXPECTED_INPUT_SHA256 = {
    LOWERS.name: "22F1F54F597B2CBA68CD24BC547D1C36075B2BE73DCC0416699CEADEF4E02CDF",
    CENSUS.name: "08CD091C18BFEE1C87C42E7B4872D23C6CFF2B84BE4414F5C50FA47C54CF95BE",
    DOMINANCE.name: "7B25D57EBEE367C236AA48CB9565877898BA093C27DE68ACB46CA46710D349D6",
    DOMINANCE_AUDIT.name: "338225DD6409F8107C3967267F9ABF6C734BD494E7F62A8BFC9A7DFA0978222C",
}
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_ADJACENT_K00_SCOPE_ROOT"
FAIL_MARKER = "FAIL_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_ADJACENT_K00_SCOPE_ROOT"
MAX_ORDER = 8
GEOMETRIES = ("adjacent", "nonadjacent")
MASKS = ("k00", "k01", "k10", "k11")

LEMMA = (
    "Let F be a forest, z a leaf of F whose parent p is neither mark, A=F-z, "
    "H=A-p, and K=H-N_H(p).  Let u,v be distinct vertices of H.  If uv is an "
    "edge of H, then u and v are not both neighbours of p; equivalently, the "
    "K mark mask (kappa_u,kappa_v)=(0,0) never occurs in the adjacent geometry."
)
PROOF = (
    "Suppose uv is an edge of H and both u and v lie in N_H(p).  Then p-u, u-v, "
    "v-p are three edges of A on three distinct vertices (p is not a mark), so "
    "A contains a triangle, contradicting that A is a subforest of F.  More "
    "generally, if u and v lie in the same component of H and both are "
    "adjacent to p, the u--v path inside H together with the two edges at p "
    "closes a cycle; hence N_H(p) contains at most one vertex of each "
    "component of H, and the deletion set D=N_H(p) is exactly a set with at "
    "most one vertex per component.  Conversely every such set is realized by "
    "attaching a new vertex p to it (the result is acyclic) and hanging the "
    "leaf z on p, so the realizable K-masks are exactly those produced by such "
    "sets.  Since adjacent marks share a component, kappa_u=kappa_v=0 is "
    "impossible for adjacent marks."
)
CLASS_LEVEL_SCOPE = (
    "The frozen H--K lower classes distinguish only adjacent from nonadjacent "
    "marks.  The same-component obstruction also forbids k00 for nonadjacent "
    "marks in a common component, but the nonadjacent k00 mask is realized "
    "whenever u and v lie in different components of H, so the four "
    "nonadjacent k00 cores remain in scope; only the four adjacent k00 cores "
    "are removed at class level."
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical_deletion_sets(graph: nx.Graph) -> set[tuple[int, ...]]:
    """Every vertex subset D with |D intersect component| <= 1 for each component."""
    component_of = {}
    for index, component in enumerate(nx.connected_components(graph)):
        for vertex in component:
            component_of[vertex] = index
    nodes = tuple(sorted(graph))
    answer = set()
    for size in range(len(nodes) + 1):
        for subset in itertools.combinations(nodes, size):
            if len({component_of[vertex] for vertex in subset}) == len(subset):
                answer.add(subset)
    return answer


def parent_extension_is_forest(graph: nx.Graph, deleted: tuple[int, ...]) -> bool:
    extended = graph.copy()
    parent = max(graph, default=-1) + 1
    extended.add_node(parent)
    extended.add_edges_from((parent, vertex) for vertex in deleted)
    return nx.is_forest(extended)


def main() -> None:
    input_hashes = {}
    for path in (LOWERS, CENSUS, DOMINANCE, DOMINANCE_AUDIT):
        digest = sha256(path)
        if digest != EXPECTED_INPUT_SHA256[path.name]:
            raise RuntimeError(f"input hash drift: {path.name} {digest}")
        input_hashes[path.name] = digest
    lowers = json.loads(LOWERS.read_text(encoding="utf-8"))
    census = json.loads(CENSUS.read_text(encoding="utf-8"))
    dominance = json.loads(DOMINANCE.read_text(encoding="utf-8"))
    dominance_audit = json.loads(DOMINANCE_AUDIT.read_text(encoding="utf-8"))
    for name, payload, expected in (
        (CENSUS.name, census, "PASS_EXACT_N8_CENSUS_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_LOWER_ROOT"),
        (DOMINANCE.name, dominance, "PASS_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_JMASK_DOMINANCE_ROOT"),
        (
            DOMINANCE_AUDIT.name, dominance_audit,
            "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_JMASK_DOMINANCE_ROOT",
        ),
    ):
        if payload["marker"] != expected:
            raise RuntimeError(("input marker mismatch", name, payload["marker"]))
    if dominance["input_sha256"] != input_hashes[LOWERS.name]:
        raise RuntimeError("dominance report was built from a different lower report")
    if census["input_sha256"] != input_hashes[LOWERS.name]:
        raise RuntimeError("census report was built from a different lower report")

    # ------------------------------------------------------------------
    # Mask convention, read off the frozen lower report itself.
    # ------------------------------------------------------------------
    branches = lowers["branches"]
    for label, branch in branches.items():
        geometry, epsilon, eta, kmask, jmask = label.split("_")
        expected = {
            "geometry": geometry,
            "epsilon": int(epsilon[1:]),
            "eta": int(eta[1:]),
            "K_mark_mask": [int(kmask[1]), int(kmask[2])],
            "J_mark_mask": [int(jmask[1]), int(jmask[2])],
        }
        actual = {key: branch[key] for key in expected}
        if actual != expected:
            raise RuntimeError(("label/mask mismatch", label, actual))
    mask_convention = {
        "K_mark_mask": "[kappa_u, kappa_v]",
        "lower_source_rule": "KU1 = k - kappa_u, KV1 = k - kappa_v, KW1 = k - kappa_u - kappa_v",
        "census_rule": "kappa_u = int(u not in deleted_set), kappa_v = int(v not in deleted_set)",
        "meaning": (
            "kappa=1: mark retained in K (not a neighbour of p); "
            "kappa=0: mark deleted from H when forming K (mark is a neighbour of p).  "
            "k00 = both marks are neighbours of the parent."
        ),
        "geometry": "adjacent iff uv is an edge of H (HZ*, KZ* rows are zero); nonadjacent otherwise",
        "epsilon_eta": (
            "epsilon in {0,1} switches the parent response Q(H,L); eta in {0,1} switches "
            "the leaf response Phi_J((1+x)H+xK); both are recorded as e{epsilon}_t{eta}."
        ),
        "parent_not_a_mark": (
            "The ordinary-parent family requires p not in {u,v}; the marked-parent "
            "case p in {u,v} is the separate third family."
        ),
    }

    # ------------------------------------------------------------------
    # Exhaustive structural replay on every forest H of order <= 8.
    # ------------------------------------------------------------------
    catalog = tree_catalog(MAX_ORDER)
    counts_geometry_mask = Counter()
    counts_component_mask = Counter()
    forests_by_order = Counter()
    deletion_sets_by_order = Counter()
    ordered_pairs = 0
    instances = 0
    lemma_violations = []
    same_component_violations = []
    realizability_mismatches = []
    stream = hashlib.sha256()
    for order in range(1, MAX_ORDER + 1):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            forests_by_order[order] += 1
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            attachable = sorted(set(attachable_deletion_sets(graph)))
            if len(attachable) != len(list(attachable_deletion_sets(graph))):
                raise RuntimeError(("duplicate deletion sets", order, graph6))
            canonical = canonical_deletion_sets(graph)
            if set(attachable) != canonical:
                realizability_mismatches.append((order, graph6, "census relation != one-per-component"))
            nodes = tuple(sorted(graph))
            for size in range(len(nodes) + 1):
                for subset in itertools.combinations(nodes, size):
                    if parent_extension_is_forest(graph, subset) != (subset in canonical):
                        realizability_mismatches.append((order, graph6, list(subset)))
            deletion_sets_by_order[order] += len(attachable)
            component_of = {}
            for index, component in enumerate(nx.connected_components(graph)):
                for vertex in component:
                    component_of[vertex] = index
            for u, v in itertools.permutations(nodes, 2):
                ordered_pairs += 1
                geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
                same_component = component_of[u] == component_of[v]
                if geometry == "adjacent" and not same_component:
                    raise RuntimeError(("adjacent marks in different components", order, graph6, u, v))
                for deleted in attachable:
                    deleted_set = set(deleted)
                    kappa_u = int(u not in deleted_set)
                    kappa_v = int(v not in deleted_set)
                    mask = f"k{kappa_u}{kappa_v}"
                    instances += 1
                    counts_geometry_mask[(geometry, mask)] += 1
                    counts_component_mask[(geometry, "same_component" if same_component else "different_components", mask)] += 1
                    if geometry == "adjacent" and mask == "k00":
                        lemma_violations.append((order, graph6, u, v, list(deleted)))
                    if same_component and mask == "k00":
                        same_component_violations.append((order, graph6, u, v, list(deleted)))
                    stream.update(
                        f"{order}|{forest_index}|{graph6}|{u}|{v}|{','.join(map(str, deleted))}|{geometry}|{mask};".encode()
                    )

    realized_masks = {
        geometry: sorted(mask for mask in MASKS if counts_geometry_mask[(geometry, mask)] > 0)
        for geometry in GEOMETRIES
    }
    structural_checks = {
        "no_realizability_mismatch": not realizability_mismatches,
        "no_adjacent_k00_instance": not lemma_violations,
        "no_same_component_k00_instance": not same_component_violations,
        "adjacent_realizes_exactly_k01_k10_k11": realized_masks["adjacent"] == ["k01", "k10", "k11"],
        "nonadjacent_realizes_all_four_masks": realized_masks["nonadjacent"] == list(MASKS),
        "nonadjacent_k00_only_from_different_components": (
            counts_component_mask[("nonadjacent", "different_components", "k00")] > 0
            and counts_component_mask[("nonadjacent", "same_component", "k00")] == 0
        ),
        "order_8_forest_count_matches_census": forests_by_order[MAX_ORDER] == census["forest_count"],
        "order_8_deletion_sets_match_census": (
            deletion_sets_by_order[MAX_ORDER] == census["attachable_relation_instances"]
        ),
    }

    # ------------------------------------------------------------------
    # Class bookkeeping: 32 keys -> 24 cores -> 20 in-scope cores.
    # ------------------------------------------------------------------
    families = dominance["families"]
    key_to_core = {}
    for geometry in GEOMETRIES:
        for epsilon, eta in itertools.product((0, 1), repeat=2):
            for mask in MASKS:
                prefix = f"{geometry}_e{epsilon}_t{eta}_{mask}"
                core = families[prefix]["core_class_sha256"]
                if branches[f"{prefix}_j00"]["class_sha256"] != core:
                    raise RuntimeError(("core hash disagrees with lower report", prefix))
                key_to_core[prefix] = core
    if len(key_to_core) != 32:
        raise RuntimeError(("family key count", len(key_to_core)))
    core_to_keys = {}
    for prefix, core in key_to_core.items():
        core_to_keys.setdefault(core, []).append(prefix)
    all_cores = sorted(core_to_keys)
    if all_cores != dominance["remaining_unique_class_sha256"] or len(all_cores) != 24:
        raise RuntimeError("24 frozen j00 cores do not match the dominance report")
    merge_structure = sorted(
        tuple(sorted(keys)) for keys in core_to_keys.values() if len(keys) > 1
    )
    merges_are_only_k01_k10 = all(
        len(keys) == 2 and keys[0].rsplit("_", 1)[0] == keys[1].rsplit("_", 1)[0]
        and {keys[0].rsplit("_", 1)[1], keys[1].rsplit("_", 1)[1]} == {"k01", "k10"}
        for keys in merge_structure
    )

    removed = {}
    for epsilon, eta in itertools.product((0, 1), repeat=2):
        prefix = f"adjacent_e{epsilon}_t{eta}_k00"
        core = key_to_core[prefix]
        if core_to_keys[core] != [prefix]:
            raise RuntimeError(("adjacent k00 core shared with a realizable key", prefix, core_to_keys[core]))
        removed[prefix] = core
    removed_hashes = sorted(removed.values())
    remaining_hashes = sorted(core for core in all_cores if core not in set(removed_hashes))
    remaining_keys = {
        core: sorted(core_to_keys[core]) for core in remaining_hashes
    }
    class_checks = {
        "32_keys": len(key_to_core) == 32,
        "24_frozen_cores": len(all_cores) == 24,
        "merges_only_k01_k10_symmetry": merges_are_only_k01_k10 and len(merge_structure) == 8,
        "4_distinct_adjacent_k00_cores": len(set(removed_hashes)) == 4,
        "removed_cores_have_no_other_key": all(core_to_keys[core] == [prefix] for prefix, core in removed.items()),
        "20_remaining_cores": len(remaining_hashes) == 20,
        "remaining_plus_removed_is_24": sorted(remaining_hashes + removed_hashes) == all_cores,
        "every_remaining_core_key_is_realizable": all(
            key.split("_")[3] in realized_masks[key.split("_")[0]]
            for keys in remaining_keys.values() for key in keys
        ),
    }

    # 56-class corroboration against the frozen order-eight census.
    adjacent_k00_classes = sorted(
        digest for digest, row in lowers["classes"].items()
        if all(member.split("_")[0] == "adjacent" and member.split("_")[3] == "k00" for member in row["members"])
    )
    mixed_classes = [
        digest for digest, row in lowers["classes"].items()
        if digest not in set(adjacent_k00_classes)
        and any(member.split("_")[0] == "adjacent" and member.split("_")[3] == "k00" for member in row["members"])
    ]
    census_checks = {
        "8_adjacent_k00_lower_classes": len(adjacent_k00_classes) == 8,
        "no_class_mixes_adjacent_k00_with_realizable_keys": not mixed_classes,
        "census_evaluated_zero_cells_on_adjacent_k00_classes": all(
            census["counts"][digest] == {} and census["minima"][digest] is None
            for digest in adjacent_k00_classes
        ),
        "census_evaluated_every_other_class": all(
            sum(census["counts"][digest].values()) > 0
            for digest in lowers["classes"] if digest not in set(adjacent_k00_classes)
        ),
        "removed_cores_are_adjacent_k00_lower_classes": set(removed_hashes) <= set(adjacent_k00_classes),
    }

    checks = {**structural_checks, **class_checks, **census_checks}
    passed = all(checks.values())
    report = {
        "marker": MARKER if passed else FAIL_MARKER,
        "source_sha256": sha256(Path(__file__).resolve()),
        "input_sha256": input_hashes,
        "family": "ordinary parent: g2_6(H,J)+F(H,K)+epsilon Q(H,L)+eta Phi_J((1+x)H+xK), K=H-N_H(p), p not a mark",
        "lemma": LEMMA,
        "proof": PROOF,
        "class_level_scope": CLASS_LEVEL_SCOPE,
        "mask_convention": mask_convention,
        "coverage": (
            f"Every nonisomorphic forest H of orders 1..{MAX_ORDER}, every ordered pair of "
            "distinct marks (u,v) in H, every realizable parent-deletion set D=N_H(p) "
            "(at most one vertex per component of H, including D empty)."
        ),
        "forests_by_order": {str(order): forests_by_order[order] for order in sorted(forests_by_order)},
        "deletion_sets_by_order": {str(order): deletion_sets_by_order[order] for order in sorted(deletion_sets_by_order)},
        "ordered_marked_pairs": ordered_pairs,
        "instances": instances,
        "instance_counts_by_geometry_mask": {
            f"{geometry}_{mask}": counts_geometry_mask[(geometry, mask)]
            for geometry in GEOMETRIES for mask in MASKS
        },
        "instance_counts_by_geometry_component_mask": {
            f"{geometry}_{component}_{mask}": counts_component_mask[(geometry, component, mask)]
            for geometry in GEOMETRIES
            for component in ("same_component", "different_components")
            for mask in MASKS
        },
        "realized_masks": realized_masks,
        "lemma_violations": lemma_violations,
        "same_component_k00_instances": same_component_violations,
        "realizability_mismatches": realizability_mismatches,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "key_to_core_class_sha256": key_to_core,
        "core_merge_structure": [list(keys) for keys in merge_structure],
        "removed_out_of_scope_cores": removed,
        "removed_out_of_scope_core_sha256": removed_hashes,
        "remaining_in_scope_core_sha256": remaining_hashes,
        "remaining_in_scope_core_keys": remaining_keys,
        "remaining_in_scope_core_count": len(remaining_hashes),
        "adjacent_k00_lower_class_sha256": adjacent_k00_classes,
        "checks": checks,
        "status": (
            "Scope lemma proved for all orders by the triangle/cycle argument and "
            "replayed exhaustively through order eight; 24 j00 cores reduce to 20 "
            "in-scope cores."
        ),
        "scope_guard": (
            "This removes unrealizable classes from the obligation list.  It proves "
            "no all-order sign: the 20 remaining H--K cores are still open, and the "
            "four nonadjacent k00 cores stay in scope because different-component "
            "marks realize them."
        ),
    }
    if not passed:
        failed = {name: value for name, value in checks.items() if not value}
        raise RuntimeError((FAIL_MARKER, failed))
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": report["marker"],
        "instances": instances,
        "ordered_marked_pairs": ordered_pairs,
        "instance_counts_by_geometry_mask": report["instance_counts_by_geometry_mask"],
        "removed_out_of_scope_core_sha256": removed_hashes,
        "remaining_in_scope_core_count": len(remaining_hashes),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
