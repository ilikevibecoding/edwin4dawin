#!/usr/bin/env python3
"""Compile, replay twice, and independently audit the n=19,20 tree census."""

from __future__ import annotations

import ast
import hashlib
import json
import re
import subprocess
from fractions import Fraction
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import MaskIndependencePolynomial


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "verify_rank8_pgc_tree_pendant_n19_n20.rs"
EXE = ROOT / "verify_rank8_pgc_tree_pendant_n19_n20.exe"
REPORT = ROOT / "rank8_pgc_tree_pendant_n19_n20_exact_20260817.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def graph_from_layout(layout: list[int]) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(len(layout)))
    stack: list[int] = []
    for vertex, level in enumerate(layout):
        if stack:
            while layout[stack[-1]] >= level:
                stack.pop()
            graph.add_edge(vertex, stack[-1])
        stack.append(vertex)
    return graph


def h(poly: tuple[int, ...], rank: int) -> Fraction:
    def c(k: int) -> int:
        return poly[k] if 0 <= k < len(poly) else 0
    return (
        Fraction(rank * rank * (c(rank) ** 2 - c(rank - 1) * c(rank + 1)), c(rank - 1))
        + rank * (c(rank) - c(rank + 1))
    )


def main() -> None:
    subprocess.run(
        [
            "rustc", "-O", "--target", "x86_64-pc-windows-gnu",
            str(SOURCE), "-o", str(EXE),
        ],
        cwd=ROOT,
        check=True,
    )
    first = subprocess.run([str(EXE)], cwd=ROOT, check=True, capture_output=True, text=True)
    second = subprocess.run([str(EXE)], cwd=ROOT, check=True, capture_output=True, text=True)
    assert first.stderr == second.stderr == ""
    assert first.stdout == second.stdout
    text = first.stdout
    assert "PASS_EXACT_RANK8_TREE_PENDANT_PGC_N19_N20_NOT_ALL_FORESTS" in text
    assert "totals trees=1141020 pendant_supports=6945357 required=2308381 q_negative=0 v_negative=0 coupled_negative=0" in text

    totals = {}
    for alpha, count in re.findall(r"^alpha=(\d+) required=(\d+)$", text, re.MULTILINE):
        totals[int(alpha)] = int(count)
    assert totals == {13: 1_665_318, 14: 533_405, 15: 97_869, 16: 10_974, 17: 779, 18: 35, 19: 1}

    match = re.search(
        r"global_min num=(\d+) den=(\d+) order=(\d+) alpha=(\d+) support=(\d+) layout=(\[[^\n]+\])",
        text,
    )
    assert match is not None
    numerator, denominator, order, alpha, support = map(int, match.groups()[:5])
    layout = ast.literal_eval(match.group(6))
    p_match = re.search(r"^global_min_p=(\[[^\n]+\])$", text, re.MULTILINE)
    b_match = re.search(r"^global_min_b=(\[[^\n]+\])$", text, re.MULTILINE)
    assert p_match and b_match
    p_prefix = tuple(ast.literal_eval(p_match.group(1)))
    b_prefix = tuple(ast.literal_eval(b_match.group(1)))
    assert (numerator, denominator, order, alpha, support) == (
        202_611_114_764, 13_426_838, 19, 13, 14
    )

    graph = graph_from_layout(layout)
    assert graph.number_of_nodes() == order and nx.is_tree(graph)
    leaf = next(vertex for vertex in graph.neighbors(support) if graph.degree(vertex) == 1)
    engine = MaskIndependencePolynomial(graph)
    full_mask = (1 << order) - 1
    p = engine.polynomial(full_mask)
    reduced_mask = full_mask ^ (1 << engine.position[leaf]) ^ (1 << engine.position[support])
    b = engine.polynomial(reduced_mask)
    assert p[:10] == p_prefix
    assert b[:10] == b_prefix
    assert len(p) - 1 == alpha and len(b) - 1 == alpha - 1
    q = 16 * p[8] ** 2 - p[7] * p[8] - 18 * p[7] * p[9]
    v = 10 * b[6] * b[7] + 136 * b[6] * b[8] - 98 * b[7] ** 2
    c7 = p[8] - b[8] - b[7]
    assert numerator == 8 * b[6] * q + 24 * c7 * p[7] * b[6] + v * p[7]
    assert denominator == 2 * p[7] * b[6]
    assert h(p, 8) - h(b, 7) == Fraction(numerator, denominator)

    report = {
        "status": "PASS_EXACT_RANK8_TREE_PENDANT_PGC_N19_N20_NOT_ALL_FORESTS",
        "scope": "every pendant-support polynomial pair in every free tree of orders 19 and 20; not disconnected forests and not an all-order theorem",
        "counts": {
            "free_trees": 1_141_020,
            "pendant_support_pairs": 6_945_357,
            "required_alpha_at_least_13": 2_308_381,
            "by_alpha": {str(key): value for key, value in totals.items()},
            "negative_Q8": 0,
            "negative_V8": 0,
            "negative_coupled_margin": 0,
        },
        "minimum": {
            "numerator": numerator,
            "denominator": denominator,
            "text": str(Fraction(numerator, denominator)),
            "order": order,
            "alpha": alpha,
            "support": support,
            "layout": layout,
            "P_prefix": list(p_prefix),
            "B_prefix": list(b_prefix),
        },
        "fresh_replay_byte_identical": True,
        "independent_minimum_witness_reconstruction": True,
        "source_sha256": sha256(SOURCE),
        "executable_sha256": sha256(EXE),
        "stdout_sha256": hashlib.sha256(first.stdout.encode()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_RANK8_TREE_PENDANT_PGC_N19_N20_REPLAY_AND_WITNESS_AUDIT")
    print("source_sha256", report["source_sha256"])
    print("executable_sha256", report["executable_sha256"])
    print("report_sha256", sha256(REPORT))


if __name__ == "__main__":
    main()
