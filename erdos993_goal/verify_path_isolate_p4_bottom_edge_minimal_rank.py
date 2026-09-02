#!/usr/bin/env python3
"""Independent exact replay of the h=0 minimal-rank formulas."""

from __future__ import annotations

import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_cross_polarizations import (
    cross_polarization,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def expected(m: int, x: int, parity: int) -> int:
    if parity == 0:
        numerator = (
            4
            * math.comb(2 * m, m)
            * (
                12 * m**3
                + 4 * m**2 * x
                - 6 * m**2
                + 6 * m * x
                + 33 * m
                + 2 * x
                + 9
            )
        )
        denominator = (m + 1) * (m + 2)
    else:
        numerator = (
            8
            * math.comb(2 * m + 1, m)
            * (m + 1)
        )
        denominator = m + 2
    assert numerator % denominator == 0
    return numerator // denominator


def main() -> None:
    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    formula_checks = 0
    support_checks = 0
    lower_rank_zero_checks = 0
    failures = []
    try:
        for parity in (0, 1):
            for m in range(3, 21):
                j = 2 * m + parity
                q = m + 2
                for x in range(21):
                    length = 2 * m + x
                    states_q = direct.terminal_series(
                        q, length, j, return_states=True
                    )
                    states_lower = direct.terminal_series(
                        q - 1,
                        length,
                        j,
                        return_states=True,
                    )

                    def kernel(a: int, b: int) -> int:
                        return int(
                            sum(
                                sign
                                * cross_polarization(
                                    states_q,
                                    states_lower,
                                    phase_name,
                                    a,
                                    b,
                                )
                                for phase_name, sign in (
                                    ("new", 1),
                                    ("old", -1),
                                    ("lower", -1),
                                )
                            )
                        )

                    values = [
                        kernel(u, j - u)
                        for u in range(j + 1)
                    ]
                    total = sum(
                        math.comb(j, u) * value
                        for u, value in enumerate(values)
                    )
                    target = expected(m, x, parity)
                    formula_checks += 1
                    if total != target:
                        failures.append(
                            {
                                "kind": "formula",
                                "parity": parity,
                                "m": m,
                                "x": x,
                                "actual": total,
                                "expected": target,
                            }
                        )

                    allowed = (
                        range(m - 4, m + 4)
                        if parity == 0
                        else range(m - 3, m + 4)
                    )
                    allowed_set = {
                        u for u in allowed if 0 <= u <= j
                    }
                    support_checks += j + 1 - len(allowed_set)
                    for u, value in enumerate(values):
                        if u not in allowed_set and value != 0:
                            failures.append(
                                {
                                    "kind": "support",
                                    "parity": parity,
                                    "m": m,
                                    "x": x,
                                    "u": u,
                                    "value": value,
                                }
                            )

                # At stable length 2q'-4, every lower rank is zero.
                for lower_q in range(2, q):
                    lower_length = 2 * lower_q - 4
                    states = direct.terminal_series(
                        lower_q,
                        lower_length,
                        j,
                        return_states=True,
                    )
                    states_down = direct.terminal_series(
                        lower_q - 1,
                        lower_length,
                        j,
                        return_states=True,
                    )
                    lower_total = 0
                    for u in range(j + 1):
                        value = sum(
                            sign
                            * cross_polarization(
                                states,
                                states_down,
                                phase_name,
                                u,
                                j - u,
                            )
                            for phase_name, sign in (
                                ("new", 1),
                                ("old", -1),
                                ("lower", -1),
                            )
                        )
                        lower_total += math.comb(j, u) * value
                    lower_rank_zero_checks += 1
                    if lower_total != 0:
                        failures.append(
                            {
                                "kind": "lower_rank_zero",
                                "parity": parity,
                                "m": m,
                                "q": lower_q,
                                "value": int(lower_total),
                            }
                        )
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_EDGE_MINIMAL_RANK_REPLAY"
            if not failures
            else "FAIL"
        ),
        "engine": (
            "integer path counts and direct terminal-state "
            "polarization; no symbolic formula code reused"
        ),
        "m_range": "3..20",
        "x_range": "0..20",
        "formula_checks": formula_checks,
        "off_window_support_zero_checks": support_checks,
        "lower_rank_zero_checks": lower_rank_zero_checks,
        "failure_count": len(failures),
        "first_failures": failures[:50],
    }
    Path(
        "path_isolate_p4_bottom_edge_minimal_rank_replay_"
        "20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
