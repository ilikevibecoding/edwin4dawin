#!/usr/bin/env python3
"""Probe stability of the reverse bivariate Borel transform of final reserves.

For K(z,w) and target N define

  Phi_N(X,Y)=sum K[N-h,N-j] X^h Y^j/(h! j!).

If Phi_N is real stable, the homogeneous Jensen components of
exp(s)*Phi_N(x,y), including the ternary reserve transform, are stable.
"""

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


OUTPUT_PATH = Path("path_isolate_p4_affine_parameter_monotonicity_wide_reserve_reverse_borel_stability_probe_20260802.json")


def mul(left, right):
    out = [0] * (len(left) + len(right) - 1)
    for i, u in enumerate(left):
        for j, v in enumerate(right):
            out[i + j] += u * v
    return out


def powers(c0, c1, N):
    out = [[1]]
    for _ in range(N):
        out.append(mul(out[-1], [c0, c1]))
    return out


def main():
    ctx.prec = 80
    rng = random.Random(9930205)
    raw = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))["records"]
    selected = {}
    for record in raw:
        key = (record["package"], int(record["parity"]), record["coordinate"])
        if key not in selected or int(record["r"]) < int(selected[key]["r"]):
            selected[key] = record
    summaries, failures = [], []
    for key, record in selected.items():
        package, parity, coordinate = key
        c = int(record.get("c") or 0)
        m, x, r = int(record["m"]), int(record["x"]), int(record["r"])
        _, source = reduced_sources(package, parity, coordinate)
        a = 2 * c + m + x - 3 if package == "group" else m + x - 3
        b = 2 * m + parity - 1 if package == "group" else 2 * m + parity - 2
        N = m + r + 5 + int(coordinate == "m") - (2 if package == "bottom" else 0)
        numeric = evaluate(source, c, m, x, N)
        K = multiply(multiply(numeric, power(A, a, N), N), power(T, b, N), N)
        factorial = math.factorial(N)
        coefficients = {
            (h, j): K.get((N - h, N - j), 0)
            * (factorial // math.factorial(h))
            * (factorial // math.factorial(j))
            for h in range(N + 1) for j in range(N + 1)
        }
        local_failures = 0
        for trial in range(100):
            base = (rng.randint(-12, 12), rng.randint(-12, 12))
            direction = (rng.randint(1, 9), rng.randint(1, 9))
            xp = powers(base[0], direction[0], N)
            yp = powers(base[1], direction[1], N)
            values = [0] * (2 * N + 1)
            for (h, j), coefficient in coefficients.items():
                if not coefficient:
                    continue
                term = mul(xp[h], yp[j])
                for degree, value in enumerate(term):
                    values[degree] += coefficient * value
            while values and values[-1] == 0:
                values.pop()
            nonreal = sum(mult for root, mult in fmpz_poly(values).complex_roots() if not root.imag.is_zero())
            if nonreal:
                local_failures += 1
                failures.append({"key": key, "trial": trial, "base": base, "direction": direction, "nonreal": nonreal})
        summaries.append({"key": key, "m": m, "x": x, "r": r, "N": N, "failure_count": local_failures})
    report = {
        "status": "PASS_REVERSE_BOREL_STABILITY_PROBE" if not failures else "REVERSE_BOREL_STABILITY_FAILURE",
        "source_type_count": len(selected),
        "trials_per_type": 100,
        "failure_count": len(failures),
        "summaries": summaries,
        "first_failures": failures[:20],
        "warning": "Random positive-direction line tests only; not a proof of real stability.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
