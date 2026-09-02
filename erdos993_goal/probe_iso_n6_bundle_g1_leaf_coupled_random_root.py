#!/usr/bin/env python3
"""Deterministic large-order probe of the fully coupled rank-six G1 leaf cells.

For each genuine sampled forest/minor/leaf configuration this evaluates both
states of the leaf while holding the post-deletion minor fixed.  Negative
response pieces are recorded but only a negative full increment is a witness
against the universal leaf-monotonicity route.
"""

from __future__ import annotations

from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import random
import time

import networkx as nx

from search_iso_n6_bundle_g1_random_g1_nonadjacent import evaluator, random_forest, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_leaf_coupled_random_probe_root_20260901.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G1_LEAF_COUPLED_RANDOM_ROOT"
TRIAL_CAP = 100_000
TIME_CAP_SECONDS = 600
PINS = {
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "search_iso_n6_bundle_g1_random_g1_nonadjacent.py":
        "E1AE43CA1C972E07EE2946A4BC42F00FA48B00A122B23FFFFA1F6354D65986EC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def sign(value: int) -> str:
    return "negative" if value < 0 else "positive" if value > 0 else "zero"


def main() -> None:
    for name, expected in PINS.items():
        actual = sha256(HERE / name)
        require(actual == expected, f"dependency hash mismatch for {name}: {actual}")
    requested = int(os.environ.get("LEAF_COUPLED_TRIALS", "20000"))
    require(1 <= requested <= TRIAL_CAP, "trial count outside guarded range")

    rng = random.Random(993_641_901)
    g1 = evaluator()
    labels = (
        "all_leaf_deleted", "all_leaf_retained", "retention_response",
        "isolated_deleted", "isolated_retained",
        "ordinary_parent_deleted", "ordinary_parent_retained",
        "mark_parent_deleted", "mark_parent_retained",
    )
    counts = {label: Counter() for label in labels}
    minima = {label: None for label in labels}
    stream = hashlib.sha256()
    started = time.monotonic()
    accepted = 0

    while accepted < requested:
        if time.monotonic() - started > TIME_CAP_SECONDS:
            raise RuntimeError("time cap exceeded")
        order = rng.randrange(3, 122)
        graph = random_forest(rng, order)
        nodes = tuple(graph)
        u, v = rng.sample(nodes, 2)
        leaves = [node for node in nodes if node not in (u, v) and graph.degree(node) <= 1]
        if not leaves:
            continue
        ell = rng.choice(leaves)
        parent = next(iter(graph.neighbors(ell))) if graph.degree(ell) else None

        density = rng.random()
        retained_base = {node for node in nodes if node != ell and rng.random() < density}
        code = nx.to_graph6_bytes(graph, header=False).decode().strip()
        mask = sum(1 << node for node in retained_base)

        reduced = graph.copy()
        reduced.remove_node(ell)
        bgraph = reduced.subgraph(retained_base).copy()
        dretained = graph.subgraph(retained_base | {ell}).copy()
        crows = rows(graph, u, v)
        arows = rows(reduced, u, v)
        brows = rows(bgraph, u, v)
        dretained_rows = rows(dretained, u, v)

        after = g1(arows, brows)
        delta_deleted = g1(crows, brows) - after
        delta_retained = g1(crows, dretained_rows) - after
        response = delta_retained - delta_deleted

        if parent is None:
            kind = "isolated"
        elif parent in (u, v):
            kind = "mark_parent"
        else:
            kind = "ordinary_parent"
        values = {
            "all_leaf_deleted": delta_deleted,
            "all_leaf_retained": delta_retained,
            "retention_response": response,
            f"{kind}_deleted": delta_deleted,
            f"{kind}_retained": delta_retained,
        }
        prefix = (order, code, u, v, ell, -1 if parent is None else parent, str(mask))
        for label, value in values.items():
            counts[label][sign(value)] += 1
            record = (value, *prefix)
            minima[label] = record if minima[label] is None or record < minima[label] else minima[label]

        coupled_negative = delta_deleted < 0 or delta_retained < 0
        if coupled_negative:
            witness = {
                "order": order,
                "graph6": code,
                "marks": [u, v],
                "leaf": ell,
                "parent": parent,
                "leaf_kind": kind,
                "post_deletion_retained_mask_decimal": str(mask),
                "delta_leaf_deleted": delta_deleted,
                "retention_response": response,
                "delta_leaf_retained": delta_retained,
            }
            report = {
                "marker": MARKER,
                "trials_requested": requested,
                "trials_completed": accepted + 1,
                "counterexample_candidate": witness,
                "counts": {key: dict(counts[key]) for key in labels},
                "minima": {key: list(minima[key]) if minima[key] else None for key in labels},
                "scope_guard": (
                    "A negative full increment is a candidate against the universal leaf route, "
                    "not automatically a counterexample to rank-six g1 or Problem 993; it must "
                    "be independently reconstructed."
                ),
                "dependencies_sha256": PINS,
                "source_sha256": sha256(Path(__file__)),
            }
            OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            print(json.dumps(report, indent=2, sort_keys=True))
            print(MARKER)
            return

        stream.update((
            f"{order}|{code}|{u}|{v}|{ell}|{parent}|{mask}|"
            f"{delta_deleted}|{response}|{delta_retained};"
        ).encode())
        accepted += 1

    report = {
        "marker": MARKER,
        "seed": 993_641_901,
        "orders": [3, 121],
        "trials_requested": requested,
        "trials_completed": accepted,
        "counterexample_candidate": None,
        "counts": {key: dict(counts[key]) for key in labels},
        "minima": {key: list(minima[key]) if minima[key] else None for key in labels},
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "This is deterministic finite falsification evidence only.  Negative response "
            "pieces are allowed; the probe asserts no universal leaf theorem or rank-six g1 theorem."
        ),
        "dependencies_sha256": PINS,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
