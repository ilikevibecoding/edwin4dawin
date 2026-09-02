#!/usr/bin/env python3
"""Light high-precision vertex scout for the attachment-floor live paths.

This is deliberately not a Bernstein certificate.  It samples all endpoint
choices of (y,r,U,V,Zc) at ten representative orders in the single n>=28
domain, skipping the Delta2 k=1/lower-cross tensor already running.  Its sole
purpose is to rank the next exact boxes; a negative row is not a tree example
and a nonnegative grid is not a proof.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import sys
import time
from pathlib import Path

import mpmath as mp
import sympy as sp

import probe_rank8_delta2_source_curvatures as delta2
import probe_rank8_delta3_source_curvatures as delta3
from verify_rank8_q8_terminal_reduction import newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta23_live_path_attachment_floor_vertices_scout_agent_20260825.json"
EXPECTED_INPUTS = {
    "certify_rank8_delta23_live_path_attachment_floor_box_agent.py": "F0024AEFEE3790D2FC5B77F61226DCD56E6C63C1F61358A8B4EB9ADE8B604669",
    "audit_rank8_delta23_live_path_attachment_floor_box_mappings_agent.py": "C2396D33FBF3E3266AC056C1AC8AC02D2CBF7894C4E26D83654830DC04D62A11",
    "rank8_delta23_live_path_attachment_floor_box_mappings_independent_audit_agent_20260825.json": "4EA7C717C4F8C85699E77847E298CD0C47E38766D7D94C1EAFEFCBDC2A5F77DB",
    "probe_rank8_delta2_source_curvatures.py": "85E45BA23A606EDB7526D75134F1956AE8B5C49D8B4CB404A16897B5A4CE3D0C",
    "probe_rank8_delta3_source_curvatures.py": "1AAA5FA9EC12DAEF27791DCCADC80F91C2D93B649CF2898C01FABF356775F122",
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "verify_rank8_root_deletion_attachment_floor_root.py": "A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8",
    "rank8_root_deletion_attachment_floor_exact_root_20260825.json": "257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21",
    "audit_rank8_root_deletion_attachment_floor_root.py": "ED27ED3B9DB96131FE1C4551BFEE77D8729FE4D6E2685CD411D826212EAD648D",
    "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json": "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
    "verify_rank8_n28_tight_coordinate_chords_root.py": "F0EC00028526D82952FF7F072B6DDAB1A2638554333F2B2D743ED650845336BC",
    "rank8_n28_tight_coordinate_chords_exact_root_20260825.json": "6C8393A292044D7843898BBE1F72C5416BD39EA49691D3DD03400A76CD12CA7D",
}
ORDERS = (28, 31, 40, 42, 56, 80, 112, 200, 1000, 10000)
JOBS = tuple(
    (rank, k, piece)
    for rank in (2, 3)
    for k in (1, 7)
    for piece in ("lcross", "ucap")
    if (rank, k, piece) != (2, 1, "lcross")
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def term_data(expression: sp.Expr, variables: tuple[sp.Symbol, ...]):
    polynomial = sp.Poly(sp.expand(expression), *variables, domain=sp.QQ)
    rows = []
    for monomial, coefficient in polynomial.terms():
        numerator, denominator = sp.fraction(coefficient)
        rows.append((monomial, mp.mpf(int(numerator)) / mp.mpf(int(denominator))))
    return rows, polynomial.degree_list()


def evaluate(rows, degrees, point):
    powers = [
        [mp.power(coordinate, exponent) for exponent in range(degree + 1)]
        for coordinate, degree in zip(point, degrees)
    ]
    total = mp.mpf("0")
    for monomial, coefficient in rows:
        term = coefficient
        for axis, exponent in enumerate(monomial):
            term *= powers[axis][exponent]
        total += term
    return total


def scout_job(rank: int, k: int, piece: str):
    module = delta2 if rank == 2 else delta3
    value, variables = module.build(k, piece)
    numerator, denominator = sp.fraction(sp.cancel(value))
    numerator_rows, numerator_degrees = term_data(numerator, variables)
    denominator_rows, denominator_degrees = term_data(denominator, variables)

    rows = []
    negative_by_order = {}
    negative_by_z_axis = {"0": 0, "1": 0}
    minimum = None
    witness = None
    worst_relative = None
    for order in ORDERS:
        n = mp.mpf(order)
        t = 1 / n
        floor = (n - 19) / (n - 12)
        order_values = []
        order_rows = []
        for W, A, U, V, Zc in itertools.product((0, 1), repeat=5):
            y_lower = 3 + 9 * t
            y_upper = 3 + mp.mpf(546) * t / 25
            y = y_lower if W == 0 else y_upper
            r_lower = mp.mpf(4) / 3 + mp.mpf(2) * t / 3
            r_upper = mp.mpf(4) / 3 + mp.mpf(1008) * t / 173
            r = r_lower if A == 0 else r_upper
            w = t * y
            x = w * r
            z = floor + (1 - floor) * Zc
            point = (n, w, x, mp.mpf(U), mp.mpf(V), z)
            numerator_value = evaluate(numerator_rows, numerator_degrees, point)
            denominator_value = evaluate(denominator_rows, denominator_degrees, point)
            if denominator_value <= 0:
                raise AssertionError((rank, k, piece, order, W, A, U, V, Zc, denominator_value))
            result = numerator_value / denominator_value
            order_values.append(result)
            order_rows.append((result, W, A, U, V, Zc, y, r, z))
            if minimum is None or result < minimum:
                minimum = result
                witness = {
                    "order": order,
                    "W_A_U_V_Zc": [W, A, U, V, Zc],
                    "y": mp.nstr(y, 24),
                    "r": mp.nstr(r, 24),
                    "Z": mp.nstr(z, 24),
                    "value": mp.nstr(result, 30),
                }
            if result < 0:
                negative_by_order[str(order)] = negative_by_order.get(str(order), 0) + 1
                negative_by_z_axis[str(Zc)] += 1
        scale = max(abs(value) for value in order_values)
        order_minimum = min(order_values)
        relative = order_minimum / scale if scale else mp.mpf("0")
        if worst_relative is None or relative < worst_relative:
            worst_relative = relative
        order_negative = sum(bool(value < 0) for value in order_values)
        rows.append(
            {
                "order": order,
                "floor": mp.nstr(floor, 24),
                "negative_vertices": order_negative,
                "minimum": mp.nstr(order_minimum, 30),
                "minimum_over_max_abs": mp.nstr(relative, 20),
            }
        )

    negative_count = sum(negative_by_order.values())
    return {
        "Delta": rank,
        "D6_k": k,
        "capacity_piece": piece,
        "sampled_vertices": len(ORDERS) * 32,
        "negative_vertices": negative_count,
        "nonnegative_on_scout_grid": negative_count == 0,
        "negative_by_order": negative_by_order,
        "negative_by_Zc_axis": negative_by_z_axis,
        "minimum": mp.nstr(minimum, 30),
        "minimum_witness": witness,
        "worst_order_relative_minimum": mp.nstr(worst_relative, 20),
        "source_terms": {
            "numerator": len(numerator_rows),
            "denominator": len(denominator_rows),
        },
        "order_rows": rows,
    }


def main() -> None:
    started = time.perf_counter()
    sys.setrecursionlimit(200_000)
    mp.mp.dps = 80
    immutable_inputs = {name: sha256(HERE / name) for name in EXPECTED_INPUTS}
    assert immutable_inputs == EXPECTED_INPUTS

    # The raw terminal residual is common.  Cache it once so the scout stays
    # light; no Bernstein transform or tensor allocation occurs here.
    raw = newton_coefficients(residual())
    for module in (delta2, delta3):
        module.residual = lambda: None
        module.newton_coefficients = lambda _expression, raw=raw: raw

    results = []
    for rank, k, piece in JOBS:
        row = scout_job(rank, k, piece)
        results.append(row)
        print(
            f"SCOUT Delta{rank} k={k} {piece}: "
            f"negative={row['negative_vertices']}/{row['sampled_vertices']} "
            f"relative_min={row['worst_order_relative_minimum']}",
            flush=True,
        )

    ranking = sorted(
        results,
        key=lambda row: (
            row["negative_vertices"] != 0,
            row["negative_vertices"],
            -float(row["worst_order_relative_minimum"]),
            row["Delta"],
            row["D6_k"],
            row["capacity_piece"],
        ),
    )
    for index, row in enumerate(ranking, start=1):
        row["recommended_priority"] = index

    payload = {
        "schema": "rank8-delta23-live-path-attachment-floor-vertices-scout-agent-v1",
        "status": "PASS_LIGHT_NUMERICAL_VERTEX_SCOUT",
        "classification": "heuristic ranking only; not a Bernstein or tree theorem",
        "skipped_running_exact_job": {
            "Delta": 2,
            "D6_k": 1,
            "capacity_piece": "lcross",
        },
        "orders": list(ORDERS),
        "vertex_axes": {
            "W": [0, 1],
            "A": [0, 1],
            "U": [0, 1],
            "V": [0, 1],
            "Zc": [0, 1],
        },
        "maps": {
            "floor": "Z=(n-19+7*Zc)/(n-12)",
            "y": "[3+9/n,3+546/(25n)]",
            "r": "[4/3+2/(3n),4/3+1008/(173n)]",
        },
        "ranking": [
            {
                "priority": row["recommended_priority"],
                "Delta": row["Delta"],
                "D6_k": row["D6_k"],
                "capacity_piece": row["capacity_piece"],
                "negative_vertices": row["negative_vertices"],
                "sampled_vertices": row["sampled_vertices"],
                "worst_order_relative_minimum": row["worst_order_relative_minimum"],
            }
            for row in ranking
        ],
        "results": results,
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "immutable_inputs": immutable_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Positive sampled vertices do not imply an exact box PASS, and negative "
            "vertices are points of the relaxed coordinate box rather than trees."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
