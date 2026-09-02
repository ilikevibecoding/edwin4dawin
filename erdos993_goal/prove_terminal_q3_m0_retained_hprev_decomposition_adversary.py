#!/usr/bin/env python3
"""Exact terminal-m0 decomposition retaining the positive h_(j-1) row.

This repairs the prior shared-q3 certificate decomposition.  It proves an
identity and a sufficient reduction, not the remaining all-order sign.
"""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from pathlib import Path

import networkx as nx
import sympy as sp

import audit_terminal_q3_low_newton_adversarial_agent as terminal
import probe_terminal_q3_low_newton_m0_balanced_subdivided_star_adversary as probe


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "terminal_q3_m0_retained_hprev_decomposition_exact_adversary_20260829.json"
DEPENDENCIES = (
    ROOT / "audit_terminal_q3_low_newton_adversarial_agent.py",
    ROOT / "probe_terminal_q3_low_newton_m0_balanced_subdivided_star_adversary.py",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def symbolic_identity() -> dict[str, object]:
    P, a, b, c, R, U, e, j = sp.symbols("P a b c R U e j")
    A = P * c - a * R
    W = P * b - a * U
    M = (j + 1) * b * c - 3 * a * e
    delta = sp.expand(P * (P + a) * M - (j + 1) * A * W)
    split = sp.expand(
        (j + 1) * a * A * U
        + a * P * ((j + 1) * b * (c + R) - 3 * (P + a) * e)
    )
    assert sp.expand(delta - split) == 0

    f3, z3, zj, hprev, hnext, h = sp.symbols(
        "f3 z3 zj hprev hnext h", positive=True
    )
    U0 = b + h + hnext + hprev
    actual = sp.expand(
        (j + 1) * a * A * U0
        + a * P * (
            (j + 1) * b * (c + R)
            - 3 * (P + a) * (b + h + zj)
        )
    )
    q3_clear = sp.expand(
        f3
        * (
            (j + 1) * a * A * U0
            + a * P * (
                (j + 1) * b * (c + R)
                - 3 * (P + a) * (b + h)
            )
        )
        - a * P * (P + a) * j * z3 * b
    )
    reserve = sp.expand(a * P * (P + a) * (j * z3 * b - 3 * f3 * zj))
    assert sp.expand(f3 * actual - q3_clear - reserve) == 0
    return {
        "terminal_split": (
            "delta0=(j+1)a(Pc-aR)U+aP((j+1)b(c+R)-3(P+a)e)"
        ),
        "exact_U": "U=f_(j+1)+h_j+f_j+h_(j-1)",
        "cleared_identity": (
            "f3*delta0=C_repaired+aP(P+a)(j*z3*b-3*f3*z_j)"
        ),
        "inductive_reserve": (
            "The last term is 3*j*a*P*(P+a)*b*f3*(q3-q_j)>=0 "
            "under the legitimate smaller-forest induction q_j<=q3."
        ),
    }


def obstruction_tree() -> nx.Graph:
    graph = nx.Graph()
    graph.add_edge(0, 1)
    next_vertex = 2
    for subdivisions in (26, 0, 0, 0):
        previous = 1
        for _ in range(subdivisions + 1):
            graph.add_edge(previous, next_vertex)
            previous = next_vertex
            next_vertex += 1
    assert graph.number_of_nodes() == 32 and nx.is_tree(graph)
    return graph


def exact_N31_replay() -> dict[str, object]:
    graph = obstruction_tree()
    messages = terminal.TreeMessages(graph)
    whole_zero, whole_one = messages.whole_tree()
    record = next(
        row
        for row in terminal.terminal_rows(graph, 0, whole_zero, whole_one, messages)
        if row[0] == 10
    )
    actual_delta = record[1][0]
    f, f_one = messages.forest_after_deleting_root(0)
    h, _ = messages.forest_after_closed_neighborhood(0)
    f3, z3 = terminal.coeff(f, 3), terminal.coeff(f_one, 4)
    b, zj = terminal.coeff(f, 10), terminal.coeff(f_one, 11)
    hprev = terminal.coeff(h, 9)
    old_clear, details = probe.cleared_q3_lower_margin((4,), (26, 0, 0, 0), 10)
    retained_clear = old_clear + f3 * 11 * details["a"] * details["A0"] * hprev
    q3 = Fraction(z3, 3 * f3)
    qj = Fraction(zj, 10 * b)
    gap = q3 - qj
    linear_coefficient = (
        3 * 10 * details["a"] * details["p0"] * (details["p0"] + details["a"]) * b
    )
    containment_reserve = 11 * details["a"] * details["A0"] * hprev
    assert old_clear == -25884328496159880
    assert retained_clear > 0
    assert actual_delta == 109392881205454920
    assert Fraction(old_clear, f3) + containment_reserve + linear_coefficient * gap == actual_delta
    assert retained_clear + f3 * linear_coefficient * gap == f3 * actual_delta
    return {
        "parameters": {
            "tree_order": 32,
            "F_order": 31,
            "j": 10,
            "root_degree": 1,
            "R": 4,
            "T": 26,
            "Y": 1,
            "subdivisions": [26, 0, 0, 0],
        },
        "old_dropped_hprev_clear": old_clear,
        "retained_hprev_clear": retained_clear,
        "actual_terminal_delta0": actual_delta,
        "h_(j-1)": hprev,
        "containment_reserve_unscaled": containment_reserve,
        "q3": str(q3),
        "qj": str(qj),
        "q3_minus_qj": str(gap),
        "q_gap_linear_coefficient_unscaled": linear_coefficient,
        "q_gap_reserve_unscaled": str(linear_coefficient * gap),
        "minimum_q_gap_needed_after_hprev": "0",
    }


def main() -> None:
    symbolic = symbolic_identity()
    replay = exact_N31_replay()
    payload = {
        "schema": "terminal-q3-m0-retained-hprev-decomposition-v1",
        "status": "PASS_EXACT_TERMINAL_M0_RETAINED_HPREV_DECOMPOSITION",
        "theorem": symbolic,
        "N31_fail_closed_replay": replay,
        "dependency_sha256": {path.name: sha256(path) for path in DEPENDENCIES},
        "scope_warning": (
            "This proves the repaired decomposition and shows the old negative was "
            "caused by dropping h_(j-1). It does not prove the repaired cleared "
            "certificate nonnegative in all orders, terminal m=0, the terminal-payment "
            "theorem, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("theorem", symbolic)
    print("N31", replay)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
