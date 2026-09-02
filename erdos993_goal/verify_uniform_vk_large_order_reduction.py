#!/usr/bin/env python3
"""Replay the uniform large-order V_k reduction for forests.

The all-order proof is combinatorial and symbolic.  The small-forest audit
explicitly constructs its injection; it is a sanity replay, not the reason
the theorem holds at unbounded order.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx
import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "uniform_vk_large_order_reduction_exact_20260816.json"
EXPECTED_UNLABELED_FORESTS = (1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def symbolic_replay() -> None:
    """Independently replay the Q/V identity, moment form, and threshold."""
    k = sp.symbols("k", integer=True, positive=True)
    pm1, p0, pp1 = sp.symbols("pminus pone pplus", nonzero=True)
    bm2, bm1, b0, cm1 = sp.symbols("bminus2 bminus1 bzero cminus1", nonzero=True)

    def h(j: sp.Expr, left: sp.Expr, middle: sp.Expr,
          right: sp.Expr) -> sp.Expr:
        return (j**2 * (middle**2 - left * right) / left
                + j * (middle - right))

    q = 2 * k * p0**2 - pm1 * p0 - 2 * (k + 1) * pm1 * pp1
    vpoly = ((k + 2) * bm2 * bm1 + k * (2 * k + 1) * bm2 * b0
             - 2 * (k - 1)**2 * bm1**2)
    pendant_middle = b0 + bm1 + cm1
    lhs = h(k, pm1, pendant_middle, pp1) - h(k - 1, bm2, bm1, b0)
    rhs = (k * q.subs(p0, pendant_middle) / (2 * pm1)
           + 3 * k * cm1 / 2 + vpoly / (2 * bm2))
    assert sp.factor(lhs - rhs) == 0

    u, w = sp.symbols("u w", positive=True)
    normalized = sp.factor(vpoly.subs({bm1: u * bm2 / (k - 1),
                                       b0: w * bm1 / k}, simultaneous=True)
                           / (bm2 * bm1))
    normalized = sp.factor(normalized.subs(bm1, u * bm2 / (k - 1)))
    assert sp.factor(normalized - ((k + 2) + (2 * k + 1) * w
                                   - 2 * (k - 1) * u)) == 0

    # For a uniform independent (k-2)-set, X is the residual order and C
    # the residual component count.  If Var(X)=sigma2, then
    # u*w=E[X^2-3X+2C].
    sigma2, cbar = sp.symbols("sigma2 cbar", nonnegative=True)
    moment_w = (u**2 + sigma2 - 3 * u + 2 * cbar) / u
    moment_form = sp.factor(
        ((k + 2) + (2 * k + 1) * moment_w - 2 * (k - 1) * u)
        - (3 * u - (5 * k + 1)
           + (2 * k + 1) * (sigma2 + 2 * cbar) / u))
    assert moment_form == 0

    # The exact transfer D=Var(X)+2E[C]>=2 gives the sign polynomial.
    lower = 3 * u - (5 * k + 1) + (4 * k + 2) / u
    p = sp.factor(u * lower)
    assert sp.expand(p - (3 * u**2 - (5 * k + 1) * u + 4 * k + 2)) == 0
    assert sp.discriminant(p, u) == 25 * k**2 - 38 * k - 23
    rational_endpoint = (5 * k - 1) / 3
    assert sp.factor(p.subs(u, rational_endpoint) - 2 * (k + 4) / 3) == 0
    assert sp.factor(sp.diff(p, u).subs(u, rational_endpoint) - (5 * k - 3)) == 0


def tree_catalog(max_order: int) -> list[tuple[int, nx.Graph]]:
    types: list[tuple[int, nx.Graph]] = []
    types.append((1, nx.empty_graph(1)))
    for order in range(2, max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            types.append((order, nx.convert_node_labels_to_integers(tree)))
    return types


def forests_of_order(order: int, types: list[tuple[int, nx.Graph]]):
    if order == 0:
        yield nx.empty_graph(0)
        return

    chosen: list[nx.Graph] = []

    def visit(remaining: int, first: int):
        if remaining == 0:
            yield nx.disjoint_union_all(chosen)
            return
        for index in range(first, len(types)):
            component_order, graph = types[index]
            if component_order > remaining:
                continue
            chosen.append(graph)
            yield from visit(remaining - component_order, index)
            chosen.pop()

    yield from visit(order, 0)


def independent_layers(graph: nx.Graph) -> list[list[int]]:
    n = graph.number_of_nodes()
    edge_masks = [(1 << u) | (1 << v) for u, v in graph.edges]
    layers: list[list[int]] = [[] for _ in range(n + 1)]
    for mask in range(1 << n):
        if all(mask & edge != edge for edge in edge_masks):
            layers[mask.bit_count()].append(mask)
    return layers


def rooted_orientation(graph: nx.Graph, roots: list[int]) -> tuple[list[int], list[list[int]]]:
    n = graph.number_of_nodes()
    parent = [-2] * n
    children = [[] for _ in range(n)]
    for root in roots:
        parent[root] = -1
        queue = [root]
        for v in queue:
            for w in sorted(graph.neighbors(v)):
                if parent[w] == -2:
                    parent[w] = v
                    children[v].append(w)
                    queue.append(w)
    assert all(value != -2 for value in parent)
    return parent, children


def audit_injection(graph: nx.Graph, layers: list[list[int]], size: int) -> dict[str, int]:
    """Construct the downward-to-upward incidence injection literally."""
    n = graph.number_of_nodes()
    masks = layers[size]
    counts = [sum((mask >> v) & 1 for mask in masks) for v in range(n)]
    roots = []
    for component in nx.connected_components(graph):
        roots.append(max(component, key=lambda v: (counts[v], -v)))
    parent, children = rooted_orientation(graph, roots)

    upward_targets = set()
    upward = 0
    downward = 0
    boundary = 0
    neighbor_sum = 0
    available_sum = 0
    residual_second_sum = 0
    root_selected = 0

    neighbor_masks = [sum(1 << w for w in graph.neighbors(v)) for v in range(n)]
    full = (1 << n) - 1
    for mask in masks:
        root_selected += sum((mask >> root) & 1 for root in roots)
        selected_degree = sum(graph.degree(v) for v in range(n) if (mask >> v) & 1)
        boundary += selected_degree
        neighborhood = 0
        for v in range(n):
            if (mask >> v) & 1:
                neighborhood |= neighbor_masks[v]
        neighborhood &= ~mask
        neighbor_sum += neighborhood.bit_count()
        residual = full & ~mask & ~neighborhood
        r = residual.bit_count()
        available_sum += r
        residual_graph = graph.subgraph([v for v in range(n) if (residual >> v) & 1])
        components = nx.number_connected_components(residual_graph) if r else 0
        residual_second_sum += r * r - 3 * r + 2 * components

        for child, p in enumerate(parent):
            if p >= 0 and ((mask >> child) & 1):
                upward += 1
                upward_targets.add((mask, child, p))

    images: dict[tuple[int, int, int], tuple[int, int, int]] = {}
    for mask in masks:
        for p in range(n):
            if not ((mask >> p) & 1):
                continue
            for child in children[p]:
                downward += 1
                selected_children = [w for w in children[child] if (mask >> w) & 1]
                source = (mask, p, child)
                if not selected_children:
                    target_mask = (mask & ~(1 << p)) | (1 << child)
                    target = (target_mask, child, p)
                else:
                    chosen = min(selected_children)
                    target = (mask, chosen, child)
                assert target in upward_targets
                assert target not in images
                images[target] = source

    assert downward == len(images) <= upward
    assert boundary <= 2 * upward
    assert upward == size * len(masks) - root_selected
    assert neighbor_sum <= boundary
    # The maximizing root in each component has total inclusion count at
    # least size*i_s/n (the weaker common-denominator form is enough).
    assert root_selected * n >= size * len(masks)
    assert available_sum * n >= len(masks) * (
        n * (n - 3 * size) + 2 * size)
    if size + 1 < len(layers):
        assert available_sum == (size + 1) * len(layers[size + 1])
    if size + 2 < len(layers):
        assert residual_second_sum == ((size + 1) * (size + 2)
                                       * len(layers[size + 2]))

    return {
        "states": len(masks),
        "upward": upward,
        "downward": downward,
        "boundary": boundary,
    }


def v_value(coefficients: list[int], k: int) -> int:
    bm2, bm1, b0 = coefficients[k - 2:k + 1]
    return ((k + 2) * bm2 * bm1 + k * (2 * k + 1) * bm2 * b0
            - 2 * (k - 1)**2 * bm1**2)


def exact_cutoff(k: int) -> int:
    """First eligible order where n-3(k-2)+2(k-2)/n reaches rho_k."""
    vertex = Fraction(5 * k + 1, 6)
    for n in range(2 * k - 2, 10 * k + 1):
        lower = Fraction(n - 3 * k + 6, 1) + Fraction(2 * (k - 2), n)
        polynomial = 3 * lower * lower - (5 * k + 1) * lower + 4 * k + 2
        if lower >= vertex and polynomial >= 0:
            return n
    raise AssertionError("cutoff search range was unexpectedly insufficient")


def finite_sanity(max_order: int = 10) -> dict[str, object]:
    types = tree_catalog(max_order)
    counts = []
    forests = 0
    states = 0
    incidence_sources = 0
    incidence_targets = 0
    vk_checks = 0
    minimum_vk = None

    for order in range(max_order + 1):
        count = 0
        for graph in forests_of_order(order, types):
            count += 1
            forests += 1
            layers = independent_layers(graph)
            coefficients = [len(layer) for layer in layers]
            alpha = max((j for j, value in enumerate(coefficients) if value), default=0)
            for size, layer in enumerate(layers):
                if not layer:
                    continue
                result = audit_injection(graph, layers, size)
                states += result["states"]
                incidence_sources += result["downward"]
                incidence_targets += result["upward"]
            for k in range(2, (alpha + 2) // 2 + 1):
                if alpha < 2 * k - 2:
                    continue
                value = v_value(coefficients, k)
                assert value >= 0
                vk_checks += 1
                if minimum_vk is None or value < minimum_vk:
                    minimum_vk = value
        counts.append(count)
        assert count == EXPECTED_UNLABELED_FORESTS[order]

    return {
        "maximum_order": max_order,
        "unlabeled_forest_counts": counts,
        "forests": forests,
        "independent_set_states": states,
        "injection_sources": incidence_sources,
        "upward_targets": incidence_targets,
        "eligible_Vk_checks": vk_checks,
        "minimum_Vk": minimum_vk,
    }


def main() -> int:
    symbolic_replay()
    sanity = finite_sanity()
    cutoffs = {str(k): exact_cutoff(k) for k in range(2, 101)}
    report = {
        "status": "PASS_EXACT_UNIFORM_VK_LARGE_ORDER_REDUCTION",
        "theorems": {
            "selected_degree": "E[sum_{v in S} degree(v)] <= 2s",
            "extension_mean": "mu_s >= n-3s+2s/n",
            "moment_identity": (
                "V_k/(b_(k-2)b_(k-1)) = 3u-(5k+1)"
                "+(2k+1)(Var(X)+2E[C])/u"),
            "large_order": (
                "V_k>=0 once n-3k+6+2(k-2)/n reaches rho_k"),
        },
        "exact_cutoffs_k2_through_k100": cutoffs,
        "simple_radical_cutoff": (
            "n >= 3k-6+ceil(((5k+1)+sqrt(25k^2-38k-23))/6)"),
        "finite_sanity": sanity,
        "inputs": {
            "general_qv_note_sha256": sha256(ROOT / "GENERAL_PGC_QV_DECOMPOSITION_2026-08-16.md"),
            "general_qv_replay_sha256": sha256(ROOT / "verify_general_pgc_qv_decomposition.py"),
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "finite_sanity": sanity,
        "cutoffs_k2_through_k12": {str(k): cutoffs[str(k)] for k in range(2, 13)},
        "report": REPORT.name,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
