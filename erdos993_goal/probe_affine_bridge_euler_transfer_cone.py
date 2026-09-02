#!/usr/bin/env python3
"""Exact probe of the Euler-transfer cone for the affine bridge.

For B=VQ+sR and P=sR, the Euler operator E=z*d_z+w*d_w gives

  V^k(B+kP)=V^(k+1)Q+R E(V^(k+1)).

Moving E across diagonal coefficient extraction turns the target into a
positive V^(k+1) convolution of

  J_k=XQ+(2D-E)(XR),  X=A^aT^b, D=m+k+5.

Southwest coefficientwise positivity of J_k is a sufficient all-order cone.
This script searches it exactly; it is a probe, not a proof.
"""

from __future__ import annotations

import json
from pathlib import Path

from probe_affine_bridge_reaggregated_boundary_layers import outer, sources


def audit(package, parity, parameters, maximum_r, q_source, r_source):
    m_value = parameters[1] if package == "group" else parameters[0]
    cap = m_value + maximum_r + 5
    _, q_outer, r_outer = outer(
        package, parity, parameters, q_source, r_source, cap
    )
    first_negative = None
    minimum = None
    checks = 0
    for order in range(maximum_r + 1):
        target = m_value + order + 5
        for i in range(target + 1):
            for j in range(target + 1):
                value = q_outer.get((i, j), 0) + (
                    2 * target - i - j
                ) * r_outer.get((i, j), 0)
                checks += 1
                candidate = {
                    "r": order,
                    "target": target,
                    "i": i,
                    "j": j,
                    "value": value,
                    "q": q_outer.get((i, j), 0),
                    "r_kernel": r_outer.get((i, j), 0),
                    "multiplier": 2 * target - i - j,
                }
                if minimum is None or value < minimum["value"]:
                    minimum = candidate
                if value < 0 and first_negative is None:
                    first_negative = candidate
    parameter_record = (
        {"c": parameters[0], "m": parameters[1], "x": parameters[2]}
        if package == "group" else
        {"m": parameters[0], "x": parameters[1]}
    )
    return {
        "package": package,
        "parity": parity,
        **parameter_record,
        "maximum_r": maximum_r,
        "check_count": checks,
        "minimum": minimum,
        "first_negative": first_negative,
    }


def main():
    points = {
        "group": [
            ((1, 3, 0), 20), ((1, 3, 4), 20),
            ((1, 12, 24), 20), ((15, 30, 60), 20),
        ],
        "bottom": [
            ((3, 0), 20), ((3, 48), 20),
            ((20, 40), 20), ((30, 60), 20),
        ],
    }
    records = []
    for package in ("group", "bottom"):
        for parity in (0, 1):
            q_source, r_source = sources(package, parity)
            for parameters, maximum_r in points[package]:
                record = audit(
                    package, parity, parameters, maximum_r,
                    q_source, r_source,
                )
                records.append(record)
                print(package, parity, parameters, record["first_negative"], flush=True)
    failures = [record for record in records if record["first_negative"]]
    report = {
        "status": (
            "NO_FINITE_COUNTEREXAMPLE_TO_EULER_TRANSFER_CONE"
            if not failures else "EULER_TRANSFER_CONE_COUNTEREXAMPLE"
        ),
        "identity": (
            "[z^Dw^D]XV^k(B+kP)=[z^Dw^D]V^(k+1)"
            "{XQ+(2D-E)(XR)}"
        ),
        "record_count": len(records),
        "check_count": sum(record["check_count"] for record in records),
        "failure_count": len(failures),
        "first_failures": failures,
        "records": records,
        "scope_warning": "Finite exact probe only.",
    }
    output = Path("affine_bridge_euler_transfer_cone_probe_20260811.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "record_count": report["record_count"],
        "check_count": report["check_count"],
        "failure_count": report["failure_count"],
        "output": str(output),
    }, indent=2))


if __name__ == "__main__":
    main()
