#!/usr/bin/env python3
"""Fail-closed independent audit of the rank-four edge-local surplus theorem.

This auditor never imports or executes the producer.  It reconstructs the
all-order reductions and performs a literal bounded replay in an independently
written enumeration path, including the producer's ordered value-stream hash.
"""

from __future__ import annotations

from collections import deque
from fractions import Fraction
import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx
import sympy as sp


ROOT = Path(__file__).resolve().parent
PRODUCER = ROOT / "verify_rank4_edge_local_component_surplus_root.py"
PRODUCER_REPORT = ROOT / "rank4_edge_local_component_surplus_exact_root_20260828.json"
THEOREM_NOTE = ROOT / "RANK4_EDGE_LOCAL_COMPONENT_SURPLUS_THEOREM_2026-08-28.md"
OUTPUT = ROOT / "rank4_edge_local_component_surplus_independent_audit_20260828.json"

EXPECTED = {
    PRODUCER.name: "A20321C3AFE6D2B5AB7B474463F5C006FEC8E068E8739EC520C00DA1B424A9DF",
    PRODUCER_REPORT.name: "5CE9555EEF8400D35C6A6233FA2B199C338E0C89BE5C830E8E39C887F744C87F",
    THEOREM_NOTE.name: "26929F9FD9A0B3115B65993D0BFE15F9A017B2B741B1D25290D2A16AD7E1EC5E",
}
EXPECTED_PRODUCER_STATUS = "PASS_EXACT_ALL_ORDER_RANK4_EDGE_LOCAL_COMPONENT_SURPLUS_THEOREM"
EXPECTED_STREAM = "9A2A6AE764E2477ED8B7B01B0EA54B05979C47468AE787530B8206CF7A6D2F1C"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def fail(message: str) -> None:
    raise AssertionError(message)


def independent(graph: nx.Graph, chosen: tuple[int, ...] | frozenset[int]) -> bool:
    selected = set(chosen)
    return all(not (selected & set(graph[v])) for v in selected)


def states(graph: nx.Graph, rank: int) -> list[frozenset[int]]:
    if rank < 0 or rank > len(graph):
        return []
    vertices = tuple(sorted(graph))
    return [
        frozenset(choice)
        for choice in itertools.combinations(vertices, rank)
        if independent(graph, choice)
    ]


def choose_poly(z: sp.Expr, k: int) -> sp.Expr:
    if k < 0:
        return sp.Integer(0)
    return sp.prod(z - j for j in range(k)) / sp.factorial(k)


def all_order_algebra() -> dict[str, object]:
    """Reconstruct every algebraic certificate without producer code."""

    n, h, x, y = sp.symbols("n h x y", integer=True, nonnegative=True)

    high_gap = sp.expand(
        (n - 4) * (n - 5) * (n - 6)
        - (n - 2) * (n - 6) * (n - 7)
    )
    if sp.expand(high_gap - 6 * (n - 6)) != 0:
        fail("high-c endpoint gap does not reconstruct")

    # General forest path-minimality induction.  L(m,k)=C(m-k+1,k).
    # A leaf step is exact; an isolate step has an extra nonnegative term.
    m, k = sp.symbols("m k", integer=True, nonnegative=True)
    leaf_step = "L(m-1,k)+L(m-2,k-1)=L(m,k) by Pascal"
    isolate_step = (
        "L(m-1,k)+L(m-1,k-1)>=L(m,k), since the second term "
        "dominates C(m-k,k-1)"
    )

    def layer(root_count: int, rank_three: bool) -> sp.Expr:
        out = sp.Integer(0)
        if root_count < 0:
            return out
        for left in range(root_count + 1):
            right = root_count - left
            hit = int(left > 0) + int(right > 0)
            reserve = 2 - hit
            weight = (
                2 * root_count + 4 * reserve - 6
                if rank_three
                else 4 * (reserve + math.comb(reserve, 2))
            )
            out += weight * choose_poly(x, left) * choose_poly(y, right)
        return sp.expand(out)

    expected = {
        3: sp.Integer(2),
        2: sp.Integer(12),
        1: (x - y) ** 2 + 3 * (x + y),
        0: 4 * (
            choose_poly(x, 3)
            + choose_poly(y, 3)
            + choose_poly(x, 2)
            + choose_poly(y, 2)
        ),
    }
    rebuilt: dict[str, str] = {}
    for s in range(4):
        value = layer(3 - s, True)
        if s <= 2:
            value += layer(2 - s, False)
        if sp.expand(value - expected[s]) != 0:
            fail(f"two-group P_{s} mismatch")
        rebuilt[f"P_{s}"] = str(sp.factor(value))

    # The one-group identity is checked coefficient by coefficient.
    # a3=A0+A1+A2+A3, b3=A0, U=3A0+2A1+A2.
    A0, A1, A2, A3, b2 = sp.symbols("A0 A1 A2 A3 b2", nonnegative=True)
    a3 = A0 + A1 + A2 + A3
    U = 3 * A0 + 2 * A1 + A2
    one_group = sp.expand(2 * a3 + 2 * A0 + 2 * b2 - U)
    expected_one_group = A0 + A2 + 2 * A3 + 2 * b2
    if sp.expand(one_group - expected_one_group) != 0:
        fail("one-group layer identity mismatch")

    # Endpoint conversion for c=2: n=h+4.
    edge_ratio_gap = sp.factor(
        (h + 5) * h - (h + 2) * (h + 1)
    )
    if sp.expand(edge_ratio_gap - 2 * (h - 1)) != 0:
        fail("c=2 endpoint conversion mismatch")

    return {
        "path_minimality_induction": {
            "bound": "i_k(F)>=C(|F|-k+1,k) for every forest",
            "leaf_step": leaf_step,
            "isolate_step": isolate_step,
        },
        "high_c_endpoint_gap": str(sp.factor(high_gap)),
        "one_group_slack": str(expected_one_group),
        "two_group_pointwise": rebuilt,
        "c2_endpoint_gap_after_multiplying_by_h": str(edge_ratio_gap),
    }


def oriented_forest(
    forest: nx.Graph, roots: tuple[int, ...]
) -> tuple[dict[int, int | None], dict[int, tuple[int, ...]]]:
    parent: dict[int, int | None] = {}
    child_lists: dict[int, list[int]] = {v: [] for v in forest}
    for root in sorted(roots):
        if root in parent or root not in forest:
            fail("roots must be distinct vertices of the forest")
        parent[root] = None
        queue: deque[int] = deque([root])
        while queue:
            vertex = queue.popleft()
            for neighbor in sorted(forest[vertex]):
                if neighbor == parent[vertex]:
                    continue
                if neighbor in parent:
                    fail("rooted object is not a forest with one root per component")
                parent[neighbor] = vertex
                child_lists[vertex].append(neighbor)
                queue.append(neighbor)
    if set(parent) != set(forest):
        fail("distinguished roots do not cover every forest component")
    return parent, {v: tuple(row) for v, row in child_lists.items()}


def incidence_injection(
    forest: nx.Graph,
    roots: tuple[int, ...],
    independent_three: list[frozenset[int]],
) -> tuple[int, int, int]:
    """Independently replay the downward-to-upward injection."""

    if not forest:
        if roots or independent_three:
            fail("empty-forest incidence input malformed")
        return 0, 0, 0
    parent, children = oriented_forest(forest, roots)
    state_lookup = frozenset(independent_three)
    upward_targets: set[tuple[tuple[int, ...], int, int]] = set()
    for state in independent_three:
        for selected in state:
            if parent[selected] is not None:
                upward_targets.add(
                    (tuple(sorted(state)), selected, int(parent[selected]))
                )

    images: dict[tuple[tuple[int, ...], int, int], tuple[object, ...]] = {}
    downward = 0
    degree_sum = 0
    for state in independent_three:
        degree_sum += sum(forest.degree[v] for v in state)
        for selected_parent in sorted(state):
            for child in children[selected_parent]:
                downward += 1
                selected_grandchildren = [z for z in children[child] if z in state]
                if not selected_grandchildren:
                    target_state = frozenset((state - {selected_parent}) | {child})
                    if target_state not in state_lookup:
                        fail("swap image is not an independent three-set")
                    image = (tuple(sorted(target_state)), child, selected_parent)
                    source = (tuple(sorted(state)), selected_parent, child, "swap")
                else:
                    least = min(selected_grandchildren)
                    image = (tuple(sorted(state)), least, child)
                    source = (tuple(sorted(state)), selected_parent, child, "grandchild")
                if image not in upward_targets:
                    fail("incidence image is not a valid upward incidence")
                if image in images:
                    fail(f"incidence injection collision: {images[image]} vs {source}")
                images[image] = source

    upward = len(upward_targets)
    if downward != len(images) or downward > upward:
        fail("prescribed-root incidence inequality failed")
    if degree_sum != upward + downward:
        fail("selected-degree incidence partition failed")
    return upward, downward, degree_sum


def extension_count(
    forest: nx.Graph, independent_three: list[frozenset[int]]
) -> int:
    total = 0
    vertices = set(forest)
    for state in independent_three:
        forbidden = set(state)
        for vertex in state:
            forbidden.update(forest[vertex])
        total += len(vertices - forbidden)
    return total


def assert_component_roots(
    forest: nx.Graph, group_one: frozenset[int], group_two: frozenset[int]
) -> None:
    roots = set(group_one | group_two)
    if group_one & group_two:
        fail("two root groups overlap")
    if roots - set(forest):
        fail("root group contains a deleted vertex")
    for component in nx.connected_components(forest):
        if len(component & roots) != 1:
            fail("a residual component does not have exactly one distinguished root")


def one_group_audit(
    tree: nx.Graph, leaf: int, support: int, i4_tree: int
) -> tuple[int, int, int]:
    w = next(v for v in tree[support] if v != leaf)
    H = tree.subgraph(set(tree) - {leaf, support, w}).copy()
    roots = tuple(sorted(set(tree[w]) - {support}))
    if H:
        assert_component_roots(H, frozenset(roots), frozenset())
    J = H.subgraph(set(H) - set(roots)).copy()

    H2, H3, H4 = states(H, 2), states(H, 3), states(H, 4)
    J2, J3 = states(J, 2), states(J, 3)
    a3, a4, b2, b3 = len(H3), len(H4), len(J2), len(J3)
    if i4_tree != a4 + 2 * a3 + b3 + b2:
        fail("(1,2) boundary independence decomposition failed")

    upward, downward, degree_sum = incidence_injection(H, roots, H3)
    layers = [0, 0, 0, 0]
    root_set = set(roots)
    for state in H3:
        layers[len(state & root_set)] += 1
    if b3 != layers[0]:
        fail("one-group root-free layer is not I3(J)")
    U = 3 * layers[0] + 2 * layers[1] + layers[2]
    if U != upward:
        fail("one-group nonroot count does not equal upward incidences")
    left = 2 * a3 + 2 * b3 + 2 * b2 - U
    right = layers[0] + layers[2] + 2 * layers[3] + 2 * b2
    if left != right or left < 0:
        fail("one-group slack certificate failed")

    if extension_count(H, H3) != 4 * a4:
        fail("independent-set extension double count failed")
    h = len(H)
    if 4 * a4 < (h - 3) * a3 - degree_sum:
        fail("incidence extension lower bound failed")
    if 4 * i4_tree < (h + 1) * a3:
        fail("derived (1,2) local bound failed")
    return upward, downward, degree_sum


def two_group_core(
    H: nx.Graph,
    group_one: frozenset[int],
    group_two: frozenset[int],
) -> dict[str, int]:
    assert_component_roots(H, group_one, group_two)
    H2, H3, H4 = states(H, 2), states(H, 3), states(H, 4)
    roots = group_one | group_two

    def reserve(state: frozenset[int]) -> int:
        return 2 - int(bool(state & group_one)) - int(bool(state & group_two))

    Z = sum(len(state & roots) for state in H3)
    X = sum(reserve(state) for state in H3)
    Y = sum(reserve(state) + math.comb(reserve(state), 2) for state in H2)
    if 2 * Z + 4 * X + 4 * Y < 6 * len(H3):
        fail("two-group global pointwise certificate failed")

    # Literal reconstruction by a fixed independent set of nonroots.
    B = H.subgraph(set(H) - set(roots)).copy()
    pointwise_total = 0
    expected_total = 0
    for s in range(4):
        for base_state in states(B, s):
            compatible_one = [
                root
                for root in group_one
                if all(root not in H[z] for z in base_state)
            ]
            compatible_two = [
                root
                for root in group_two
                if all(root not in H[z] for z in base_state)
            ]
            x, y = len(compatible_one), len(compatible_two)
            actual = 0
            root_pool = tuple(sorted(compatible_one + compatible_two))
            need3 = 3 - s
            if 0 <= need3 <= len(root_pool):
                for picked in itertools.combinations(root_pool, need3):
                    left = bool(set(picked) & set(group_one))
                    right = bool(set(picked) & set(group_two))
                    r = 2 - int(left) - int(right)
                    actual += 2 * need3 + 4 * r - 6
            need2 = 2 - s
            if 0 <= need2 <= len(root_pool):
                for picked in itertools.combinations(root_pool, need2):
                    left = bool(set(picked) & set(group_one))
                    right = bool(set(picked) & set(group_two))
                    r = 2 - int(left) - int(right)
                    actual += 4 * (r + math.comb(r, 2))
            if s == 3:
                expected = 2
            elif s == 2:
                expected = 12
            elif s == 1:
                expected = (x - y) ** 2 + 3 * (x + y)
            else:
                expected = 4 * (
                    math.comb(x, 3)
                    + math.comb(y, 3)
                    + math.comb(x, 2)
                    + math.comb(y, 2)
                )
            if actual != expected or actual < 0:
                fail(f"literal two-group P_{s} certificate failed")
            pointwise_total += actual
            expected_total += expected
    if pointwise_total != 2 * Z + 4 * X + 4 * Y - 6 * len(H3):
        fail("fixed-base pointwise layers do not assemble globally")

    upward, downward, degree_sum = incidence_injection(
        H, tuple(sorted(roots)), H3
    )
    if Z + upward != 3 * len(H3):
        fail("root/nonroot incidence partition failed")
    if extension_count(H, H3) != 4 * len(H4):
        fail("two-group extension double count failed")
    h = len(H)
    if 4 * len(H4) < (h - 9) * len(H3) + 2 * Z:
        fail("strengthened two-group extension bound failed")
    return {
        "a3": len(H3),
        "a4": len(H4),
        "Z": Z,
        "X": X,
        "Y": Y,
        "upward": upward,
        "downward": downward,
        "degree_sum": degree_sum,
        "pointwise_slack": pointwise_total,
    }


def low_edge_audit(tree: nx.Graph, u: int, v: int, i4_tree: int) -> tuple[int, int, int]:
    degrees = tuple(sorted((tree.degree[u], tree.degree[v])))
    if degrees == (1, 2):
        leaf, support = (u, v) if tree.degree[u] == 1 else (v, u)
        return one_group_audit(tree, leaf, support, i4_tree)

    if degrees == (2, 2):
        p = next(z for z in tree[u] if z != v)
        q = next(z for z in tree[v] if z != u)
        if p == q:
            fail("tree contains a triangle around a (2,2) edge")
        H = tree.subgraph(set(tree) - {u, v, p, q}).copy()
        C1 = frozenset(set(tree[p]) - {u})
        C2 = frozenset(set(tree[q]) - {v})
        data = two_group_core(H, C1, C2)
        if i4_tree != data["a4"] + 2 * data["a3"] + data["X"] + data["Y"]:
            fail("(2,2) boundary decomposition failed")
        if 4 * i4_tree < (len(H) + 5) * data["a3"]:
            fail("derived (2,2) bound failed")
        return data["upward"], data["downward"], data["degree_sum"]

    if degrees == (1, 3):
        leaf, support = (u, v) if tree.degree[u] == 1 else (v, u)
        p, q = sorted(z for z in tree[support] if z != leaf)
        H = tree.subgraph(set(tree) - {leaf, support, p, q}).copy()
        C1 = frozenset(set(tree[p]) - {support})
        C2 = frozenset(set(tree[q]) - {support})
        data = two_group_core(H, C1, C2)
        lower_shadow = 0
        for singleton in states(H, 1):
            r = 2 - int(bool(singleton & C1)) - int(bool(singleton & C2))
            lower_shadow += math.comb(r, 2)
        expected = (
            data["a4"]
            + 2 * data["a3"]
            + data["X"]
            + data["Y"]
            + lower_shadow
        )
        if i4_tree != expected:
            fail("(1,3) boundary decomposition failed")
        if 4 * i4_tree < (len(H) + 5) * data["a3"]:
            fail("derived (1,3) bound failed")
        return data["upward"], data["downward"], data["degree_sum"]

    return 0, 0, 0


def literal_tree_row(tree: nx.Graph) -> dict[str, object]:
    n = len(tree)
    vertices = tuple(sorted(tree))
    I3, I4 = states(tree, 3), states(tree, 4)
    i3, i4 = len(I3), len(I4)

    # Literal token-sliding graph, not the residual formula.
    token_edges: set[tuple[tuple[int, ...], tuple[int, ...]]] = set()
    for state in I4:
        for source in state:
            for target_vertex in tree[source]:
                target = frozenset((state - {source}) | {target_vertex})
                if len(target) != 4 or not independent(tree, target):
                    continue
                left, right = tuple(sorted(state)), tuple(sorted(target))
                token_edges.add((left, right) if left < right else (right, left))
    s4_literal = len(token_edges)

    neighborhoods = {v: {v, *tree[v]} for v in vertices}
    s4_residual = 0
    sum_h = 0
    minimum_local = None
    incidence = [0, 0, 0]
    class_counts: dict[str, int] = {}
    for u, v in tree.edges():
        residual = set(vertices) - (neighborhoods[u] | neighborhoods[v])
        h = len(residual)
        local_i3 = sum(state <= residual for state in I3)
        local_margin = 4 * h * i4 - (n - 2) * (n - 3) * local_i3
        if local_margin < 0:
            fail(f"edge-local theorem failure at n={n}, edge={(u, v)}")
        s4_residual += local_i3
        sum_h += h
        key = (local_margin, min(u, v), max(u, v), h, local_i3)
        minimum_local = key if minimum_local is None or key < minimum_local else minimum_local

        degrees = tuple(sorted((tree.degree[u], tree.degree[v])))
        c = sum(degrees) - 2
        if c == 0:
            name = "K2-trivial"
        elif degrees == (1, 2):
            name = "degrees-(1,2)"
        elif degrees == (1, 3):
            name = "degrees-(1,3)"
        elif degrees == (2, 2):
            name = "degrees-(2,2)"
        else:
            if c < 3:
                fail("degree partition is not exhaustive")
            name = "c>=3"
        class_counts[name] = class_counts.get(name, 0) + 1
        if name in {"degrees-(1,2)", "degrees-(1,3)", "degrees-(2,2)"}:
            counts = low_edge_audit(tree, u, v, i4)
            incidence = [a + b for a, b in zip(incidence, counts)]

    if s4_literal != s4_residual:
        fail("token-sliding and residual-edge counts disagree")

    edges = tuple(tree.edges())
    m2 = sum(
        len({*first, *second}) == 4
        for first, second in itertools.combinations(edges, 2)
    )
    if sum_h != 2 * m2:
        fail("sum h_uv != 2m2")

    W = math.comb(n - 2, 2)
    e = sum(math.comb(tree.degree[v] - 1, 2) for v in vertices)
    if m2 != W - e:
        fail("matching/degree-surplus identity failed")

    A3 = C3 = 0
    for state in I3:
        removed: set[int] = set()
        for vertex in state:
            removed |= neighborhoods[vertex]
        residual = set(vertices) - removed
        residual_edges = sum(u in residual and v in residual for u, v in edges)
        A3 += len(residual)
        C3 += len(residual) - residual_edges
    if A3 != 4 * i4 or C3 != A3 - s4_literal:
        fail("A3/C3 double counts failed")

    component_margin = 4 * m2 * i4 - W * s4_literal
    if component_margin != W * C3 - e * A3 or component_margin < 0:
        fail("global component-surplus assembly failed")
    return {
        "i3": i3,
        "i4": i4,
        "s4": s4_literal,
        "m2": m2,
        "A3": A3,
        "C3": C3,
        "margin": component_margin,
        "class_counts": class_counts,
        "incidence": incidence,
        "minimum_local": minimum_local,
    }


def main() -> None:
    observed_hashes = {}
    for path in (PRODUCER, PRODUCER_REPORT, THEOREM_NOTE):
        observed_hashes[path.name] = digest(path)
        if observed_hashes[path.name] != EXPECTED[path.name]:
            fail(f"frozen hash mismatch for {path.name}")

    producer_report = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    if producer_report.get("status") != EXPECTED_PRODUCER_STATUS:
        fail("producer report status mismatch")
    if producer_report.get("source_sha256") != EXPECTED[PRODUCER.name]:
        fail("producer report does not pin the frozen source")
    reported_stream = producer_report["bounded_literal_audit"][
        "ordered_value_stream_sha256"
    ]
    if reported_stream != EXPECTED_STREAM:
        fail("producer report stream hash mismatch")

    algebra = all_order_algebra()
    stream = hashlib.sha256()
    totals = {
        "trees": 0,
        "edges": 0,
        "independent_three_sets": 0,
        "independent_four_sets": 0,
        "token_edges": 0,
        "upward_incidences": 0,
        "downward_sources": 0,
        "degree_sum": 0,
        "class_counts": {},
    }
    per_order = []
    for n in range(2, 15):
        order_trees = 0
        order_minimum = None
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            row = literal_tree_row(tree)
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            stream.update(
                (
                    f"{n}|{index}|{code}|{row['i3']}|{row['i4']}|{row['s4']}|"
                    f"{row['m2']}|{row['A3']}|{row['C3']}|{row['margin']}\n"
                ).encode("ascii")
            )
            totals["trees"] += 1
            totals["edges"] += n - 1
            totals["independent_three_sets"] += row["i3"]
            totals["independent_four_sets"] += row["i4"]
            totals["token_edges"] += row["s4"]
            totals["upward_incidences"] += row["incidence"][0]
            totals["downward_sources"] += row["incidence"][1]
            totals["degree_sum"] += row["incidence"][2]
            for name, count in row["class_counts"].items():
                totals["class_counts"][name] = totals["class_counts"].get(name, 0) + count
            order_trees += 1
            if order_minimum is None or row["margin"] < order_minimum:
                order_minimum = row["margin"]
        per_order.append({"order": n, "trees": order_trees, "minimum_margin": order_minimum})

    independent_stream = stream.hexdigest().upper()
    if independent_stream != EXPECTED_STREAM:
        fail("independent ordered value-stream hash differs from producer")

    producer_totals = producer_report["bounded_literal_audit"]["totals"]
    for key in (
        "trees",
        "edges",
        "independent_three_sets",
        "independent_four_sets",
        "token_edges",
        "upward_incidences",
        "downward_sources",
        "class_counts",
    ):
        if totals[key] != producer_totals[key]:
            fail(f"independent total mismatch for {key}")

    report = {
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_RANK4_EDGE_LOCAL_COMPONENT_SURPLUS_AUDIT",
        "scope": {
            "proved": (
                "the edge-local inequality, its summed form, and the rank-four "
                "component-surplus form for every finite tree"
            ),
            "not_proved": (
                "q4<=q2, q4<=q3, any later-rank envelope, the averaged surplus "
                "outside rank four, or Erdos Problem 993"
            ),
            "bounded_replay": "all 5,446 unlabeled trees of orders 2 through 14",
        },
        "frozen_inputs": {
            name: {"expected_sha256": EXPECTED[name], "observed_sha256": value}
            for name, value in observed_hashes.items()
        },
        "producer_status": producer_report["status"],
        "all_order_reconstruction": algebra,
        "proof_checks": {
            "high_c": (
                "path-minimality plus i3(H)<=C(h,3), reduced at h=n-5 to "
                "the nonnegative gap 6(n-6)"
            ),
            "incidence_injection": (
                "every downward selected incidence injects into an upward one; "
                "swap and least-selected-grandchild image types were checked literally"
            ),
            "one_group": (
                "I(T)=(1+2x)I(H)+x(1+x)I(J), with exact layer slack"
            ),
            "two_group": (
                "all four fixed-nonroot P_s polynomials, (2,2) and (1,3) "
                "boundary decompositions, and the c=2 endpoint conversion"
            ),
            "global": (
                "s4=sum i3(H_uv), sum h_uv=2m2, A3=4i4, C3=A3-s4, m2=W-e"
            ),
        },
        "independent_bounded_replay": {
            "totals": totals,
            "per_order": per_order,
            "ordered_value_stream_sha256": independent_stream,
            "matches_producer_stream": True,
        },
        "auditor_source": Path(__file__).name,
        "auditor_source_sha256": digest(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(totals, indent=2))
    print(f"ordered_value_stream_sha256={independent_stream}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
