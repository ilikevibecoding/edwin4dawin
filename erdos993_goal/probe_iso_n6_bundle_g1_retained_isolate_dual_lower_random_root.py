#!/usr/bin/env python3
"""Probe the maximum of two valid retained-isolate lower bounds.

The category-containment and minor-cardinality reductions are independently
valid lower bounds, so their pointwise maximum is also a valid lower bound.
This deterministic genuine-forest probe tests whether their weaknesses overlap.
It is falsification evidence only, not a universal proof.
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
COARSE_REPORT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_lower_exact_root_20260901.json"
CARDINALITY_REPORT = HERE / "iso_n6_bundle_g1_retained_isolate_cardinality_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_dual_lower_random_probe_root_20260901.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_DUAL_LOWER_RANDOM_ROOT"
EXPECTED = {
    "coarse": "148997F5D5ED3A798B18B4FEEF6FF13166366247ACA4D445495AB6655095E12A",
    "cardinality": "E89C26DA723D65F02C615FB5E0D4D02F6C1A79F213FC0A53D199ABE2FA085C71",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path, expected: str):
    actual = sha256(path)
    if actual != expected:
        raise RuntimeError(f"report hash mismatch for {path.name}: {actual}")
    data = json.loads(path.read_text(encoding="utf-8"))
    result = {}
    for label, row in data["branches"].items():
        expression = sp.sympify(row["expression"])
        variables = tuple(sorted(expression.free_symbols, key=str))
        result[label] = (variables, sp.lambdify(variables, expression, "math"))
    return result


def load_coordinate_min(path: Path, expected: str):
    actual = sha256(path)
    if actual != expected:
        raise RuntimeError(f"report hash mismatch for {path.name}: {actual}")
    data = json.loads(path.read_text(encoding="utf-8"))
    result = {}
    for label, row in data["branches"].items():
        lower = sp.sympify(row["expression"])
        pieces = []
        base = lower
        for dname, drow in row["derivative_rows"].items():
            negative = sp.sympify(drow["negative_part_expression"])
            cardinality_cap = sp.sympify(drow["cardinality_cap"])
            containment_cap = sp.Symbol("C" + dname[1:])
            base -= negative * cardinality_cap
            pieces.append((negative, containment_cap, cardinality_cap))
        expression = sp.expand(base) + sum(
            negative * sp.Min(containment_cap, cardinality_cap)
            for negative, containment_cap, cardinality_cap in pieces
        )
        variables = tuple(sorted(expression.free_symbols, key=str))
        result[label] = (variables, sp.lambdify(variables, expression, "math"))
    return result


def load_exact_box(coarse_path: Path, cardinality_path: Path):
    if sha256(coarse_path) != EXPECTED["coarse"] or sha256(cardinality_path) != EXPECTED["cardinality"]:
        raise RuntimeError("input report hash mismatch while building exact box")
    coarse_data = json.loads(coarse_path.read_text(encoding="utf-8"))
    cardinality_data = json.loads(cardinality_path.read_text(encoding="utf-8"))
    derivative_data = coarse_data["derivative_rows"]
    result = {}
    for label, cardinality_row in cardinality_data["branches"].items():
        geometry, umark, vmark = label.split("_")
        uvalue, vvalue = int(umark[1:]), int(vmark[1:])
        fixed = {
            sp.Symbol("epsilon_u"): uvalue,
            sp.Symbol("epsilon_v"): vvalue,
        }
        if geometry == "adjacent":
            fixed.update({sp.Symbol(f"CZ{rank}"): 0 for rank in range(2, 8)})
        coarse_expression = sp.sympify(coarse_data["branches"][label]["expression"])
        base = coarse_expression
        for dname, drow in derivative_data.items():
            negative = sp.sympify(drow["negative_part_expression"]).subs(fixed)
            containment_cap = sp.sympify(drow["cap"]).subs(fixed)
            base -= negative * containment_cap
        box = sp.expand(base)
        for dname, drow in cardinality_row["derivative_rows"].items():
            derivative = sp.sympify(derivative_data[dname]["derivative_expression"]).subs(fixed)
            containment_cap = sp.Symbol("C" + dname[1:]).subs(fixed)
            cardinality_cap = sp.sympify(drow["cardinality_cap"])
            box += sp.Min(containment_cap, cardinality_cap) * sp.Min(derivative, 0)
        variables = tuple(sorted(box.free_symbols, key=str))
        result[label] = (variables, sp.lambdify(variables, box, "math"))
    return result


def evaluate(pair, values):
    variables, function = pair
    return int(function(*(values[str(variable)] for variable in variables)))


def sign(value: int) -> str:
    return "negative" if value < 0 else "positive" if value > 0 else "zero"


def main() -> None:
    coarse = load(COARSE_REPORT, EXPECTED["coarse"])
    cardinality = load(CARDINALITY_REPORT, EXPECTED["cardinality"])
    coordinate_min = load_coordinate_min(CARDINALITY_REPORT, EXPECTED["cardinality"])
    exact_box = load_exact_box(COARSE_REPORT, CARDINALITY_REPORT)
    rng = random.Random(993_641_903)
    trials = 20_000
    counts = {
        label: {name: Counter() for name in ("coarse", "cardinality", "coordinate_min", "exact_box", "maximum")}
        for label in coarse
    }
    minima = {
        label: {name: None for name in ("coarse", "cardinality", "coordinate_min", "exact_box", "maximum")}
        for label in coarse
    }
    overlap_negative = Counter()
    stream = hashlib.sha256()

    for trial in range(trials):
        order = rng.randrange(2, 122)
        graph = random_forest(rng, order)
        u, v = rng.sample(tuple(graph), 2)
        density = rng.random()
        retained = {node for node in graph if rng.random() < density}
        cvalues = categories(rows(graph, u, v))
        eu, ev = int(u in retained), int(v in retained)
        geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
        label = f"{geometry}_u{eu}_v{ev}"
        values = {
            **cvalues,
            "n": order,
            "q": len(retained),
            "epsilon_u": eu,
            "epsilon_v": ev,
            "t": len(retained) - eu - ev,
        }
        observed = {
            "coarse": evaluate(coarse[label], values),
            "cardinality": evaluate(cardinality[label], values),
            "coordinate_min": evaluate(coordinate_min[label], values),
            "exact_box": evaluate(exact_box[label], values),
        }
        observed["maximum"] = max(observed.values())
        overlap_negative[label] += all(
            observed[name] < 0
            for name in ("coarse", "cardinality", "coordinate_min", "exact_box")
        )
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        mask = sum(1 << node for node in retained)
        for name, value in observed.items():
            counts[label][name][sign(value)] += 1
            record = (value, order, graph6, u, v, str(mask))
            minima[label][name] = (
                record if minima[label][name] is None or record < minima[label][name]
                else minima[label][name]
            )
        stream.update(
            f"{trial}|{label}|{observed['coarse']}|{observed['cardinality']}|"
            f"{observed['coordinate_min']}|"
            f"{observed['exact_box']}|"
            f"{observed['maximum']}|{order}|{graph6}|{u}|{v}|{mask};".encode()
        )

    report = {
        "marker": MARKER,
        "seed": 993_641_903,
        "trials": trials,
        "orders": [2, 121],
        "counts": {
            label: {name: dict(counts[label][name]) for name in counts[label]}
            for label in sorted(counts)
        },
        "overlap_negative": dict(overlap_negative),
        "minima": {
            label: {name: list(minima[label][name]) for name in minima[label]}
            for label in sorted(minima)
        },
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "input_report_sha256": EXPECTED,
        "scope_guard": (
            "A negative maximum obstructs this two-lower proof cone only. A nonnegative "
            "finite probe is evidence and does not prove the universal target."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "overlap_negative": report["overlap_negative"],
        "maximum_counts": {
            label: report["counts"][label]["maximum"] for label in sorted(counts)
        },
        "maximum_minima": {
            label: report["minima"][label]["maximum"] for label in sorted(minima)
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
