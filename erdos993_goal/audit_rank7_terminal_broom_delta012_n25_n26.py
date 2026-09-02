#!/usr/bin/env python3
"""Read-only independent audit of the rank-7 n=25,26 Delta0..2 census."""

from __future__ import annotations

import ast
import hashlib
import json
from math import comb
from pathlib import Path
import re

import networkx as nx


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "verify_rank7_terminal_broom_delta012_order.rs"
BASE = ROOT / "verify_rank7_terminal_broom_finite.rs"
EXE = ROOT / "verify_rank7_terminal_broom_delta012_order.exe"
REPLAY_DRIVER = ROOT / "replay_rank7_terminal_broom_delta012_n25_n26.py"
REPLAY_REPORT = ROOT / "rank7_terminal_broom_delta012_n25_n26_replay_exact_20260820.json"
OUTPUT = ROOT / "rank7_terminal_broom_delta012_n25_n26_independent_audit_exact_20260820.json"

EXPECTED = {
    25: {
        "trees": 104_636_890,
        "roots": 2_615_922_250,
        "minima": [
            40_079_227_531_443_480_576,
            95_833_838_568_014_483_328,
            100_028_493_760_894_175_232,
        ],
        "witness_root": 12,
        "witness_layout": list(range(13)) + list(range(1, 13)),
        "core_coefficients": [1, 25, 276, 1771, 7315, 20349, 38760, 50388, 43758],
        "deleted_coefficients": [1, 24, 253, 1540, 5985, 15504, 27132, 31824, 24310],
    },
    26: {
        "trees": 279_793_450,
        "roots": 7_274_629_700,
        "minima": [
            141_840_573_592_847_576_832,
            326_582_303_022_127_914_048,
            317_724_778_374_779_054_160,
        ],
        "witness_root": 13,
        "witness_layout": list(range(14)) + list(range(1, 13)),
        "core_coefficients": [1, 26, 300, 2024, 8855, 26334, 54264, 77520, 75582],
        "deleted_coefficients": [1, 25, 276, 1771, 7315, 20349, 38760, 50388, 43758],
    },
}

ROW = re.compile(
    r"^core_n=(?P<n>\d+) trees=(?P<trees>\d+) roots=(?P<roots>\d+) "
    r"eligible_roots=(?P<eligible>\d+) Delta0_2_minima=(?P<minima>\[[^\n]+?\]) "
    r"witness_roots=(?P<witness_roots>\[[^\n]+?\]) "
    r"witness_layouts=(?P<witness_layouts>\[.*\])$"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rooted_tree_counts(limit: int) -> list[int]:
    # Coefficients of T=x*exp(sum_{k>=1} T(x^k)/k).
    rooted = [0] * (limit + 1)
    rooted[1] = 1
    for n in range(2, limit + 1):
        numerator = 0
        for k in range(1, n):
            divisor_sum = sum(
                divisor * rooted[divisor]
                for divisor in range(1, k + 1)
                if k % divisor == 0
            )
            numerator += divisor_sum * rooted[n - k]
        assert numerator % (n - 1) == 0
        rooted[n] = numerator // (n - 1)
    return rooted


def free_tree_counts(limit: int) -> list[int]:
    # Otter dissymmetry: U=T-(T^2-T(x^2))/2.
    rooted = rooted_tree_counts(limit)
    free = [0] * (limit + 1)
    for n in range(1, limit + 1):
        convolution = sum(rooted[k] * rooted[n - k] for k in range(1, n))
        diagonal = rooted[n // 2] if n % 2 == 0 else 0
        assert (convolution - diagonal) % 2 == 0
        free[n] = rooted[n] - (convolution - diagonal) // 2
    return free


def split_tree(layout: list[int]) -> tuple[list[int], list[int]]:
    seen = False
    split = len(layout)
    for index, level in enumerate(layout):
        if level == 1:
            if seen:
                split = index
                break
            seen = True
    left = [level - 1 for level in layout[1:split]]
    rest = [0] + layout[split:]
    return left, rest


def next_rooted(layout: list[int], specified: int | None = None) -> list[int] | None:
    if specified is None:
        p = len(layout) - 1
        while layout[p] == 1:
            p -= 1
    else:
        p = specified
    if p == 0:
        return None
    q = p - 1
    while layout[q] != layout[p] - 1:
        q -= 1
    result = layout.copy()
    for index in range(p, len(result)):
        result[index] = result[index - p + q]
    return result


def next_tree(layout: list[int]) -> list[int] | None:
    left, rest = split_tree(layout)
    left_height = max(left)
    right_height = max(rest)
    valid = (
        right_height > left_height
        or (
            right_height == left_height
            and (len(left) < len(rest) or (len(left) == len(rest) and left <= rest))
        )
    )
    if valid:
        return layout.copy()
    p = len(left)
    result = next_rooted(layout, p)
    if result is None:
        return None
    if layout[p] > 2:
        new_left, _ = split_tree(result)
        length = max(new_left) + 1
        start = len(result) - length
        for offset in range(length):
            result[start + offset] = offset + 1
    return result


def wrom_layouts(order: int) -> list[list[int]]:
    current: list[int] | None = list(range(order // 2 + 1)) + list(
        range(1, (order + 1) // 2)
    )
    accepted = []
    while current is not None:
        candidate = current
        current = next_tree(candidate)
        if current is None:
            break
        valid = current.copy()
        accepted.append(valid)
        current = next_rooted(valid)
    return accepted


def layout_graph(layout: list[int]) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(len(layout)))
    stack: list[int] = []
    for vertex, level in enumerate(layout):
        if stack:
            parent = stack[-1]
            while layout[parent] >= level:
                stack.pop()
                parent = stack[-1]
            graph.add_edge(vertex, parent)
        stack.append(vertex)
    assert nx.is_tree(graph)
    return graph


def audit_small_wrom() -> dict:
    atlas = nx.graph_atlas_g()
    rows = []
    for order in range(2, 8):
        generated = [layout_graph(layout) for layout in wrom_layouts(order)]
        reference = [graph for graph in atlas if len(graph) == order and nx.is_tree(graph)]
        assert len(generated) == len(reference)
        for index, graph in enumerate(generated):
            assert not any(nx.is_isomorphic(graph, other) for other in generated[:index])
            assert sum(nx.is_isomorphic(graph, other) for other in reference) == 1
        for graph in reference:
            assert sum(nx.is_isomorphic(graph, other) for other in generated) == 1
        rows.append({"order": order, "free_trees": len(generated), "atlas_exact_match": True})
    return {"orders": rows, "duplicates": 0, "omissions": 0}


def polynomial_add(left: list[int], right: list[int]) -> list[int]:
    return [a + b for a, b in zip(left, right)]


def polynomial_mul(left: list[int], right: list[int]) -> list[int]:
    result = [0] * 9
    for i, a in enumerate(left):
        for j, b in enumerate(right[: 9 - i]):
            result[i + j] += a * b
    return result


def tree_coefficients(graph: nx.Graph, root_vertex: int) -> tuple[list[int], list[int]]:
    def directed(vertex: int, parent: int | None) -> tuple[list[int], list[int]]:
        excluded = [1] + [0] * 8
        included = [0, 1] + [0] * 7
        for neighbor in graph[vertex]:
            if neighbor == parent:
                continue
            child_excluded, child_included = directed(neighbor, vertex)
            excluded = polynomial_mul(
                excluded, polynomial_add(child_excluded, child_included)
            )
            included = polynomial_mul(included, child_excluded)
        return excluded, included

    excluded, included = directed(root_vertex, None)
    return polynomial_add(excluded, included), excluded


def residual(core: list[int], deleted: list[int], t: int) -> int:
    def smooth(rank: int) -> int:
        return sum(comb(t, shift) * core[rank - shift] for shift in range(min(rank, t) + 1))

    p6 = smooth(6) + deleted[5]
    p7 = smooth(7) + deleted[6]
    p8_without_core = sum(
        comb(t, shift) * core[8 - shift] for shift in range(1, min(8, t) + 1)
    )
    return (
        7 * core[6] * deleted[5]
        * (14 * p7 * p7 - p6 * p7 - 16 * p6 * p8_without_core)
        - 7 * deleted[5] * p6 * (14 * core[7] * core[7] - core[6] * core[7])
        - 8 * core[6] * p6 * (12 * deleted[6] * deleted[6] - deleted[5] * deleted[6])
    )


def parse_log(path: Path, order: int) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2
    match = ROW.fullmatch(lines[0])
    assert match is not None
    values = match.groupdict()
    assert int(values["n"]) == order
    marker = f"PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA012_ALL_ROOTED_CORES_N{order}"
    assert lines[1] == marker
    return {
        "trees": int(values["trees"]),
        "roots": int(values["roots"]),
        "eligible_roots": int(values["eligible"]),
        "minima": ast.literal_eval(values["minima"]),
        "witness_roots": ast.literal_eval(values["witness_roots"]),
        "witness_layouts": ast.literal_eval(values["witness_layouts"]),
    }


def witness_audit(order: int, parsed: dict) -> dict:
    expected = EXPECTED[order]
    assert parsed["minima"] == expected["minima"]
    assert parsed["witness_roots"] == [expected["witness_root"]] * 3
    assert parsed["witness_layouts"] == [expected["witness_layout"]] * 3
    graph = layout_graph(expected["witness_layout"])
    root_vertex = expected["witness_root"]
    degrees = sorted(dict(graph.degree()).values())
    assert degrees == [1, 1] + [2] * (order - 2)
    assert graph.degree[root_vertex] == 1
    core, deleted = tree_coefficients(graph, root_vertex)
    assert core == expected["core_coefficients"]
    assert deleted == expected["deleted_coefficients"]
    assert core == [comb(order - rank + 1, rank) for rank in range(9)]
    assert deleted == [comb(order - rank, rank) for rank in range(9)]
    values = [residual(core, deleted, t) for t in (1, 2, 3)]
    differences = [values[0], values[1] - values[0], values[2] - 2 * values[1] + values[0]]
    assert differences == expected["minima"]
    return {
        "tree": f"P{order}",
        "root": "endpoint",
        "layout": expected["witness_layout"],
        "core_coefficients_i0_through_i8": core,
        "deleted_coefficients_i0_through_i8": deleted,
        "R1_R2_R3": values,
        "Delta0_Delta1_Delta2": differences,
    }


def overflow_bound(order: int) -> int:
    # Triangle-inequality bound using i_k(G)<=binom(|G|,k), t<=3.
    c6 = comb(order, 6)
    c7 = comb(order, 7)
    h5 = comb(order - 1, 5)
    h6 = comb(order - 1, 6)
    p6 = comb(order + 3, 6) + h5
    p7 = comb(order + 3, 7) + h6
    p8 = comb(order + 3, 8)
    return (
        7 * c6 * h5 * (14 * p7 * p7 + p6 * p7 + 16 * p6 * p8)
        + 7 * h5 * p6 * (14 * c7 * c7 + c6 * c7)
        + 8 * c6 * p6 * (12 * h6 * h6 + h5 * h6)
    )


def main() -> int:
    assert REPLAY_REPORT.is_file(), "fresh n26 replay report has not landed"
    free = free_tree_counts(26)
    assert free[25] == EXPECTED[25]["trees"]
    assert free[26] == EXPECTED[26]["trees"]
    small_wrom = audit_small_wrom()

    source_text = SOURCE.read_text(encoding="utf-8")
    required_source_fragments = (
        "let core = add(state.excluded, state.included);",
        "for vertex in 0..n",
        "let deleted = root(vertex, &adjacency, &mut memo).excluded;",
        "let values = [r1, r2 - r1, r3 - 2 * r2 + r1];",
        "if values[rank] < 0",
        "assert_eq!(trees, expected);",
        "assert_eq!(roots, expected * n as u64);",
    )
    assert all(fragment in source_text for fragment in required_source_fragments)

    replay_report = json.loads(REPLAY_REPORT.read_text(encoding="utf-8"))
    assert replay_report["status"] == (
        "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA012_N25_N26_FRESH_REPLAY"
    )
    assert replay_report["source_sha256"] == sha256(SOURCE)
    assert replay_report["base_source_sha256"] == sha256(BASE)
    assert replay_report["executable_sha256"] == sha256(EXE)

    rows = []
    for order in (25, 26):
        expected = EXPECTED[order]
        primary = ROOT / f"rank7_terminal_broom_delta012_n{order}_exact_20260820.log"
        replay = ROOT / f"rank7_terminal_broom_delta012_n{order}_fresh_replay_20260820.log"
        assert primary.read_bytes() == replay.read_bytes()
        parsed = parse_log(primary, order)
        assert parsed["trees"] == expected["trees"] == free[order]
        assert parsed["roots"] == expected["roots"] == expected["trees"] * order
        assert parsed["eligible_roots"] == parsed["roots"]
        assert all(value > 0 for value in parsed["minima"])
        replay_row = next(row for row in replay_report["orders"] if row["order"] == order)
        assert replay_row == {
            "order": order,
            "expected_free_trees": expected["trees"],
            "expected_roots": expected["roots"],
            "primary_log": primary.name,
            "primary_sha256": sha256(primary),
            "replay_log": replay.name,
            "replay_sha256": sha256(replay),
            "byte_identical": True,
        }
        bound = overflow_bound(order)
        assert bound < 2**127
        rows.append({
            "order": order,
            "free_trees": parsed["trees"],
            "all_root_checks": parsed["roots"],
            "eligible_root_checks": parsed["eligible_roots"],
            "minima": parsed["minima"],
            "witness": witness_audit(order, parsed),
            "primary_sha256": sha256(primary),
            "fresh_replay_sha256": sha256(replay),
            "byte_identical": True,
            "absolute_i128_intermediate_bound": bound,
            "i128_safe": True,
        })

    report = {
        "schema": "rank7-terminal-broom-delta012-n25-n26-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_RANK7_TERMINAL_BROOM_DELTA012_N25_N26_AUDIT",
        "scope": "every vertex of every free tree of orders 25 and 26",
        "coverage": {
            "independent_count_method": (
                "rooted-tree Euler recurrence plus Otter dissymmetry U=T-(T^2-T(x^2))/2"
            ),
            "free_tree_counts_1_through_26": free[1:],
            "small_order_WROM_vs_graph_atlas": small_wrom,
            "all_root_loop": True,
            "eligibility_no_gap": (
                "Every tree is bipartite, so alpha(T)>=ceil(n/2)>6 and "
                "alpha(T-p)>=ceil((n-1)/2)>5; hence c6 and h5 are positive "
                "for every checked root."
            ),
        },
        "coefficient_construction": {
            "core": "c_k=i_k(T) from exact excluded/included tree DP through k=8",
            "deleted": "h_k=i_k(T-p), equal to the excluded state when rooted at p",
            "p6": "sum_{l=0}^t binom(t,l)c_(6-l)+h5",
            "p7": "sum_{l=0}^t binom(t,l)c_(7-l)+h6",
            "p8_without_core": "sum_{l=1}^t binom(t,l)c_(8-l)",
            "newton_values": "Delta0=R1, Delta1=R2-R1, Delta2=R3-2R2+R1",
            "truncation_exact": (
                "Only c3..c7 and h5,h6 occur for t=1,2,3; degree-8 DP is sufficient."
            ),
        },
        "orders": rows,
        "hashes": {
            SOURCE.name: sha256(SOURCE),
            BASE.name: sha256(BASE),
            EXE.name: sha256(EXE),
            REPLAY_DRIVER.name: sha256(REPLAY_DRIVER),
            REPLAY_REPORT.name: sha256(REPLAY_REPORT),
            Path(__file__).name: sha256(Path(__file__)),
        },
        "scope_warning": (
            "This audits the existing exhaustive n=25,26 Delta0..2 artifacts only. "
            "It does not extend the census to another order."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"roots={sum(row['all_root_checks'] for row in rows)}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
