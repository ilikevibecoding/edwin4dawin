#!/usr/bin/env python3
"""Exact replay for the general Boundary-SM3 mean/mode reduction.

This proves identities and checks sufficient hypotheses.  The finite audits
are evidence only; they are not an all-order proof of Boundary-SM3.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx


Poly = tuple[int, ...]


def trim(a: list[int] | tuple[int, ...]) -> Poly:
    out = list(a)
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return tuple(out)


def add(a: Poly, b: Poly) -> Poly:
    out = [0] * max(len(a), len(b))
    for k, value in enumerate(a):
        out[k] += value
    for k, value in enumerate(b):
        out[k] += value
    return trim(out)


def mul(a: Poly, b: Poly) -> Poly:
    out = [0] * (len(a) + len(b) - 1)
    for i, av in enumerate(a):
        for j, bv in enumerate(b):
            out[i + j] += av * bv
    return trim(out)


def shift(a: Poly) -> Poly:
    return (0,) + a


def coeff(a: Poly, k: int) -> int:
    return a[k] if 0 <= k < len(a) else 0


def reciprocal_at(a: Poly, degree: int) -> Poly:
    assert degree >= len(a) - 1
    out = [0] * (degree + 1)
    for k, value in enumerate(a):
        out[degree - k] = value
    return tuple(out)


def forest_poly(g: nx.Graph, nodes: set[int]) -> Poly:
    if not nodes:
        return (1,)
    unseen = set(nodes)
    total = (1,)
    while unseen:
        root = min(unseen)
        parent: dict[int, int | None] = {root: None}
        order = [root]
        for vertex in order:
            for child in g[vertex]:
                if child in nodes and child not in parent:
                    parent[child] = vertex
                    order.append(child)
        unseen.difference_update(order)
        states: dict[int, tuple[Poly, Poly]] = {}
        for vertex in reversed(order):
            excluded = (1,)
            included = (0, 1)
            for child in g[vertex]:
                if parent.get(child) == vertex:
                    child_out, child_in = states[child]
                    excluded = mul(excluded, add(child_out, child_in))
                    included = mul(included, child_out)
            states[vertex] = excluded, included
        total = mul(total, add(*states[root]))
    return total


def frac_record(value: Fraction) -> dict[str, int]:
    return {"numerator": value.numerator, "denominator": value.denominator}


def moments_at_third(p: Poly) -> tuple[Fraction, Fraction, Fraction]:
    mass = sum(Fraction(value, 3**k) for k, value in enumerate(p))
    mean = sum(Fraction(k * value, 3**k) for k, value in enumerate(p)) / mass
    second = sum(Fraction(k * k * value, 3**k) for k, value in enumerate(p)) / mass
    return mass, mean, second - mean * mean


def lc_defects(p: Poly) -> list[dict[str, int]]:
    return [
        {"k": k, "margin": p[k] * p[k] - p[k - 1] * p[k + 1]}
        for k in range(1, len(p) - 1)
        if p[k] * p[k] < p[k - 1] * p[k + 1]
    ]


def mixed_margins(u: Poly, v: Poly) -> list[dict[str, int]]:
    return [
        {
            "k": k,
            "margin": 2 * coeff(u, k) * coeff(v, k)
            - coeff(u, k - 1) * coeff(v, k + 1)
            - coeff(v, k - 1) * coeff(u, k + 1),
        }
        for k in range(1, max(len(u), len(v)) - 1)
    ]


def synchronization_defects(u: Poly, v: Poly) -> list[dict[str, int]]:
    out = []
    for k in range(max(len(u), len(v))):
        left = coeff(u, k) * coeff(v, k) - coeff(u, k - 1) * coeff(v, k + 1)
        right = coeff(u, k) * coeff(v, k) - coeff(v, k - 1) * coeff(u, k + 1)
        if left < 0 or right < 0:
            out.append({"k": k, "left_margin": left, "right_margin": right})
    return out


def branch_state(g: nx.Graph, nodes: set[int], root: int) -> tuple[Poly, Poly, bool, int]:
    c = forest_poly(g, nodes - {root})
    d = forest_poly(g, nodes - {root} - set(g[root]))
    b = add(c, shift(d))
    alpha = len(b) - 1
    e = reciprocal_at(c, alpha)
    z = reciprocal_at(d, alpha - 1)
    assert add(e, z) == reciprocal_at(b, alpha)
    return e, z, len(c) == len(d), alpha


def tensor_from_states(states: list[tuple[Poly, Poly, bool, int]]) -> dict:
    p = (1,)
    e = (1,)
    beta = 0
    critical = 0
    for ei, zi, is_critical, alpha in states:
        p = mul(p, add(ei, zi))
        e = mul(e, ei)
        beta += alpha
        critical += int(is_critical)
    u = mul((1, 1), p)
    j = add(u, e)
    a = beta - 2 * beta // 3
    mass_u, mean_u, variance_u = moments_at_third(u)
    mass_v, mean_v, variance_v = moments_at_third(e)
    mass, mean, variance = moments_at_third(j)
    weight_v = mass_v / mass
    assert mean == (1 - weight_v) * mean_u + weight_v * mean_v
    assert variance == (
        (1 - weight_v) * variance_u
        + weight_v * variance_v
        + weight_v * (1 - weight_v) * (mean_v - mean_u) ** 2
    )
    mean_mode_gap = (Fraction(a + 1) - mean) ** 2 - 3 * (variance + Fraction(1, 12))
    lc_j = lc_defects(j)
    # This equality is the exact necessary-and-sufficient aggregate LC test.
    aggregate_margins = []
    mixed = mixed_margins(u, e)
    for k in range(1, len(j) - 1):
        du = coeff(u, k) ** 2 - coeff(u, k - 1) * coeff(u, k + 1)
        dv = coeff(e, k) ** 2 - coeff(e, k - 1) * coeff(e, k + 1)
        total = du + dv + mixed[k - 1]["margin"]
        assert total == coeff(j, k) ** 2 - coeff(j, k - 1) * coeff(j, k + 1)
        aggregate_margins.append({"k": k, "delta_u": du, "delta_v": dv, "mixed": mixed[k - 1]["margin"], "total": total})
    margin = 3 * coeff(j, a) - coeff(j, a + 1)
    certificate = (not lc_j) and mean < a + 1 and mean_mode_gap > 0
    return {
        "beta": beta,
        "a": a,
        "critical_count": critical,
        "P": list(p),
        "U": list(u),
        "V": list(e),
        "J": list(j),
        "j_a": coeff(j, a),
        "j_a_plus_1": coeff(j, a + 1),
        "boundary_margin": margin,
        "lc_defects_J": lc_j,
        "lc_defects_U": lc_defects(u),
        "lc_defects_V": lc_defects(e),
        "synchronization_defects_UV": synchronization_defects(u, e),
        "negative_mixed_margins": [item for item in mixed if item["margin"] < 0],
        "negative_aggregate_lc_margins": [item for item in aggregate_margins if item["total"] < 0],
        "mass_U": frac_record(mass_u),
        "mass_V": frac_record(mass_v),
        "mixture_weight_V": frac_record(weight_v),
        "mean_U": frac_record(mean_u),
        "variance_U": frac_record(variance_u),
        "mean_V": frac_record(mean_v),
        "variance_V": frac_record(variance_v),
        "mean": frac_record(mean),
        "variance": frac_record(variance),
        "mean_mode_gap": frac_record(mean_mode_gap),
        "mean_mode_certificate": certificate,
    }


def states_at_vertex(g: nx.Graph, p: int) -> list[tuple[Poly, Poly, bool, int]]:
    f_nodes = set(g) - {p}
    sub = g.subgraph(f_nodes)
    seen: set[int] = set()
    states = []
    for root in sorted(g[p]):
        if root in seen:
            continue
        component = set(nx.node_connected_component(sub, root))
        seen.update(component)
        states.append(branch_state(g, component, root))
    return states


def eligible(g: nx.Graph, p: int) -> bool:
    f = forest_poly(g, set(g) - {p})
    full = forest_poly(g, set(g))
    beta = len(f) - 1
    return len(full) - 1 == beta and beta % 3 in (1, 2)


def known_order26_no_gos(base: Path) -> list[dict]:
    source = base / "literature_sources/erdos-problem-993-current/results/analysis_n26.json"
    rows = json.loads(source.read_text(encoding="utf-8"))["lc_failures"]
    out = []
    for index, row in enumerate(rows):
        original = nx.from_graph6_bytes(row["graph6"].encode("ascii"))
        leaf = min(v for v in original if original.degree(v) == 1)
        p = next(iter(original[leaf]))
        reduced = original.copy()
        reduced.remove_node(leaf)
        assert eligible(reduced, p)
        item = tensor_from_states(states_at_vertex(reduced, p))
        direct = reciprocal_at(forest_poly(original, set(original)), len(row["poly"]) - 1)
        assert tuple(item["J"]) == direct
        assert item["boundary_margin"] > 0
        assert item["lc_defects_J"]
        assert not item["lc_defects_U"] and not item["lc_defects_V"]
        assert item["mean_mode_gap"]["numerator"] < 0
        out.append(
            {
                "source_index": index,
                "graph6": row["graph6"],
                "leaf": leaf,
                "support": p,
                "edges": sorted([min(u, v), max(u, v)] for u, v in original.edges()),
                **item,
            }
        )
    return out


def update_summary(summary: dict, item: dict, tag: dict) -> None:
    summary["eligible"] += 1
    if item["boundary_margin"] < 0 and summary["first_boundary_failure"] is None:
        summary["first_boundary_failure"] = {**tag, **item}
    if item["lc_defects_J"]:
        summary["aggregate_lc_failures"] += 1
        if summary["first_aggregate_lc_failure"] is None:
            summary["first_aggregate_lc_failure"] = {**tag, **item}
    if item["synchronization_defects_UV"]:
        summary["synchronization_failures"] += 1
        if summary["first_synchronization_failure"] is None:
            summary["first_synchronization_failure"] = {**tag, **item}
    if item["negative_mixed_margins"]:
        summary["mixed_nonnegativity_failures"] += 1
        if summary["first_mixed_nonnegativity_failure"] is None:
            summary["first_mixed_nonnegativity_failure"] = {**tag, **item}
    if not item["mean_mode_certificate"]:
        summary["mean_mode_certificate_failures"] += 1
        if summary["first_mean_mode_certificate_failure"] is None:
            summary["first_mean_mode_certificate_failure"] = {**tag, **item}


def empty_summary() -> dict:
    return {
        "eligible": 0,
        "aggregate_lc_failures": 0,
        "synchronization_failures": 0,
        "mixed_nonnegativity_failures": 0,
        "mean_mode_certificate_failures": 0,
        "first_boundary_failure": None,
        "first_aggregate_lc_failure": None,
        "first_synchronization_failure": None,
        "first_mixed_nonnegativity_failure": None,
        "first_mean_mode_certificate_failure": None,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=14)
    parser.add_argument("--catalog-max-order", type=int, default=9)
    parser.add_argument("--product-samples", type=int, default=20_000)
    parser.add_argument("--seed", type=int, default=993_081_312)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("boundary_sm3_mean_mode_general_exact_20260813.json"),
    )
    args = parser.parse_args()
    base = Path(__file__).resolve().parent

    exhaustive = empty_summary()
    exhaustive.update({"trees": 0, "vertex_setups": 0})
    for n in range(2, args.max_order + 1):
        for tree_index, g in enumerate(nx.nonisomorphic_trees(n)):
            exhaustive["trees"] += 1
            for p in g:
                exhaustive["vertex_setups"] += 1
                if eligible(g, p):
                    update_summary(exhaustive, tensor_from_states(states_at_vertex(g, p)), {"n": n, "tree_index": tree_index, "p": p})

    catalog_map: dict[tuple[Poly, Poly, bool, int], dict] = {}
    first_component_non_lc = None
    for n in range(1, args.catalog_max_order + 1):
        trees = [nx.empty_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        for tree_index, g in enumerate(trees):
            for root in g:
                state = branch_state(g, set(g), root)
                catalog_map.setdefault(state, {"n": n, "tree_index": tree_index, "root": root})
                if first_component_non_lc is None and (lc_defects(add(state[0], state[1])) or lc_defects(state[0])):
                    first_component_non_lc = {**catalog_map[state], "E": list(state[0]), "Z": list(state[1])}
    catalog = list(catalog_map)

    products = empty_summary()
    products.update({"samples_requested": args.product_samples, "distinct_rooted_states": len(catalog)})
    rng = random.Random(args.seed)
    for sample in range(args.product_samples):
        count = rng.randint(1, 20)
        indices = [rng.randrange(len(catalog)) for _ in range(count)]
        states = [catalog[index] for index in indices]
        beta = sum(state[3] for state in states)
        critical = sum(state[2] for state in states)
        if not critical or beta % 3 not in (1, 2):
            continue
        update_summary(products, tensor_from_states(states), {"sample": sample, "catalog_indices": indices})

    known = known_order26_no_gos(base)
    # The smallest exact mean/mode no-go is the K_1,3 tree, obtained by taking
    # g=K_1,2 and p at its center before the final leaf is attached.
    small = nx.star_graph(2)
    star_item = tensor_from_states(states_at_vertex(small, 0))
    assert star_item["J"] == [1, 3, 4, 1]
    assert star_item["boundary_margin"] == 5
    assert not star_item["mean_mode_certificate"]
    assert star_item["mean_mode_gap"]["numerator"] < 0

    # Separately certify that a rooted component polynomial itself need not be
    # LC: root the first known order-26 LC breaker at one of its leaves.
    source = base / "literature_sources/erdos-problem-993-current/results/analysis_n26.json"
    row = json.loads(source.read_text(encoding="utf-8"))["lc_failures"][0]
    breaker = nx.from_graph6_bytes(row["graph6"].encode("ascii"))
    breaker_root = min(v for v in breaker if breaker.degree(v) == 1)
    breaker_state = branch_state(breaker, set(breaker), breaker_root)
    rooted_component_no_go = {
        "graph6": row["graph6"],
        "root": breaker_root,
        "critical": breaker_state[2],
        "alpha": breaker_state[3],
        "B": list(add(breaker_state[0], breaker_state[1])),
        "E": list(breaker_state[0]),
        "Z": list(breaker_state[1]),
        "B_lc_defects": lc_defects(add(breaker_state[0], breaker_state[1])),
    }
    assert rooted_component_no_go["critical"] and rooted_component_no_go["B_lc_defects"]

    report = {
        "status": "CONDITIONAL_THEOREM_AND_EXACT_NO_GOS_BOUNDARY_REMAINS_OPEN",
        "theorem": {
            "tensor": "J=U+V, U=(1+x) product_i(E_i+Z_i), V=product_i E_i",
            "mixture": "mu=(1-w)mu_U+w mu_V; var=(1-w)var_U+w var_V+w(1-w)(mu_V-mu_U)^2",
            "exact_lc_test": "Delta_k(J)=Delta_k(U)+Delta_k(V)+2u_kv_k-u_(k-1)v_(k+1)-v_(k-1)u_(k+1)",
            "mean_mode_certificate": "J LC without internal zeros, mu<a+1, and (a+1-mu)^2>3(var+1/12) imply j_(a+1)<=3j_a",
        },
        "exhaustive": exhaustive,
        "random_rooted_products": products,
        "catalog_first_component_non_lc": first_component_non_lc,
        "smallest_mean_mode_no_go_K1_3": star_item,
        "known_order26_literal_aggregate_lc_no_gos": known,
        "known_order26_rooted_component_lc_no_go": rooted_component_no_go,
    }
    encoded = json.dumps(report, indent=2) + "\n"
    args.output.write_bytes(encoded.encode("utf-8"))
    print(encoded, end="")
    print("report_sha256", hashlib.sha256(encoded.encode("utf-8")).hexdigest())
    failure = exhaustive["first_boundary_failure"] or products["first_boundary_failure"]
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
