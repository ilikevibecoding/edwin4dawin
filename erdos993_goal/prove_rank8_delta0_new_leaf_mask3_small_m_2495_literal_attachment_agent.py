#!/usr/bin/env python3
"""Literal structural replay of the 2,495 residual mask-3 small-m jets.

For a tree A rooted at v, every component of F=A-N[v] attaches by exactly one
edge to exactly one of the r roots in D=A-v.  Root labels are irrelevant to the
independence polynomial, so all configurations are exhausted by deletion jets
at the attachment vertices and set partitions of the F components.
"""

from __future__ import annotations

import functools
import hashlib
import itertools
import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

import networkx as nx

import prove_rank8_forest16_f5_f6_ratio_agent as forest
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_exact_agent_20260823.json"
PRIOR = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_exact_agent_20260823.json"
CATALOG = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_agent.py":
        "F81DE63D8717991E1BCE03FC936D6B01E07A242F79F78C317BA0137FD672E94F",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_exact_agent_20260823.json":
        "66410DE4223D5EAE6C2F456B26E016791B07F05827EFC1312C2DF8A06B946DAE",
    "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json":
        "5416988DAB946AF2A9F0A24B41096AC4D0B6D8D508780D3098AA673E7BAF61A1",
    "prove_rank8_forest16_f5_f6_ratio_agent.py":
        "D2D9E23E930904B3C55EF5BB2B75D5CBB5D389A39B0A0F1AE7CA1B3A61BFDB21",
    "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py":
        "817AD03F7B5DB8DDC1FF6D829F785A9255B89C8C36A0FB96A718549321FEDD8A",
}
EXPECTED_TREE_COUNTS = [0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741]
MODULUS = 1 << 256


@dataclass(frozen=True)
class TreeRecord:
    order: int
    index: int
    jet: tuple[int, ...]
    deletion_jets: tuple[tuple[int, ...], ...]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[index] + right[index] for index in range(7))


def shift(jet: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + jet[:6]


def deletion_jet_set(tree: nx.Graph) -> tuple[tuple[int, ...], ...]:
    """Every I(T-u) jet, via directed-edge rooted-tree messages."""
    one = (1, 0, 0, 0, 0, 0, 0)
    variable = (0, 1, 0, 0, 0, 0, 0)

    @functools.lru_cache(maxsize=None)
    def state(vertex: int, parent: int):
        excluded = one
        included = variable
        for neighbor in tree[vertex]:
            if neighbor == parent:
                continue
            child_excluded, child_included = state(neighbor, vertex)
            excluded = forest.multiply(excluded, add(child_excluded, child_included))
            included = forest.multiply(included, child_excluded)
        return excluded, included

    answer = set()
    for vertex in tree:
        deleted = one
        for neighbor in tree[vertex]:
            excluded, included = state(neighbor, vertex)
            deleted = forest.multiply(deleted, add(excluded, included))
        answer.add(deleted)
    return tuple(sorted(answer))


def build_tree_records():
    records = {}
    counts = [0]
    peak = forest.gate()
    for order in range(1, 16):
        trees = [nx.empty_graph(1)] if order == 1 else list(nx.nonisomorphic_trees(order))
        counts.append(len(trees))
        current = []
        for index, tree in enumerate(trees):
            current.append(
                TreeRecord(order, index, forest.tree_jet(tree), deletion_jet_set(tree))
            )
        records[order] = tuple(current)
        peak = max(peak, forest.gate())
    assert counts == EXPECTED_TREE_COUNTS
    return records, peak


@functools.lru_cache(maxsize=None)
def order_partitions(total: int, parts: int, minimum: int = 1):
    if parts == 0:
        return ((),) if total == 0 else ()
    answer = []
    for first in range(minimum, total // parts + 1):
        for tail in order_partitions(total - first, parts - 1, first):
            answer.append((first,) + tail)
    return tuple(answer)


@functools.lru_cache(maxsize=None)
def set_partitions(size: int):
    answer = []
    blocks: list[list[int]] = []

    def recurse(index: int):
        if index == size:
            answer.append(tuple(tuple(block) for block in blocks))
            return
        for block in blocks:
            block.append(index)
            recurse(index + 1)
            block.pop()
        blocks.append([index])
        recurse(index + 1)
        blocks.pop()

    recurse(0)
    return tuple(answer)


def forest_types(records, order: int, components: int):
    for sizes in order_partitions(order, components):
        groups = []
        for size, multiplicity in sorted(Counter(sizes).items()):
            groups.append(
                itertools.combinations_with_replacement(records[size], multiplicity)
            )
        for choices in itertools.product(*groups):
            yield tuple(itertools.chain.from_iterable(choices))


def product_jets(jets) -> tuple[int, ...]:
    answer = (1, 0, 0, 0, 0, 0, 0)
    for jet in jets:
        answer = forest.multiply(answer, jet)
    return answer


def nonempty_root_quotients(components: tuple[TreeRecord, ...]):
    """Map each sufficient statistic (nonempty-root count, product jet) to a witness."""
    answer = {}
    p_jets = tuple(component.jet for component in components)
    for deletion_choices in itertools.product(
        *(component.deletion_jets for component in components)
    ):
        for partition in set_partitions(len(components)):
            product = (1, 0, 0, 0, 0, 0, 0)
            for block in partition:
                excluded = product_jets(p_jets[index] for index in block)
                included = product_jets(deletion_choices[index] for index in block)
                product = forest.multiply(product, add(excluded, shift(included)))
            key = (len(partition), product)
            answer.setdefault(key, (deletion_choices, partition))
    return answer


def gate_numerator(base_terms, d5: int, d6: int, f5: int, f6: int) -> int:
    total = 0
    for (np, xp, yp, zp), coefficient in base_terms:
        assert np == 0
        degree = xp + yp + zp
        assert degree <= 8
        total += (
            int(coefficient)
            * d5**xp
            * f5**yp
            * f6**zp
            * d6 ** (8 - degree)
        )
    return total


def update_fingerprint(state, signature) -> None:
    serial = json.dumps(signature, separators=(",", ":")).encode()
    value = int.from_bytes(hashlib.sha256(serial).digest(), "big")
    state["xor"] ^= value
    state["sum"] = (state["sum"] + value) % MODULUS
    state["sum_squares"] = (state["sum_squares"] + value * value) % MODULUS


def witness_row(
    N, m, r, components, forest_jet, records, deletion_choices,
    partition, nonempty_jet, d_jet, numerator,
):
    return {
        "N": N,
        "m": m,
        "r": r,
        "components": components,
        "forest_jet_f0_to_f6": list(forest_jet),
        "component_tree_order_and_networkx_index": [
            [record.order, record.index] for record in records
        ],
        "attachment_deletion_jets": [list(jet) for jet in deletion_choices],
        "component_to_nonempty_root_partition": [list(block) for block in partition],
        "nonempty_root_product_jet": list(nonempty_jet),
        "D_jet_d0_to_d6": list(d_jet),
        "cleared_gate_numerator_times_d6_power": str(numerator),
    }


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    prior = json.loads(PRIOR.read_text(encoding="utf-8"))
    residuals = prior["residual_envelope_jets"]
    assert len(residuals) == 2_495
    target_cells = defaultdict(set)
    for row in residuals:
        key = (row["m"], row["components"], tuple(row["jet_f0_to_f6"]))
        target_cells[key].add((row["N"], row["r"]))
    assert sum(len(cells) for cells in target_cells.values()) == 2_495

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    expected_type_counts = {
        (row["order"], row["components"]): row["unlabeled_forest_types"]
        for row in catalog["component_rows"]
    }
    records, peak = build_tree_records()
    base_terms = base_polynomial().terms()
    empty_powers = [(1, 0, 0, 0, 0, 0, 0)]
    for _ in range(15):
        empty_powers.append(
            forest.multiply(empty_powers[-1], (1, 1, 0, 0, 0, 0, 0))
        )

    needed_pairs = sorted({(m, components) for m, components, _ in target_cells})
    cells = sorted({(N, m, r) for row in residuals for N, m, r in [(row["N"], row["m"], row["r"]) ]})
    cell_stats = {
        cell: {
            "N": cell[0], "m": cell[1], "r": cell[2],
            "matching_forest_types": 0,
            "raw_attachment_partition_representatives": 0,
            "coefficient_quotient_cases": 0,
            "positive": 0, "zero": 0, "negative": 0,
            "minimum_numerator": None, "minimum_witness": None,
        }
        for cell in cells
    }
    scanned = {}
    matching_types = 0
    quotient_cases = 0
    raw_representatives = 0
    negative_witnesses = []
    fingerprint = {"xor": 0, "sum": 0, "sum_squares": 0}

    for m, component_count in needed_pairs:
        current_scanned = 0
        for components in forest_types(records, m, component_count):
            current_scanned += 1
            fjet = product_jets(record.jet for record in components)
            target = target_cells.get((m, component_count, fjet))
            if not target:
                continue
            matching_types += 1
            q_choice_count = math.prod(len(record.deletion_jets) for record in components)
            raw_per_cell = q_choice_count * len(set_partitions(component_count))
            quotients = nonempty_root_quotients(components)
            for N, r in sorted(target):
                stats = cell_stats[(N, m, r)]
                stats["matching_forest_types"] += 1
                stats["raw_attachment_partition_representatives"] += raw_per_cell
                raw_representatives += raw_per_cell
                for (nonempty_roots, nonempty_jet), representative in sorted(quotients.items()):
                    assert nonempty_roots <= component_count < r
                    djet = forest.multiply(nonempty_jet, empty_powers[r - nonempty_roots])
                    numerator = gate_numerator(
                        base_terms, djet[5], djet[6], fjet[5], fjet[6]
                    )
                    deletion_choices, partition = representative
                    current_witness = witness_row(
                        N, m, r, component_count, fjet, components,
                        deletion_choices, partition, nonempty_jet, djet, numerator,
                    )
                    if stats["minimum_numerator"] is None or numerator < stats["minimum_numerator"]:
                        stats["minimum_numerator"] = numerator
                        stats["minimum_witness"] = current_witness
                    if numerator < 0:
                        stats["negative"] += 1
                        if len(negative_witnesses) < 20:
                            negative_witnesses.append(current_witness)
                    elif numerator == 0:
                        stats["zero"] += 1
                    else:
                        stats["positive"] += 1
                    stats["coefficient_quotient_cases"] += 1
                    quotient_cases += 1
                    update_fingerprint(
                        fingerprint,
                        [N, m, r, component_count, list(fjet), nonempty_roots,
                         list(nonempty_jet), list(djet), str(numerator)],
                    )
            if matching_types % 100 == 0:
                peak = max(peak, forest.gate())
        scanned[(m, component_count)] = current_scanned
        assert current_scanned == expected_type_counts[(m, component_count)], (
            m, component_count, current_scanned, expected_type_counts[(m, component_count)]
        )
        peak = max(peak, forest.gate())

    rows = []
    for cell in cells:
        row = cell_stats[cell]
        row["minimum_numerator"] = str(row["minimum_numerator"])
        row["status"] = "SEALED" if row["negative"] == 0 else "NEGATIVE_LITERAL_WITNESS"
        rows.append(row)
    peak = max(peak, forest.gate())
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-small-m-2495-literal-attachment-v1",
        "status": (
            "PASS_EXACT_MASK3_SMALL_M_2495_LITERAL_ATTACHMENT_CLOSURE"
            if not negative_witnesses and all(row["negative"] == 0 for row in rows)
            else "FAIL_EXACT_NEGATIVE_LITERAL_ATTACHMENT_WITNESS"
        ),
        "scope": (
            "Only the 2,495 residual exact forest jets in four finite mask3 "
            "small-m cells: (N,m,r)=(26,14,12),(26,15,11),"
            "(27,15,12),(28,15,13)."
        ),
        "structural_exhaustion": (
            "Deleting v splits A into r root branches.  Every connected component "
            "of F attaches by one edge at one vertex to one root; otherwise A is "
            "disconnected or cyclic.  Every vertex-deletion jet and every set "
            "partition of components among nonempty roots is enumerated.  Root "
            "labels and configurations with the same (nonempty-root count, product "
            "jet) are an exact sufficient-statistic quotient for I(D)."
        ),
        "rows": rows,
        "negative_witnesses_first_20": negative_witnesses,
        "counts": {
            "input_residual_joint_jets": len(residuals),
            "distinct_target_jet_component_keys": len(target_cells),
            "forest_order_component_pairs": len(needed_pairs),
            "free_forest_types_scanned": sum(scanned.values()),
            "matching_free_forest_types": matching_types,
            "raw_attachment_partition_representatives_covered": raw_representatives,
            "coefficient_quotient_cases": quotient_cases,
            "positive": sum(row["positive"] for row in rows),
            "zero": sum(row["zero"] for row in rows),
            "negative": sum(row["negative"] for row in rows),
        },
        "scanned_free_forest_type_counts": {
            f"m={m},c={components}": count
            for (m, components), count in sorted(scanned.items())
        },
        "coefficient_quotient_multiset_fingerprint": {
            key: f"{value:064X}" for key, value in fingerprint.items()
        },
        "hashes": hashes,
        "resources": {
            "abort_private_bytes": forest.ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": (
            "Producer credit is restricted to these literal residual structures. "
            "An independently transcribed geng/deletion replay is required before "
            "combining with the prior Bernstein layers.  The 224-cell wing, full "
            "mask3, arbitrary-leaf induction, and Problem 993 remain separate."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SCANNED", payload["counts"]["free_forest_types_scanned"], "MATCHED", matching_types)
    print("RAW", raw_representatives, "QUOTIENT", quotient_cases)
    print("POS_ZERO_NEG", payload["counts"]["positive"], payload["counts"]["zero"], payload["counts"]["negative"])
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
