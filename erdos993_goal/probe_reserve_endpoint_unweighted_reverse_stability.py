#!/usr/bin/env python3
"""Test the stronger unweighted reverse-section stability conjecture."""

from __future__ import annotations

import json
import random
from pathlib import Path

from flint import ctx, fmpz_poly

from probe_reserve_endpoint_reverse_borel_stability import affine_powers, endpoint_kernel, mul


OUT = Path("reserve_endpoint_unweighted_reverse_stability_probe_20260802.json")


def line_values(K, N, base, direction):
    xp = affine_powers(base[0], direction[0], N)
    yp = affine_powers(base[1], direction[1], N)
    values = [0] * (2 * N + 1)
    for h in range(N + 1):
        for j in range(N + 1):
            c = K.get((N - h, N - j), 0)
            if not c:
                continue
            term = mul(xp[h], yp[j])
            for degree, value in enumerate(term):
                values[degree] += c * value
    while values and values[-1] == 0:
        values.pop()
    return values


def main():
    ctx.prec = 80
    rng = random.Random(9930213)
    records, failures = [], []
    for package in ("group", "bottom"):
        for m in range(1, 21):
            K, N = endpoint_kernel(package, m)
            local = 0
            for trial in range(24):
                base = (rng.randint(-16, 16), rng.randint(-16, 16))
                direction = (rng.randint(1, 12), rng.randint(1, 12))
                values = line_values(K, N, base, direction)
                nonreal = sum(mu for root, mu in fmpz_poly(values).complex_roots() if not root.imag.is_zero())
                if nonreal:
                    local += 1
                    failures.append({"package": package, "m": m, "trial": trial, "base": base, "direction": direction, "nonreal": nonreal})
            row = {"package": package, "m": m, "N": N, "failure_count": local}
            records.append(row)
            print(row, flush=True)
    report = {
        "kind": "reserve_endpoint_unweighted_reverse_stability_probe",
        "date": "2026-08-02",
        "status": "PASS_UNWEIGHTED_REVERSE_PROBE" if not failures else "UNWEIGHTED_REVERSE_FAILURE",
        "m_range": [1, 20],
        "trials_per_case": 24,
        "total_line_tests": 960,
        "failure_count": len(failures),
        "records": records,
        "first_failures": failures[:30],
        "implication_if_proved": "Separate factorial multiplier sequences map this reverse section to the stable reverse-Borel transform.",
        "warning": "Finite affine-line evidence only.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in ("records", "first_failures")}, indent=2))


if __name__ == "__main__":
    main()
