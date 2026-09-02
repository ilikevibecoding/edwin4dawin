#!/usr/bin/env python3
"""Deterministic genuine-forest probe of the retained-isolate coarse lower.

This does not test the target itself (that was tested separately).  It asks
whether the valid category-containment lower produced by
``derive_iso_n6_bundle_g1_retained_isolate_coarse_lower_root.py`` remains
nonnegative on genuine marked forests and genuine induced minors.  A negative
value is only an obstruction to this coarse proof cone.
"""

from __future__ import annotations

from collections import Counter
import hashlib
import json
from pathlib import Path
import random

import networkx as nx
import sympy as sp

from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, random_forest, rows


HERE = Path(__file__).resolve().parent
SOURCE_REPORT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_lower_random_probe_root_20260901.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_COARSE_LOWER_RANDOM_ROOT"
EXPECTED_SOURCE_REPORT_SHA256 = "148997F5D5ED3A798B18B4FEEF6FF13166366247ACA4D445495AB6655095E12A"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual_hash = sha256(SOURCE_REPORT)
    if actual_hash != EXPECTED_SOURCE_REPORT_SHA256:
        raise RuntimeError(f"source report hash mismatch: {actual_hash}")
    source = json.loads(SOURCE_REPORT.read_text(encoding="utf-8"))
    evaluators = {}
    for label, row in source["branches"].items():
        expression = sp.sympify(row["expression"])
        variables = tuple(sorted(expression.free_symbols, key=str))
        evaluators[label] = (variables, sp.lambdify(variables, expression, "math"))

    rng = random.Random(993_641_902)
    trials = 20_000
    counts = {label: Counter() for label in evaluators}
    minima = {label: None for label in evaluators}
    stream = hashlib.sha256()
    for trial in range(trials):
        order = rng.randrange(2, 122)
        graph = random_forest(rng, order)
        u, v = rng.sample(tuple(graph), 2)
        density = rng.random()
        retained = {node for node in graph if rng.random() < density}
        minor = graph.subgraph(retained).copy()
        cvalues = categories(rows(graph, u, v))
        values = {
            **cvalues,
            "n": order,
            "q": len(retained),
            "epsilon_u": int(u in retained),
            "epsilon_v": int(v in retained),
        }
        geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
        label = f"{geometry}_u{values['epsilon_u']}_v{values['epsilon_v']}"
        variables, evaluate = evaluators[label]
        value = int(evaluate(*(values[str(variable)] for variable in variables)))
        sign = "negative" if value < 0 else "positive" if value > 0 else "zero"
        counts[label][sign] += 1
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        mask = sum(1 << node for node in retained)
        record = (value, order, graph6, u, v, str(mask))
        minima[label] = record if minima[label] is None or record < minima[label] else minima[label]
        stream.update(f"{trial}|{label}|{value}|{order}|{graph6}|{u}|{v}|{mask};".encode())

    report = {
        "marker": MARKER,
        "seed": 993_641_902,
        "trials": trials,
        "orders": [2, 121],
        "counts": {label: dict(counts[label]) for label in sorted(counts)},
        "minima": {label: list(minima[label]) if minima[label] else None for label in sorted(minima)},
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "source_report_sha256": actual_hash,
        "scope_guard": (
            "Negative values obstruct only the coarse containment lower. They are not "
            "negative retained-isolate increments and not counterexamples to rank-six G1."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "counts": report["counts"],
        "minima": report["minima"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
