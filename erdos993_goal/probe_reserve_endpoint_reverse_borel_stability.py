#!/usr/bin/env python3
"""Exact-line stress probe for the two one-parameter endpoint transforms."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from flint import ctx, fmpz_poly

from probe_path_isolate_p4_affine_target_rows import A, T, multiply, power
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import reduced_sources


OUT = Path("reserve_endpoint_reverse_borel_stability_probe_20260802.json")


def mul(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, u in enumerate(left):
        for j, v in enumerate(right):
            out[i + j] += u * v
    return out


def affine_powers(c0: int, c1: int, n: int) -> list[list[int]]:
    out = [[1]]
    for _ in range(n):
        out.append(mul(out[-1], [c0, c1]))
    return out


def line_values(K: dict[tuple[int, int], int], N: int, base: tuple[int, int], direction: tuple[int, int]) -> list[int]:
    # Multiplication by (N!)^2 clears both Borel factorial denominators.
    factorial = math.factorial(N)
    xp = affine_powers(base[0], direction[0], N)
    yp = affine_powers(base[1], direction[1], N)
    values = [0] * (2 * N + 1)
    for h in range(N + 1):
        for j in range(N + 1):
            c = K.get((N - h, N - j), 0)
            if not c:
                continue
            weight = c * (factorial // math.factorial(h)) * (factorial // math.factorial(j))
            term = mul(xp[h], yp[j])
            for degree, value in enumerate(term):
                values[degree] += weight * value
    while values and values[-1] == 0:
        values.pop()
    return values


def endpoint_kernel(package: str, m: int):
    if package == "group":
        # Work with the actual reduced source, before shifting away q^2.
        _, source = reduced_sources("group", 0, "m")
        c, x, r = 1, 2 * m, 2 * m
        a, b, N = 2 * c + m + x - 3, 2 * m - 1, m + r + 6
    else:
        _, source = reduced_sources("bottom", 1, "x")
        c, x, r = 0, 2 * m, 2 * m
        a, b, N = m + x - 3, 2 * m - 1, m + r + 3
    numeric = evaluate(source, c, m, x, N)
    return multiply(multiply(numeric, power(A, a, N), N), power(T, b, N), N), N


def main() -> None:
    ctx.prec = 80
    rng = random.Random(9930211)
    trials_per_case = 24
    records = []
    failures = []
    for package in ("group", "bottom"):
        for m in range(1, 21):
            K, N = endpoint_kernel(package, m)
            local = 0
            max_degree = 0
            for trial in range(trials_per_case):
                base = (rng.randint(-16, 16), rng.randint(-16, 16))
                direction = (rng.randint(1, 12), rng.randint(1, 12))
                values = line_values(K, N, base, direction)
                max_degree = max(max_degree, len(values) - 1)
                nonreal = sum(
                    multiplicity
                    for root, multiplicity in fmpz_poly(values).complex_roots()
                    if not root.imag.is_zero()
                )
                if nonreal:
                    local += 1
                    failures.append({
                        "package": package,
                        "m": m,
                        "trial": trial,
                        "base": base,
                        "direction": direction,
                        "nonreal": nonreal,
                    })
            records.append({"package": package, "m": m, "N": N, "max_line_degree": max_degree, "failure_count": local})
            print(records[-1], flush=True)
    report = {
        "kind": "reserve_endpoint_reverse_borel_stability_probe",
        "date": "2026-08-02",
        "status": "PASS_ENDPOINT_STABILITY_PROBE" if not failures else "ENDPOINT_STABILITY_FAILURE",
        "m_range": [1, 20],
        "trials_per_case": trials_per_case,
        "total_line_tests": len(records) * trials_per_case,
        "failure_count": len(failures),
        "records": records,
        "first_failures": failures[:20],
        "warning": "Positive-direction affine-line tests are necessary evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in ("records", "first_failures")}, indent=2))


if __name__ == "__main__":
    main()
