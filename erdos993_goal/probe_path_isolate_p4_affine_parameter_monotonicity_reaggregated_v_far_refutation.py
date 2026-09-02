#!/usr/bin/env python3
"""Save the first far ray refuting a terminal reaggregated V-tail."""

from __future__ import annotations

from fractions import Fraction
import json
from pathlib import Path

from flint import ctx

from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import blocks
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_interlacing import (
    audit_case,
)


def main() -> None:
    ctx.prec = 100
    record = audit_case("group", 0, "m", 1, 180, 360, 240)
    values = record["combined_values"]
    sign_blocks = blocks(values)
    negative_boundary = -sum(
        value
        for value in values
        if value < 0
    )
    positive_middle = sum(value for value in values if value > 0)
    ell = record["ell_values"]
    reserve = record["reserve_values"]
    n = record["r"] + 1
    utilization = [Fraction(-ell[j], n * reserve[j]) for j in range(len(reserve))]
    decreases = [
        j
        for j in range(len(utilization) - 1)
        if utilization[j + 1] < utilization[j]
    ]
    record.update(
        {
            "nonzero_sign_blocks": sign_blocks,
            "boundary_debt_over_positive_middle": float(
                Fraction(negative_boundary, positive_middle)
            ),
            "utilization_decrease_count": len(decreases),
            "utilization_decreases_form_initial_prefix": decreases
            == list(range(len(decreases))),
            "utilization_minimum_index": min(
                range(len(utilization)), key=utilization.__getitem__
            ),
            "utilization_initial_above_one": utilization[0] > 1,
            "utilization_minimum_below_one": min(utilization) < 1,
        }
    )
    report = {
        "status": "PASS_EXACT_REAGGREGATED_FAR_REFUTATION",
        "record": record,
        "warning": "One finite exact polynomial; this refutes only the terminal-tail strengthening.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "far_refutation_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        {
            key: value
            for key, value in record.items()
            if not key.endswith("_values")
        },
        flush=True,
    )


if __name__ == "__main__":
    main()
