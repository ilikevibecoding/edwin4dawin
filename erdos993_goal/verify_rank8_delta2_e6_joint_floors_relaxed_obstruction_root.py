#!/usr/bin/env python3
"""Exact obstruction to closing Delta2 with separate U and V floors alone."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_source_curvatures import build


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_e6_joint_floors_relaxed_obstruction_exact_20260825.json"
EXPECTED = {
    "probe_rank8_delta2_source_curvatures.py":
        "85E45BA23A606EDB7526D75134F1956AE8B5C49D8B4CB404A16897B5A4CE3D0C",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank4_quantitative_tree_reserve_exact_root_20260823.json":
        "C7C19AFA2C06C1309B388399A26818EBC85D77F9D0494B182428B006AAEDE6F0",
    "rank4_quantitative_tree_reserve_independent_audit_root_20260823.json":
        "BD36DBFE3EFDA9FBBA54513C12E7785D48AAEBE063EA0C8114F4CD102AB566B4",
    "verify_rank5_component_surplus_all_order_theorem_root.py":
        "6420652043988A2F2132E3AEC042286E8F7A31D0A11AAD06848BC19D584C926E",
    "rank5_component_surplus_all_order_theorem_exact_20260825.json":
        "E9BA1DA16852D27ECF74A0AEA17414EB42B54C653DB92ADE906AC6DA79917EA9",
    "verify_rank5_branching_surplus_v_floor_corollary_root.py":
        "FFD8B6F7DCFF1265F865F329AB8BC5DB8BF56EA2CD8002DC6E9ABDFAACF33CD8",
    "rank5_branching_surplus_v_floor_corollary_exact_20260825.json":
        "07E75FED5049C89886AD04A1165CBA8AF2B26B9BB4F972608C894900AF5ED13E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    reserve = json.loads(
        (HERE / "rank4_quantitative_tree_reserve_exact_root_20260823.json")
        .read_text(encoding="utf-8")
    )
    component = json.loads(
        (HERE / "rank5_component_surplus_all_order_theorem_exact_20260825.json")
        .read_text(encoding="utf-8")
    )
    v_corollary = json.loads(
        (HERE / "rank5_branching_surplus_v_floor_corollary_exact_20260825.json")
        .read_text(encoding="utf-8")
    )
    assert component["status"] == (
        "PASS_EXACT_ALL_ORDER_RANK5_COMPONENT_SURPLUS_THEOREM_INDEPENDENT_CENSUS"
    )
    assert v_corollary["status"] == (
        "PASS_EXACT_ALL_ORDER_RANK5_BRANCHING_SURPLUS_V_FLOOR_COROLLARY"
    )

    N = sp.symbols("N", positive=True)
    u_floor_expression = sp.sympify(
        reserve["rank8_D4_coordinate_corollary"]["U_lower_bound"],
        locals={"n": N, "binomial": sp.binomial},
    )
    value, (n, w, x, U, V, Z) = build(1, "lcross")
    rows = []
    for order in (28, 31, 40, 80, 200, 1000):
        degree_surplus = sp.Integer(6)
        c3 = sp.binomial(order - 2, 3) + degree_surplus
        # For e=6 and n>=28 the Cauchy lower bound on gamma is zero, so the
        # scout's exact lower tau endpoint is tau=e=6.
        tau = degree_surplus
        c4 = (
            sp.binomial(order - 3, 4)
            + (order - 4) * degree_surplus
            - tau
        )
        w_value = sp.binomial(order - 1, 2) / c3
        x_value = c3 / c4
        u_value = sp.factor(u_floor_expression.subs(N, order))
        order_floor = sp.Rational(4, 5 * (order - 5))
        surplus_floor = sp.Rational(
            8 * degree_surplus,
            5 * (order - 2) * (order - 3),
        )
        assert order_floor >= surplus_floor
        v_value = order_floor
        exact = sp.cancel(value.subs({
            n: order,
            w: w_value,
            x: x_value,
            U: u_value,
            V: v_value,
            Z: 0,
        }))
        numerator, denominator = sp.fraction(exact)
        assert denominator > 0 and numerator < 0
        rows.append({
            "order": order,
            "degree_surplus": 6,
            "tau_lower_endpoint": 6,
            "w": str(w_value),
            "x": str(x_value),
            "U_proved_floor": str(u_value),
            "V_order_floor": str(order_floor),
            "V_component_surplus_floor": str(surplus_floor),
            "V_used": str(v_value),
            "Z": 0,
            "Delta2_relaxed_value": str(exact),
            "decimal": str(sp.N(exact, 18)),
        })
        print("NEGATIVE_E6_JOINT_FLOORS", order, sp.N(exact, 12), flush=True)

    payload = {
        "schema": "rank8-delta2-e6-joint-floors-relaxed-obstruction-v1",
        "status": "EXACT_RELAXED_OBSTRUCTION_SEPARATE_Q4_AND_COMPONENT_SURPLUS_FLOORS_INSUFFICIENT",
        "claim": (
            "Even after imposing the proved quantitative rank-four U floor, the "
            "proved order-only rank-five V floor, the proved component-surplus V "
            "floor, and the exact degree-surplus-six c3/c4 motif endpoints, the "
            "enlarged Delta2 k=1/lower-cross box contains exact negative points."
        ),
        "witnesses": rows,
        "required_next_input": (
            "Retain exact e=6 suppressed-skeleton/root coupling or prove a stronger "
            "joint realizability inequality involving c4,c5,c6,c7 and rooted deletion data."
        ),
        "immutable_inputs": actual,
        "structural_partition_pointer": {
            "producer": "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json",
            "independent_audit": "rank8_delta03_e6_skeleton_root_partition_independent_audit_20260825.json",
            "scope": "10 suppressed skeletons and 101 root-location orbits",
        },
        "scope_warning": (
            "These exact rational points belong to a relaxed coefficient box. They "
            "are not asserted to be trees and are not counterexamples to Q8 or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
