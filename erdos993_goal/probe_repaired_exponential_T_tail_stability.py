#!/usr/bin/env python3
"""Test stability of the entire T-exponential tail after a G repair.

For a starting smoothing order b0, the tested trivariate polynomial is

  sum_{k>=0} B_N[A^(N-d) G^g T^(b0+k)](X,Y) U^k/k!.

If this polynomial is stable, all later T coefficients are stable and are in
the correct consecutive proper-position chain.  Exact affine-line tests give
finite evidence only.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from flint import ctx, fmpz_poly

from probe_fixed_defect_G_smoothing_threshold import repaired_kernel
from probe_reserve_endpoint_reverse_borel_stability import line_values, mul


OUT = Path("repaired_exponential_T_tail_stability_probe_20260802.json")


def add_scaled(target: list[int], source: list[int], scalar: int) -> list[int]:
    if len(target) < len(source):
        target.extend([0] * (len(source) - len(target)))
    for i, value in enumerate(source):
        target[i] += scalar * value
    while target and target[-1] == 0:
        target.pop()
    return target


def tail_line(
    N: int,
    defect: int,
    g_power: int,
    b0: int,
    xy_base: tuple[int, int],
    xy_direction: tuple[int, int],
    u_base: int,
    u_direction: int,
) -> list[int]:
    # T has minimum total z,w degree one, so no coefficient in the N-square
    # survives beyond total exponent 2N (the fixed G only lowers this bound).
    max_k = 2 * N - b0
    clearing = math.factorial(max_k)
    u_powers = [[1]]
    for _ in range(max_k):
        u_powers.append(mul(u_powers[-1], [u_base, u_direction]))
    result: list[int] = []
    for k in range(max_k + 1):
        kernel = repaired_kernel(N, defect, b0 + k, g_power)
        xy_values = line_values(kernel, N, xy_base, xy_direction)
        if not xy_values:
            continue
        term = mul(xy_values, u_powers[k])
        add_scaled(result, term, clearing // math.factorial(k))
    return result


def main() -> None:
    ctx.prec = 100
    rng = random.Random(9930251)
    trials = 12
    records = []
    failures = []

    # Include the actual endpoint orders and the two neighboring starting
    # orders, so that a genuine entry point can be distinguished from a pass
    # only at the coefficient specialization U=0.
    cases = []
    for m in range(1, 9):
        cases.append(("bottom", 3 * m + 3, 4, 1, 2 * m + 1))
        cases.append(("group", 3 * m + 4, 3, 2, 2 * m + 1))

    for package, N, defect, g_power, endpoint_b in cases:
        for b0 in sorted({max(0, endpoint_b - 1), endpoint_b, endpoint_b + 1}):
            local = 0
            for trial in range(trials):
                xy_base = (rng.randint(-12, 12), rng.randint(-12, 12))
                xy_direction = (rng.randint(1, 9), rng.randint(1, 9))
                u_base = rng.randint(-12, 12)
                u_direction = rng.randint(1, 9)
                values = tail_line(
                    N,
                    defect,
                    g_power,
                    b0,
                    xy_base,
                    xy_direction,
                    u_base,
                    u_direction,
                )
                nonreal = sum(
                    multiplicity
                    for root, multiplicity in fmpz_poly(values).complex_roots()
                    if not root.imag.is_zero()
                )
                if nonreal:
                    local += 1
                    if len(failures) < 40:
                        failures.append(
                            {
                                "package": package,
                                "N": N,
                                "b0": b0,
                                "trial": trial,
                                "xy_base": xy_base,
                                "xy_direction": xy_direction,
                                "u_base": u_base,
                                "u_direction": u_direction,
                                "nonreal": nonreal,
                            }
                        )
            record = {
                "package": package,
                "N": N,
                "endpoint_b": endpoint_b,
                "b0": b0,
                "failures": local,
            }
            records.append(record)
            print(record, flush=True)

    endpoint_failures = sum(
        record["failures"]
        for record in records
        if record["b0"] == record["endpoint_b"]
    )
    report = {
        "kind": "repaired_exponential_T_tail_stability_probe",
        "date": "2026-08-02",
        "status": "PASS_SAMPLED_ENDPOINT_TAILS" if endpoint_failures == 0 else "ENDPOINT_TAIL_FAILURE",
        "m_range": [1, 8],
        "trials_per_case": trials,
        "endpoint_failure_count": endpoint_failures,
        "records": records,
        "first_failures": failures,
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "endpoint_failure_count": endpoint_failures,
                "output": str(OUT.resolve()),
            },
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
