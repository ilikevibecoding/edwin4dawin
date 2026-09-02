#!/usr/bin/env python3
"""Exact replay for the reciprocal tensor form of Boundary-SM3.

The theorem checked here is an identity, not a proof of Boundary-SM3.  All
polynomial arithmetic is over Python integers.  The exhaustive part enumerates
unlabelled trees; the random part is additional bounded evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
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
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] += value
    return trim(out)


def mul(a: Poly, b: Poly) -> Poly:
    out = [0] * (len(a) + len(b) - 1)
    for i, av in enumerate(a):
        for j, bv in enumerate(b):
            out[i + j] += av * bv
    return trim(out)


def shift(a: Poly, amount: int = 1) -> Poly:
    return (0,) * amount + a


def coeff(a: Poly, k: int) -> int:
    return a[k] if 0 <= k < len(a) else 0


def reciprocal_at(a: Poly, degree: int) -> Poly:
    """Return x^degree a(1/x), retaining leading zero coefficients."""
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
        for v in order:
            for w in g[v]:
                if w in nodes and w not in parent:
                    parent[w] = v
                    order.append(w)
        unseen.difference_update(order)
        states: dict[int, tuple[Poly, Poly]] = {}
        for v in reversed(order):
            excluded = (1,)
            included = (0, 1)
            for w in g[v]:
                if parent.get(w) == v:
                    child_excluded, child_included = states[w]
                    excluded = mul(excluded, add(child_excluded, child_included))
                    included = mul(included, child_excluded)
            states[v] = excluded, included
        total = mul(total, add(*states[root]))
    return total


def tensor_record(g: nx.Graph, p: int, include_channels: bool = False) -> dict:
    all_nodes = set(g)
    f_nodes = all_nodes - {p}
    f = forest_poly(g, f_nodes)
    full = forest_poly(g, all_nodes)
    beta = len(f) - 1
    assert len(full) - 1 == beta
    r = 2 * beta // 3
    a = beta - r

    h_nodes = f_nodes - set(g[p])
    h = forest_poly(g, h_nodes)
    sub_f = g.subgraph(f_nodes)
    factors: list[tuple[Poly, Poly]] = []
    branch_data = []
    seen: set[int] = set()
    for root in sorted(g[p]):
        if root in seen:
            continue
        component = set(nx.node_connected_component(sub_f, root))
        seen.update(component)
        c_poly = forest_poly(g, component - {root})
        d_poly = forest_poly(g, component - {root} - set(g[root]))
        b_poly = forest_poly(g, component)
        assert b_poly == add(c_poly, shift(d_poly))
        alpha_i = len(b_poly) - 1
        c_i = len(c_poly) - 1
        d_i = len(d_poly) - 1
        assert alpha_i == max(c_i, 1 + d_i)
        e_i = reciprocal_at(c_poly, alpha_i)
        z_i = reciprocal_at(d_poly, alpha_i - 1)
        factors.append((e_i, z_i))
        branch_data.append(
            {
                "root": root,
                "order": len(component),
                "alpha": alpha_i,
                "c": c_i,
                "d": d_i,
                "critical": d_i == c_i,
                "E_min_degree": next(i for i, v in enumerate(e_i) if v),
                "Z_min_degree": next(i for i, v in enumerate(z_i) if v),
            }
        )

    f_hat = (1,)
    e = (1,)
    for e_i, z_i in factors:
        f_hat = mul(f_hat, add(e_i, z_i))
        e = mul(e, e_i)
    t = sum(item["critical"] for item in branch_data)
    h_hat_shifted = shift(reciprocal_at(h, beta - t), t)
    assert f_hat == reciprocal_at(f, beta)
    assert e == h_hat_shifted

    j = add(mul((1, 1), f_hat), e)
    direct = (
        3 * coeff(f, r + 1)
        + 2 * coeff(f, r)
        - coeff(f, r - 1)
        + 3 * coeff(h, r)
        - coeff(h, r - 1)
    )
    tensor = 3 * coeff(j, a) - coeff(j, a + 1)
    assert direct == tensor

    record = {
        "order_T": len(g),
        "p": p,
        "beta": beta,
        "r": r,
        "a": a,
        "critical_count": t,
        "alpha_H": len(h) - 1,
        "branch_data": branch_data,
        "j_a": coeff(j, a),
        "j_a_plus_1": coeff(j, a + 1),
        "boundary_margin": direct,
        "identity_holds": direct == tensor,
    }
    if include_channels and len(factors) <= 16:
        channel_margins = []
        for mask in range(1 << len(factors)):
            channel = (1,)
            for i, (e_i, z_i) in enumerate(factors):
                channel = mul(channel, z_i if (mask >> i) & 1 else e_i)
            channel = mul((1, 1), channel)
            if mask == 0:
                channel = add(channel, e)
            channel_margins.append(
                {
                    "root_mask": mask,
                    "selected_root_count": mask.bit_count(),
                    "j_a": coeff(channel, a),
                    "j_a_plus_1": coeff(channel, a + 1),
                    "margin": 3 * coeff(channel, a) - coeff(channel, a + 1),
                }
            )
        assert sum(item["margin"] for item in channel_margins) == direct
        record["labelled_channels"] = channel_margins
    return record


def make_route_witness() -> tuple[nx.Graph, int]:
    g = nx.Graph()
    center = 0
    g.add_node(center)
    for branch in range(17):
        support = 1 + 3 * branch
        g.add_edges_from(
            [(center, support), (support, support + 1), (support, support + 2)]
        )
    isolates = list(range(52, 55))
    g.add_nodes_from(isolates)
    p = 55
    g.add_edges_from((p, v) for v in [center, *isolates])
    assert len(g) == 56
    return g, p


def eligible(g: nx.Graph, p: int) -> bool:
    f = forest_poly(g, set(g) - {p})
    full = forest_poly(g, set(g))
    beta = len(f) - 1
    return len(full) - 1 == beta and beta % 3 in (1, 2)


def update_extrema(summary: dict, item: dict, tag: dict) -> None:
    ja = item["j_a"]
    jap = item["j_a_plus_1"]
    ratio = jap / ja if ja else float("inf")
    if summary["largest_ratio"] is None or ratio > summary["largest_ratio"]["ratio"]:
        summary["largest_ratio"] = {**tag, "ratio": ratio, **item}
    if summary["smallest_margin"] is None or item["boundary_margin"] < summary["smallest_margin"]["boundary_margin"]:
        summary["smallest_margin"] = {**tag, **item}
    if item["boundary_margin"] < 0 and summary["first_boundary_failure"] is None:
        summary["first_boundary_failure"] = {**tag, **item}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=13)
    parser.add_argument("--random-samples", type=int, default=1000)
    parser.add_argument("--random-max-order", type=int, default=100)
    parser.add_argument("--product-samples", type=int, default=20000)
    parser.add_argument("--branch-catalog-max-order", type=int, default=9)
    parser.add_argument("--seed", type=int, default=993_081_311)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("boundary_sm3_tensor_compensation_exact_20260813.json"),
    )
    args = parser.parse_args()

    witness_graph, witness_p = make_route_witness()
    witness = tensor_record(witness_graph, witness_p, include_channels=True)
    assert witness["beta"] == 38 and witness["r"] == 25 and witness["a"] == 13
    assert witness["boundary_margin"] == 57_086_629_816

    exhaustive = {
        "trees": 0,
        "vertex_setups": 0,
        "eligible_exceptional_setups": 0,
        "identity_failures": 0,
        "first_boundary_failure": None,
        "smallest_margin": None,
        "largest_ratio": None,
        "negative_labelled_channels": 0,
        "negative_nonempty_labelled_channels": 0,
        "first_negative_labelled_channel": None,
        "first_negative_nonempty_labelled_channel": None,
    }
    for n in range(2, args.max_order + 1):
        for tree_index, g in enumerate(nx.nonisomorphic_trees(n)):
            exhaustive["trees"] += 1
            for p in g:
                exhaustive["vertex_setups"] += 1
                if not eligible(g, p):
                    continue
                exhaustive["eligible_exceptional_setups"] += 1
                item = tensor_record(g, p, include_channels=True)
                if not item["identity_holds"]:
                    exhaustive["identity_failures"] += 1
                update_extrema(exhaustive, item, {"n": n, "tree_index": tree_index, "p": p})
                for channel in item["labelled_channels"]:
                    if channel["margin"] < 0:
                        exhaustive["negative_labelled_channels"] += 1
                        if exhaustive["first_negative_labelled_channel"] is None:
                            exhaustive["first_negative_labelled_channel"] = {
                                "n": n,
                                "tree_index": tree_index,
                                "p": p,
                                "edges": sorted([u, v] for u, v in g.edges()),
                                **channel,
                            }
                        if channel["root_mask"]:
                            exhaustive["negative_nonempty_labelled_channels"] += 1
                            if exhaustive["first_negative_nonempty_labelled_channel"] is None:
                                exhaustive["first_negative_nonempty_labelled_channel"] = {
                                    "n": n,
                                    "tree_index": tree_index,
                                    "p": p,
                                    "edges": sorted([u, v] for u, v in g.edges()),
                                    **channel,
                                }

    rng = random.Random(args.seed)
    random_summary = {
        "samples_requested": args.random_samples,
        "eligible_exceptional_setups": 0,
        "identity_failures": 0,
        "first_boundary_failure": None,
        "smallest_margin": None,
        "largest_ratio": None,
    }
    for sample in range(args.random_samples):
        n = rng.randint(max(2, args.max_order + 1), args.random_max_order)
        g = nx.from_prufer_sequence([rng.randrange(n) for _ in range(n - 2)])
        for p in rng.sample(list(g), min(n, 8)):
            if not eligible(g, p):
                continue
            random_summary["eligible_exceptional_setups"] += 1
            item = tensor_record(g, p)
            if not item["identity_holds"]:
                random_summary["identity_failures"] += 1
            update_extrema(random_summary, item, {"sample": sample, "n": n, "p": p})

    # Directly stress arbitrary products of rooted branch states, rather than
    # relying on the degree distribution around a random vertex of one tree.
    catalog_map: dict[tuple[Poly, Poly, bool, int], dict] = {}
    for n in range(1, args.branch_catalog_max_order + 1):
        trees = [nx.empty_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        for tree_index, g in enumerate(trees):
            for root in g:
                nodes = set(g)
                c_poly = forest_poly(g, nodes - {root})
                d_poly = forest_poly(g, nodes - {root} - set(g[root]))
                b_poly = add(c_poly, shift(d_poly))
                alpha_i = len(b_poly) - 1
                critical = len(d_poly) - 1 == len(c_poly) - 1
                key = (
                    reciprocal_at(c_poly, alpha_i),
                    reciprocal_at(d_poly, alpha_i - 1),
                    critical,
                    alpha_i,
                )
                catalog_map.setdefault(
                    key,
                    {"order": n, "tree_index": tree_index, "root": root},
                )
    catalog = list(catalog_map)
    products = {
        "samples_requested": args.product_samples,
        "distinct_rooted_states": len(catalog),
        "eligible_exceptional_products": 0,
        "first_boundary_failure": None,
        "smallest_margin": None,
        "largest_ratio": None,
    }
    for sample in range(args.product_samples):
        count = rng.randint(1, 20)
        indices = [rng.randrange(len(catalog)) for _ in range(count)]
        chosen = [catalog[index] for index in indices]
        beta = sum(state[3] for state in chosen)
        t = sum(state[2] for state in chosen)
        if t == 0 or beta % 3 not in (1, 2):
            continue
        products["eligible_exceptional_products"] += 1
        a = beta - 2 * beta // 3
        f_hat = (1,)
        e = (1,)
        for e_i, z_i, _, _ in chosen:
            f_hat = mul(f_hat, add(e_i, z_i))
            e = mul(e, e_i)
        j = add(mul((1, 1), f_hat), e)
        ja, jap = coeff(j, a), coeff(j, a + 1)
        item = {
            "sample": sample,
            "factor_count": count,
            "beta": beta,
            "a": a,
            "critical_count": t,
            "j_a": ja,
            "j_a_plus_1": jap,
            "boundary_margin": 3 * ja - jap,
            "catalog_indices": indices,
        }
        ratio = jap / ja if ja else float("inf")
        if products["largest_ratio"] is None or ratio > products["largest_ratio"]["ratio"]:
            products["largest_ratio"] = {"ratio": ratio, **item}
        if products["smallest_margin"] is None or item["boundary_margin"] < products["smallest_margin"]["boundary_margin"]:
            products["smallest_margin"] = item
        if item["boundary_margin"] < 0 and products["first_boundary_failure"] is None:
            products["first_boundary_failure"] = item

    products["catalog_sha256"] = hashlib.sha256(
        json.dumps(
            [
                {
                    "E": list(key[0]),
                    "Z": list(key[1]),
                    "critical": key[2],
                    "alpha": key[3],
                    **catalog_map[key],
                }
                for key in catalog
            ],
            separators=(",", ":"),
        ).encode("ascii")
    ).hexdigest()

    failure = (
        exhaustive["first_boundary_failure"]
        or random_summary["first_boundary_failure"]
        or products["first_boundary_failure"]
    )
    report = {
        "status": "BOUNDARY_COUNTEREXAMPLE_FOUND" if failure else "PASS_IDENTITY_AND_BOUNDED_AUDIT_NOT_PROOF",
        "theorem": {
            "definitions": {
                "F_hat": "x^beta F(1/x)=product_i(E_i+Z_i)",
                "E": "product_i E_i=x^t x^(beta-t) H(1/x)",
                "J": "(1+x)F_hat+E",
                "a": "beta-floor(2 beta/3)",
            },
            "identity": "D_(r+1)(F)+D_r(F)+D_r(H)=3[x^a]J-[x^(a+1)]J",
        },
        "route_witness_57_vertex_G_uses_56_vertex_T": witness,
        "exhaustive": exhaustive,
        "random": random_summary,
        "random_rooted_branch_products": products,
    }
    encoded = json.dumps(report, indent=2) + "\n"
    args.output.write_text(encoded, encoding="utf-8")
    print(encoded, end="")
    print("report_sha256", hashlib.sha256(encoded.encode("utf-8")).hexdigest())
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
