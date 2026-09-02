#!/usr/bin/env python3
"""Probe bivariate stability of the bare reserve's (T-index, j-index) kernel."""

from __future__ import annotations

import json
import random
from pathlib import Path

from flint import ctx, fmpz_poly

from probe_group_reserve_hypergeometric_summands import fixed_k
from probe_reserve_endpoint_reverse_borel_stability import affine_powers, mul


OUT = Path("bare_reserve_k_j_stability_probe_20260802.json")


def main():
    ctx.prec = 100
    rng = random.Random(9930217)
    records, failures = [], []
    for m in range(1, 21):
        a, b, r, N = 3 * m + 1, 2 * m + 1, 2 * m, 3 * m + 4
        coeff = {(k, j): fixed_k(a, b, r, N, 0, 0, k)[j] for k in range(b + 1) for j in range(r + 1)}
        local = 0
        for trial in range(40):
            base = (rng.randint(-16, 16), rng.randint(-16, 16))
            direction = (rng.randint(1, 12), rng.randint(1, 12))
            up = affine_powers(base[0], direction[0], b)
            tp = affine_powers(base[1], direction[1], r)
            values = [0] * (b + r + 1)
            for (k, j), c in coeff.items():
                if not c:
                    continue
                term = mul(up[k], tp[j])
                for degree, value in enumerate(term):
                    values[degree] += c * value
            while values and values[-1] == 0:
                values.pop()
            nonreal = sum(mu for root, mu in fmpz_poly(values).complex_roots() if not root.imag.is_zero())
            if nonreal:
                local += 1
                failures.append({"m": m, "trial": trial, "base": base, "direction": direction, "nonreal": nonreal})
        row = {"m": m, "a": a, "b": b, "r": r, "N": N, "failure_count": local}
        records.append(row)
        print(row, flush=True)
    report = {
        "kind": "bare_reserve_k_j_stability_probe",
        "date": "2026-08-02",
        "status": "PASS_K_J_STABILITY_PROBE" if not failures else "K_J_STABILITY_FAILURE",
        "m_range": [1, 20],
        "trials_per_case": 40,
        "failure_count": len(failures),
        "records": records,
        "first_failures": failures[:30],
        "warning": "Finite positive-direction line tests only.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in ("records", "first_failures")}, indent=2))


if __name__ == "__main__":
    main()
