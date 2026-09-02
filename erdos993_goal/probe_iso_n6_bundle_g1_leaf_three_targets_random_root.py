#!/usr/bin/env python3
"""Deterministic falsification probe for the three remaining leaf sign targets.

The probe samples genuine forests, actual induced minors, and actual unmarked
degree-zero/one vertices.  It is evidence only and makes no universal claim.
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
import sympy as sp

from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from search_iso_n6_bundle_g1_random_g1_nonadjacent import evaluator as g1_evaluator
from search_iso_n6_bundle_g1_random_g1_nonadjacent import random_forest, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_leaf_three_targets_random_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G1_LEAF_THREE_TARGETS_RANDOM_ROOT"
TRIAL_CAP = 100_000
TIME_CAP_SECONDS = 600
PINS = {
    "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py":
        "2A9C38962DA9070D1CF480838FB9CE671C699DB51B554587273AD5C578AA0936",
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "search_iso_n6_bundle_g1_random_g1_nonadjacent.py":
        "E1AE43CA1C972E07EE2946A4BC42F00FA48B00A122B23FFFFA1F6354D65986EC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def make_g2_evaluator():
    expression = reconstruct(2)
    variables = tuple(sorted(expression.free_symbols, key=str))
    evaluate = sp.lambdify(variables, expression, "math")

    def value(crows, drows):
        data = {}
        for prefix, four in (("c", crows), ("d", drows)):
            for family, sequence in zip("EUVW", four):
                for rank in range(8):
                    data[f"{prefix}{family}{rank}"] = sequence[rank]
        return int(evaluate(*(data[str(variable)] for variable in variables)))

    return value


def sign(value: int) -> str:
    return "negative" if value < 0 else "positive" if value > 0 else "zero"


def main() -> None:
    for name, expected in PINS.items():
        actual = sha256(HERE / name)
        require(actual == expected, f"dependency hash mismatch for {name}: {actual}")
    requested = int(os.environ.get("LEAF_TARGET_TRIALS", "20000"))
    require(1 <= requested <= TRIAL_CAP, "trial count outside guarded range")

    rng = random.Random(993_631_831)
    g1 = g1_evaluator()
    g2 = make_g2_evaluator()
    zero = tuple(tuple(0 for _ in range(8)) for _ in "EUVW")
    counts = {name: Counter() for name in (
        "swapped_superforest", "ordinary_parent_payment", "marked_parent_omega",
        "full_leaf_increment",
    )}
    minima = {name: None for name in counts}
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
        candidates = [node for node in nodes if node not in (u, v) and graph.degree(node) <= 1]
        if not candidates:
            continue
        ell = rng.choice(candidates)
        parent = next(iter(graph.neighbors(ell))) if graph.degree(ell) else None
        density = rng.random()
        retained = {node for node in nodes if rng.random() < density}
        code = nx.to_graph6_bytes(graph, header=False).decode().strip()
        mask = sum(1 << node for node in retained)

        crows = rows(graph, u, v)
        dgraph = graph.subgraph(retained).copy()
        drows = rows(dgraph, u, v)
        reduced = graph.copy()
        reduced.remove_node(ell)
        reduced_retained = retained - {ell}
        reduced_dgraph = reduced.subgraph(reduced_retained).copy()
        reduced_crows = rows(reduced, u, v)
        reduced_drows = rows(reduced_dgraph, u, v)

        full_delta = g1(crows, drows) - g1(reduced_crows, reduced_drows)
        values = {"full_leaf_increment": full_delta}

        # Retention response target: remove ell and its parent (when present)
        # from the D-side row block J, exactly as in the three leaf recurrences.
        jnodes = retained - {ell}
        if parent is not None:
            jnodes.discard(parent)
        jgraph = graph.subgraph(jnodes).copy()
        jrows = rows(jgraph, u, v)
        phi = g2(jrows, crows) - g2(jrows, zero)
        values["swapped_superforest"] = phi

        if parent is not None and parent not in (u, v):
            # Force ell absent while preserving the sampled parent state.
            bgraph = graph.subgraph(retained - {ell}).copy()
            payment = g1(crows, rows(bgraph, u, v)) - g1(reduced_crows, rows(bgraph, u, v))
            values["ordinary_parent_payment"] = payment
        elif parent in (u, v):
            bgraph = graph.subgraph(retained - {ell}).copy()
            omega = g1(crows, rows(bgraph, u, v)) - g1(reduced_crows, rows(bgraph, u, v))
            values["marked_parent_omega"] = omega

        record_prefix = (order, code, u, v, ell, -1 if parent is None else parent, str(mask))
        for label, value in values.items():
            counts[label][sign(value)] += 1
            record = (value, *record_prefix)
            minima[label] = record if minima[label] is None or record < minima[label] else minima[label]
            if value < 0:
                witness = {
                    "target": label,
                    "value": value,
                    "order": order,
                    "graph6": code,
                    "u": u,
                    "v": v,
                    "ell": ell,
                    "parent": parent,
                    "retained_mask_decimal": str(mask),
                }
                report = {
                    "marker": MARKER,
                    "trials_requested": requested,
                    "trials_completed": accepted + 1,
                    "counterexample_candidate": witness,
                    "counts": {key: dict(value) for key, value in counts.items()},
                    "minima": {key: list(value) if value else None for key, value in minima.items()},
                    "scope_guard": "A probe witness must be independently reconstructed before promotion.",
                    "dependencies_sha256": PINS,
                    "source_sha256": sha256(Path(__file__)),
                }
                OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
                print(json.dumps(report, indent=2, sort_keys=True))
                print(MARKER)
                return
        stream.update(("|".join(map(str, (*record_prefix, *sorted(values.items())))) + ";").encode())
        accepted += 1

    report = {
        "marker": MARKER,
        "seed": 993_631_831,
        "orders": [3, 121],
        "trials_requested": requested,
        "trials_completed": accepted,
        "counterexample_candidate": None,
        "counts": {key: dict(value) for key, value in counts.items()},
        "minima": {key: list(value) if value else None for key, value in minima.items()},
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "This is deterministic finite falsification evidence only.  It proves none of "
            "the three universal leaf targets or universal rank-six g1."
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
