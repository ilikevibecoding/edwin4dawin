#!/usr/bin/env python3
"""Exact feasibility audit of the first q-D5 Delta5 relaxed-cone negatives."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank7_terminal_broom_middle_differences import D4_CEILING


HERE = Path(__file__).resolve().parent
FACE_REPORT = HERE / "rank8_q8_terminal_delta5_qd5_implicated_faces_exact_20260817.json"


def choose(n: sp.Expr, k: int) -> sp.Expr:
    return sp.prod(n - j for j in range(k)) / sp.factorial(k)


def witness(piece: str, n_value: int, face: dict) -> dict:
    n = sp.Integer(n_value)
    a = n - 7
    w = sp.factor(3 * (n - 1) / ((n - 3) * (n - 4)))
    x = sp.factor(4 * w / (3 * (1 - w)))
    d4_parameter = sp.factor((2 + x) / 10)
    c3 = sp.S.One
    c4 = sp.factor(1 / x)
    c5 = sp.factor((1 - d4_parameter) / x**2)
    x5 = sp.factor(c4 / c5)
    q = sp.factor((30 / x5 - 6) / (7 * a))
    c6 = sp.factor(c5 * (7 * a * q + 3) / 36)
    c7 = sp.factor(a * q * c6 / 6)
    c8 = sp.factor(a * c7 / 8)
    c2 = sp.factor(w)
    c1 = sp.factor(n * 2 * w / ((n - 1) * (n - 2)))
    c0 = sp.factor(2 * w / ((n - 1) * (n - 2)))
    if piece == "l0":
        S = sp.factor(1 - q)
        h7 = sp.S.Zero
    elif piece == "ucap":
        S = sp.factor(7 * q / 6)
        h7 = c7
    elif piece == "full":
        S = sp.S.One
        h7 = c7
    else:
        raise ValueError(piece)
    h6 = sp.factor(S * c6)
    x6 = sp.factor(c5 / c6)
    D4 = sp.factor(1 - c3 * c5 / c4**2)
    D5 = sp.factor(1 - c4 * c6 / c5**2)
    D6 = sp.factor(1 - c5 * c7 / c6**2)
    q6 = sp.factor(12 * c6**2 - c5 * c6 - 14 * c5 * c7)
    q7 = sp.factor(14 * c7**2 - c6 * c7 - 16 * c6 * c8)
    q7_c8 = sp.factor(c7 * (14 * c7 - c6) / (16 * c6))
    extension_c8 = sp.factor(a * c7 / 8)
    T = sp.symbols("T")
    expression = sp.cancel(
        sp.sympify(face["numerator_factorization"])
        / sp.sympify(face["denominator_factorization"])
    )
    value = sp.factor(expression.subs(T, sp.Rational(21, n)))
    path_scale = choose(n - 2, 3)
    coefficients = (c0, c1, c2, c3, c4, c5, c6, c7)
    path_equalities = [
        sp.factor(coefficients[j] - choose(n - j + 1, j) / path_scale) == 0
        for j in range(8)
    ]
    checks = {
        "integral_order": n.is_integer is True,
        "D4_interval": bool((2 + x) / 10 <= D4 <= D4_CEILING),
        "D5_interval": bool((2 + x5) / 12 <= D5 <= sp.Rational(1, 6) + x5 / 2),
        "D6_interval": bool((2 + x6) / 14 <= D6 <= sp.Rational(1, 7) + x6 / 2),
        "root_capacity": bool(a * h6 - 7 * h7 >= 0),
        "complementary_root_capacity": bool(a * (c6 - h6) - 6 * (c7 - h7) >= 0),
        "extension_c8": bool(a * c7 - 8 * c8 >= 0),
        "rank6_Q6": bool(q6 >= 0),
        "rank7_Q7": bool(q7 >= 0),
        "half_retention_h6": bool(2 * h6 - c6 >= 0),
        "half_retention_h7": bool(2 * h7 - c7 >= 0),
        "path_coefficient_equalities_c0_through_c7": path_equalities,
        "Delta5_nonnegative": bool(value >= 0),
    }
    assert checks["integral_order"] and checks["D4_interval"]
    assert checks["D5_interval"] and checks["D6_interval"]
    assert checks["root_capacity"] and checks["complementary_root_capacity"]
    assert checks["extension_c8"] and checks["rank6_Q6"]
    assert not checks["rank7_Q7"] and not checks["Delta5_nonnegative"]
    return {
        "piece": piece,
        "order": n_value,
        "T": str(sp.Rational(21, n)),
        "ratios": {"w": str(w), "x": str(x), "x5": str(x5), "x6": str(x6)},
        "defects": {"D4": str(D4), "D5": str(D5), "D6": str(D6)},
        "root": {"q": str(q), "S=h6/c6": str(S), "h7/c7": str(sp.factor(h7 / c7))},
        "margins": {
            "root_capacity": str(sp.factor(a * h6 - 7 * h7)),
            "complementary_root_capacity": str(sp.factor(a * (c6 - h6) - 6 * (c7 - h7))),
            "rank6_Q6": str(q6),
            "rank7_Q7": str(q7),
            "half_retention_h6": str(sp.factor(2 * h6 - c6)),
            "half_retention_h7": str(sp.factor(2 * h7 - c7)),
        },
        "Delta5": str(value),
        "checks": checks,
        "first_common_violated_invariant": "rank7_Q7",
        "q7_repair_c8": str(q7_c8),
        "extension_c8": str(extension_c8),
        "q7_ceiling_is_smaller": bool(q7_c8 < extension_c8),
    }


def main() -> None:
    data = json.loads(FACE_REPORT.read_text(encoding="utf-8"))
    faces = {branch["piece"]: branch for branch in data["branches"]}
    payload = {
        "schema": "rank8-q8-terminal-delta5-qd5-relaxed-obstructions-v1",
        "status": "EXACT_RELAXED_CONE_NO_GOS_NOT_ROOTED_COUNTEREXAMPLES",
        "witnesses": [
            witness("l0", 44, faces["l0"]),
            witness("ucap", 46, faces["ucap"]),
            witness("full", 43, faces["full"]),
        ],
        "q7_repair": {
            "ceiling": "c8 <= c7*(14*c7/c6-1)/16",
            "extension_ceiling": "c8 <= (n-7)*c7/8",
            "q7_active_when": "q <= 6/7+3/(7*(n-7))",
            "alpha_guard": "For n>=23 every tree is bipartite and alpha>=ceil(n/2)>=12; n=21,22 alpha=11 cores require a finite complement.",
        },
        "scope_warning": "The displayed negative jets violate Q7 and are not rooted-tree counterexamples. They only disprove the q-D5 cone with the extension-only c8 endpoint.",
    }
    output = HERE / "rank8_q8_terminal_delta5_qd5_relaxed_obstructions_exact_20260817.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    print("PASS_EXACT_RANK8_DELTA5_QD5_RELAXED_OBSTRUCTION_AUDIT")


if __name__ == "__main__":
    main()
