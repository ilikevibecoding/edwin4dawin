"""Search for abstract counterexamples to the proposed coefficient-ratio bridge.

U has n positive root magnitudes r_i and H has n-1 magnitudes s_i.
We require the already-proved one-sided overlap s_i <= r_{i+2}, and test
whether decreasing coefficient ratios H_k/U_k can coexist with failure of
the desired inequality r_i <= s_i.
"""

import json
from pathlib import Path
import random

import numpy as np


def ascending_coefficients(root_magnitudes):
    # prod(t+r), returned in ascending monomial order.
    return np.polynomial.polynomial.polyfromroots([-x for x in root_magnitudes])


def main():
    rng = random.Random(993_20260806)
    tested = 0
    qualified = 0
    witness = None
    for n in range(3, 13):
        for _ in range(500_000):
            # Log-uniform roots avoid hiding scale-separated failures.
            r = sorted(10 ** rng.uniform(-3, 3) for _ in range(n))
            s = sorted(10 ** rng.uniform(-3, 3) for _ in range(n - 1))
            tested += 1
            if not all(s[i] <= r[i + 2] for i in range(n - 2)):
                continue
            ac = ascending_coefficients(r)
            bc = ascending_coefficients(s)
            ratios = bc / ac[:n]
            decreasing = all(ratios[k] >= ratios[k + 1] for k in range(n - 1))
            if not decreasing:
                continue
            qualified += 1
            desired = r[0] <= s[0]
            if not desired:
                witness = {
                    "degree": n,
                    "current_root_magnitudes": r,
                    "adjacent_root_magnitudes": s,
                    "coefficient_ratios": ratios.tolist(),
                    "one_sided": True,
                    "desired": False,
                    "first_failed_index": 0,
                }
                break
        if witness is not None:
            break
    report = {
        "status": "counterexample" if witness else "no_counterexample_found",
        "tested": tested,
        "qualified": qualified,
        "witness": witness,
    }
    out = Path(__file__).with_name("ratio_plus_one_sided_root_order_probe_20260806.json")
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
