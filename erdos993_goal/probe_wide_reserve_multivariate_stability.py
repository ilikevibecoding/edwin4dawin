#!/usr/bin/env python3
"""Random hyperbolicity-line probe for every affine reserve source type."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from flint import ctx, fmpz_poly

from analyze_wide_reserve_order_nyquist_induction import SOURCE_PATH
from probe_path_isolate_p4_affine_target_rows import A, T, multiply, power
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import reduced_sources


OUTPUT_PATH = Path("path_isolate_p4_affine_parameter_monotonicity_wide_reserve_multivariate_stability_probe_20260802.json")


def final_kernel(source, a, b, N, c, m, x):
    numeric = evaluate(source, c, m, x, N)
    return multiply(multiply(numeric, power(A, a, N), N), power(T, b, N), N)


def multiply_univariate(left, right):
    out = [0] * (len(left) + len(right) - 1)
    for i, u in enumerate(left):
        for j, v in enumerate(right):
            out[i + j] += u * v
    return out


def line_polynomial(K, r, N, base, direction):
    def powers(c0, c1):
        out = [[1]]
        for _ in range(r):
            out.append(multiply_univariate(out[-1], [c0, c1]))
        return out
    ps = powers(base[0], direction[0])
    px = powers(base[1], direction[1])
    py = powers(base[2], direction[2])
    factorial = [math.factorial(k) for k in range(r + 1)]
    out = [0] * (r + 1)
    for h in range(r + 1):
        for j in range(r - h + 1):
            coefficient = K.get((N - h, N - j), 0)
            if not coefficient:
                continue
            weight = factorial[r] // (factorial[h] * factorial[j] * factorial[r - h - j])
            term = multiply_univariate(multiply_univariate(px[h], py[j]), ps[r - h - j])
            for degree, value in enumerate(term):
                out[degree] += coefficient * weight * value
    return out


def main():
    ctx.prec = 80
    rng = random.Random(9930204)
    raw = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))["records"]
    selected = {}
    for record in raw:
        key = (record["package"], int(record["parity"]), record["coordinate"])
        if key not in selected or int(record["r"]) < int(selected[key]["r"]):
            selected[key] = record
    failures = []
    summaries = []
    for key, record in selected.items():
        package, parity, coordinate = key
        c = int(record.get("c") or 0)
        m, x, r = int(record["m"]), int(record["x"]), int(record["r"])
        _, source = reduced_sources(package, parity, coordinate)
        a = 2 * c + m + x - 3 if package == "group" else m + x - 3
        b = 2 * m + parity - 1 if package == "group" else 2 * m + parity - 2
        N = m + r + 5 + int(coordinate == "m") - (2 if package == "bottom" else 0)
        K = final_kernel(source, a, b, N, c, m, x)
        local_failures = 0
        for trial in range(40):
            base = tuple(rng.randint(-6, 6) for _ in range(3))
            direction = tuple(rng.randint(1, 7) for _ in range(3))
            values = line_polynomial(K, r, N, base, direction)
            nonreal = sum(mult for root, mult in fmpz_poly(values).complex_roots() if not root.imag.is_zero())
            if nonreal:
                local_failures += 1
                failures.append({"key": key, "trial": trial, "base": base, "direction": direction, "nonreal": nonreal})
        summaries.append({"key": key, "m": m, "x": x, "r": r, "failure_count": local_failures})
    report = {
        "status": "PASS_WIDE_MULTIVARIATE_STABILITY_PROBE" if not failures else "WIDE_MULTIVARIATE_STABILITY_FAILURE",
        "source_type_count": len(selected),
        "trials_per_type": 40,
        "failure_count": len(failures),
        "summaries": summaries,
        "first_failures": failures[:20],
        "warning": "Random positive-direction line tests only; not a stability proof.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
