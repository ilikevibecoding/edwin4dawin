#!/usr/bin/env python3
"""Search compact polynomial recurrences for the utilization determinant."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_group_affine_j_holonomic_recurrence import audit_pair


def main() -> None:
    source = Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "utilization_determinant_20260802.json"
    )
    values = json.loads(source.read_text(encoding="utf-8"))["determinants"]
    audits = []
    requests = ((1, 80), (2, 50), (3, 36), (4, 28), (5, 22), (6, 18))
    for order, maximum_degree in requests:
        for degree in range(maximum_degree + 1):
            result = audit_pair(0, values, order, degree)
            if result["testable"]:
                audits.append(result)
    candidates = [item for item in audits if item["candidate_recurrence"]]
    report = {
        "status": "CANDIDATE_FOUND" if candidates else "NO_CANDIDATE",
        "sequence_length": len(values),
        "requests_order_maximum_degree": [list(item) for item in requests],
        "tested_pair_count": len(audits),
        "candidates": candidates,
        "warning": "Finite modular rank search on one exact sequence.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "determinant_recurrence_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
