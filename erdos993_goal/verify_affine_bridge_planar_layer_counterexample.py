#!/usr/bin/env python3
"""Exact counterexample to coefficientwise affine planar-layer positivity."""

from __future__ import annotations

import json
import math
from pathlib import Path

from probe_affine_bridge_reaggregated_boundary_layers import sources as qr_sources
from probe_affine_bridge_shifted_predecessors import sources as bp_sources
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= 0 and 0 <= k <= n else 0


def outer_coefficient(source, a: int, b: int, target_z: int, target_w: int) -> int:
    """Coefficient of A^a T^b times one evaluated sparse source."""
    total = 0
    for branch_count in range(b + 1):
        inner = 0
        for (power_z, power_w), coefficient in source.items():
            inner += (
                coefficient
                * choose(
                    a + b - branch_count,
                    target_w - power_w - b + branch_count,
                )
                * choose(
                    a + branch_count,
                    target_z - power_z - branch_count,
                )
            )
        total += choose(b, branch_count) * inner
    return total


def add_sparse(*terms):
    result = {}
    for scalar, source, shift_z, shift_w in terms:
        for (power_z, power_w), coefficient in source.items():
            key = (power_z + shift_z, power_w + shift_w)
            value = result.get(key, 0) + scalar * coefficient
            if value:
                result[key] = value
            elif key in result:
                del result[key]
    return result


def audit(parity: int) -> dict:
    m_value = 120
    x_value = 240
    order = 80
    layer_power = 0
    a_value = m_value + x_value - 3
    b_value = 2 * m_value + parity - 5
    target = m_value + order + 6

    # First direct route: exact affine kernels B and P.
    base_source, reserve_source = bp_sources("bottom", parity)
    base = evaluate(base_source, 0, m_value, x_value, target)
    reserve = evaluate(reserve_source, 0, m_value, x_value, target)
    base_value = outer_coefficient(base, a_value, b_value, target, target)
    reserve_value = outer_coefficient(
        reserve, a_value, b_value, target, target
    )
    direct = base_value + order * reserve_value

    # Independent structural route: B=(1+s)Q+sR and P=sR.
    q_source, r_source = qr_sources("bottom", parity)
    q_numeric = evaluate(q_source, 0, m_value, x_value, target)
    r_numeric = evaluate(r_source, 0, m_value, x_value, target)
    q0 = outer_coefficient(q_numeric, a_value, b_value, target, target)
    q1 = 2 * outer_coefficient(
        q_numeric, a_value, b_value, target, target - 1
    )
    rho1 = 2 * outer_coefficient(
        r_numeric, a_value, b_value, target, target - 1
    )
    structural = q0 + q1 + (order + 1) * rho1

    # Reconstruct B and P at the sparse-kernel level as a third transcription
    # check before applying the positive outer transform.
    reconstructed_p = add_sparse(
        (1, r_numeric, 1, 0),
        (1, r_numeric, 0, 1),
    )
    reconstructed_b = add_sparse(
        (1, q_numeric, 0, 0),
        (1, q_numeric, 1, 0),
        (1, q_numeric, 0, 1),
        (1, r_numeric, 1, 0),
        (1, r_numeric, 0, 1),
    )
    # Evaluation may have removed out-of-target terms; equality is needed only
    # on the target-relevant southwest square.
    relevant_keys = [
        key for key in set(base) | set(reserve) | set(reconstructed_b) | set(reconstructed_p)
        if key[0] <= target and key[1] <= target
    ]
    assert all(base.get(key, 0) == reconstructed_b.get(key, 0) for key in relevant_keys)
    assert all(
        reserve.get(key, 0) == reconstructed_p.get(key, 0)
        for key in relevant_keys
    )
    assert direct == structural
    assert direct < 0
    assert rho1 > 0
    signed_debt = -(q0 + q1)
    reserve_payment = (order + 1) * rho1
    assert signed_debt > reserve_payment

    return {
        "package": "bottom",
        "parity": parity,
        "m": m_value,
        "x": x_value,
        "r": order,
        "h": layer_power,
        "outer_A_exponent": a_value,
        "outer_T_exponent": b_value,
        "diagonal_target": target,
        "direct_base_B": base_value,
        "direct_reserve_unit_P": reserve_value,
        "direct_D_r_h_equals_B_plus_rP": direct,
        "adjacent_package": {
            "q_h": q0,
            "q_h_plus_1": q1,
            "rho_h_plus_1": rho1,
            "signed_debt": signed_debt,
            "reserve_payment": reserve_payment,
            "debt_over_payment_numerator": signed_debt,
            "debt_over_payment_denominator": reserve_payment,
            "debt_over_payment_decimal": float(
                signed_debt / reserve_payment
            ),
            "identity": "D_(r,0)=q_0+q_1+(r+1)rho_1",
        },
    }


def main() -> None:
    records = [audit(parity) for parity in (0, 1)]
    report = {
        "status": "COUNTEREXAMPLE_AFFINE_PLANAR_LAYER_POSITIVITY",
        "refuted_statement": (
            "D_(r,h)=[z^(L+r+1)w^(L+r+1)](z+w)^h "
            "A^aT^b(B+rP)>=0 for all 0<=h<=r+1; equivalently the "
            "planar-layer statement L_(r,j,eta)>=0."
        ),
        "records": records,
        "logical_scope": (
            "At h=0 this is the terminal diagonal layer Z_(r,r).  Its "
            "negativity refutes layerwise positivity but does not determine "
            "the binomially reassembled predecessor Z_r or the affine bridge."
        ),
        "verification_routes": [
            "direct exact coefficient of A^aT^b(B+rP)",
            "adjacent decomposition B=(1+z+w)Q+(z+w)R, P=(z+w)R",
            "target-relevant sparse-kernel reconstruction",
        ],
    }
    output = Path("affine_bridge_planar_layer_counterexample_exact_20260810.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "counterexample_count": len(records),
        "values": [
            record["direct_D_r_h_equals_B_plus_rP"] for record in records
        ],
        "output": str(output),
    }, indent=2))


if __name__ == "__main__":
    main()
