#!/usr/bin/env python3
"""Remove outer binomial weights and search the utilization determinant again."""

from __future__ import annotations

import json
import math
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import blocks
from probe_path_isolate_p4_group_affine_j_holonomic_recurrence import audit_pair


def main() -> None:
    source = Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "far_refutation_probe_20260802.json"
    )
    record = json.loads(source.read_text(encoding="utf-8"))["record"]
    r = int(record["r"])
    ell = record["ell_values"]
    reserve = record["reserve_values"]
    ell_reduced = []
    reserve_reduced = []
    for j, value in enumerate(ell):
        weight = math.comb(r + 1, j)
        assert value % weight == 0
        ell_reduced.append(value // weight)
    for j, value in enumerate(reserve):
        weight = math.comb(r, j)
        assert value % weight == 0
        reserve_reduced.append(value // weight)
    determinants = [
        (r + 1 - j) * ell_reduced[j + 1] * reserve_reduced[j]
        - (r - j) * ell_reduced[j] * reserve_reduced[j + 1]
        for j in range(r)
    ]
    audits = []
    requests = ((1, 100), (2, 60), (3, 40), (4, 30), (5, 24), (6, 20))
    for order, maximum_degree in requests:
        for degree in range(maximum_degree + 1):
            result = audit_pair(0, determinants, order, degree)
            if result["testable"]:
                audits.append(result)
    candidates = [item for item in audits if item["candidate_recurrence"]]
    report = {
        "status": "CANDIDATE_FOUND" if candidates else "NO_CANDIDATE",
        "r": r,
        "determinant_sign_blocks": blocks(determinants),
        "requests_order_maximum_degree": [list(item) for item in requests],
        "candidate_count": len(candidates),
        "candidates": candidates,
        "warning": "Finite modular rank search on one binomial-reduced sequence.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "reduced_determinant_recurrence_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
