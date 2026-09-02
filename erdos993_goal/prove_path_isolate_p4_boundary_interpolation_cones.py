#!/usr/bin/env python3
"""Certify an interpolated boundary residual on c+m>=4.

The global tensor Newton basis may contain negative coefficients
because it includes irrelevant parameter pairs c+m<4.  This script
uses the five-cone partition of the admissible domain and, when
needed, the automatic c=0 tail/finite-strip refinement.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from prove_path_isolate_p4_general_layer_lift_order5_sparse import (
    certificate,
    ordinary_to_newton,
    refine_c_zero_cone,
    substitute_cone,
    tensor_newton_to_ordinary,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--distance", type=int, required=True)
    args = parser.parse_args()

    source = json.loads(
        Path(
            f"path_isolate_p4_boundary_s{args.distance}_newton_"
            "interpolation_20260730.json"
        ).read_text(encoding="utf-8")
    )
    cones = [
        ("c=0,m=4+M", 0, 4),
        ("c=1,m=3+M", 1, 3),
        ("c=2,m=2+M", 2, 2),
        ("c=3,m=1+M", 3, 1),
        ("c=4+C,m=M", None, 0),
    ]
    records = []
    refinements = []
    unresolved = 0
    for parity_report in source["reports"]:
        parity = parity_report["parity_epsilon"]
        polynomial = tensor_newton_to_ordinary(
            parity_report["coefficients"]
        )
        for cone_name, fixed_c, m_shift in cones:
            cone = substitute_cone(
                polynomial, fixed_c, m_shift
            )
            ordinary = certificate(cone)
            newton = certificate(ordinary_to_newton(cone))
            record = {
                "parity_epsilon": parity,
                "domain": cone_name,
                "ordinary_monomial_certificate": ordinary,
                "tensor_Newton_certificate": newton,
            }
            records.append(record)
            if newton["negative_coefficient_count"] > 0:
                if fixed_c == 0 and m_shift == 4:
                    refinement = refine_c_zero_cone(cone)
                    refinement.update(
                        {
                            "parity_epsilon": parity,
                            "domain": cone_name,
                        }
                    )
                    refinements.append(refinement)
                    if refinement["status"] != (
                        "PASS_REFINED_C_ZERO_CONE"
                    ):
                        unresolved += 1
                else:
                    unresolved += 1

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOUNDARY_INTERPOLATION_CONES"
            if unresolved == 0
            else "FAIL_PATH_ISOLATE_P4_BOUNDARY_INTERPOLATION_CONES"
        ),
        "support_distance_s": args.distance,
        "domain": "c,m,x>=0, c+m>=4, epsilon in {0,1}",
        "unresolved_case_count": unresolved,
        "records": records,
        "refined_c_zero_certificates": refinements,
    }
    Path(
        f"path_isolate_p4_boundary_s{args.distance}_cone_"
        "certificate_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if unresolved:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
