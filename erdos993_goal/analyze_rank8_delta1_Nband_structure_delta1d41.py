#!/usr/bin/env python3
"""Exact structural audit for a possible Delta1 D-order band parameter."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_Nband_structure_diagnostic_delta1d41_20260825.json"
PINNED = {
    "rank8_delta1_order42_bound_chain_independent_audit_delta1d42_20260825.json":
        "9F3E5C38C5399E584CCD8D306EAC391DDE654D0E1B0B271A7BC69EEDC855907A",
    "rank8_delta1_order41_bound_chain_independent_audit_delta1d41_20260825.json":
        "AD31ECFD2BA893FC5743CD4C8BEA7F68A3B0E32F99A4DC9C8A66A1F8F93BDCFC",
    "rank8_delta1_mask3_q5_small_N42_M26_s2_probe_delta1d42_20260825.json":
        "AAD871D3BA4B5DC3F4A27625C1703349F3CF87EB69E747D72A687CCE8E56D5C0",
    "rank8_delta1_mask3_q5_small_N41_M25_s2_probe_delta1d41_20260825.json":
        "3C751DB14BE6B8E194DF57BC56279F0EA8CE9D33FBD8CB9C9C9DB7AC3C855398",
}
X_BREAKS = (
    sp.Integer(0), sp.Rational(1, 8), sp.Rational(1, 4),
    sp.Rational(1, 2), sp.Integer(1),
)
Y_BREAKS = (
    sp.Integer(0), sp.Rational(1, 4), sp.Rational(1, 2),
    sp.Rational(3, 4), sp.Rational(7, 8), sp.Rational(15, 16),
    sp.Rational(31, 32), sp.Rational(63, 64), sp.Integer(1),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    rows = []
    switch_checks = 0
    switch_min = None
    switch_max = None
    for n_value in range(27, 43):
        n = sp.Integer(n_value)
        mu4 = sp.cancel((n - 7) * (n - 8) / (n - 3))
        mu5 = sp.cancel(mu4 - 3 + 2 / mu4)
        x_lower = sp.cancel(6 / (n - 5))
        x_upper = sp.cancel(6 / mu5)
        y_lower = sp.cancel(5 / (n - 4))
        y_upper = sp.cancel(5 / mu4)
        missing = sp.cancel(4 / (n - 4))
        cap_modes = []
        slab_caps = []
        for x_hi_normalized in X_BREAKS[1:]:
            x_hi = sp.cancel(
                x_lower + (x_upper - x_lower) * x_hi_normalized
            )
            q5_cap = sp.cancel(10 * x_hi / (x_hi + 12))
            cap_modes.append("q5" if q5_cap < y_upper else "path_ratio")
            slab_caps.append(min(q5_cap, y_upper))
        assert cap_modes == ["q5", "q5", "q5", "path_ratio"]

        for m_value in range(9, n_value):
            m = sp.Integer(m_value)
            t_m = sp.cancel((m - 7) * (m - 8) / (m - 3))
            ratio_cap = sp.cancel(5 / t_m)
            for y_cap in slab_caps:
                for y_lo_normalized in Y_BREAKS[:-1]:
                    y0 = sp.cancel(
                        y_lower
                        + (y_cap - y_lower) * y_lo_normalized
                    )
                    switch = sp.cancel(
                        (y0 - missing) / (ratio_cap - missing)
                    )
                    assert 0 < switch < 1
                    switch_checks += 1
                    switch_min = (
                        switch if switch_min is None
                        else min(switch_min, switch)
                    )
                    switch_max = (
                        switch if switch_max is None
                        else max(switch_max, switch)
                    )
        rows.append(
            {
                "D_order": n_value,
                "mu4_floor": str(mu4),
                "mu5_floor": str(mu5),
                "x_bounds": [str(x_lower), str(x_upper)],
                "y_bounds": [str(y_lower), str(y_upper)],
                "cap_modes": cap_modes,
            }
        )
    assert switch_checks == 13056
    payload = {
        "schema": "rank8-delta1-N-band-structure-diagnostic-v1",
        "status": "PASS_EXACT_STRUCTURAL_N_BAND_CHECK_NO_THEOREM_CLAIM",
        "D_orders_checked": [27, 42],
        "exact_M_orders_checked_per_D": "every integer 9<=M<=D-1",
        "cap_mode_pattern": ["q5", "q5", "q5", "path_ratio"],
        "switch_checks": switch_checks,
        "switch_range": [str(switch_min), str(switch_max)],
        "observed_small_cutoffs": {"D42": 26, "D41": 25},
        "positive_findings": [
            "the four x-slab cap modes do not change at any integer D order 27..42",
            "all exact ratio/missing-shadow switches lie strictly inside (0,1)",
            "the same normalized x/y partition is structurally reusable",
        ],
        "remaining_obstruction": (
            "This is not a sign certificate. A sound order band still needs "
            "the extra N-variable rational denominator and tensor Bernstein "
            "coefficients certified, and the triangular coupling M<=N-1 plus "
            "the changing small-F cutoff must not be replaced by an "
            "independent rectangular relaxation."
        ),
        "rows": rows,
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SWITCH_CHECKS", switch_checks)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
