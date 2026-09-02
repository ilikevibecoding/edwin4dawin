"""Probe the Abel-summation bridge for the closest-root inequality.

If lambda_k=[t^k]H/[t^k]U decreases, then H(-z) is a positive weighted
sum of the coefficient-prefix sections of U(-z).  This script checks
whether every such section remains positive for 0<=z<rho, where -rho is
the closest zero of U.
"""

from fractions import Fraction
import json
from pathlib import Path
import random

import numpy as np

from probe_adjacent_cubic_coefficient_ratio_sign import reduced_R


def coefficients(p, a, u, v, c):
    n = p // 2
    out = [Fraction(c)]
    for k in range(n):
        base_ratio = Fraction((p - 2 * k) * (p - 2 * k - 1), (a + k + 1) * (k + 1))
        out.append(out[-1] * base_ratio * reduced_R(p, a, k + 1, u, v, c) / reduced_R(p, a, k, u, v, c))
    return out


def main():
    rng = random.Random(993_20260806)
    cases = 0
    sections = 0
    witness = None
    smallest_margin = None
    for p in list(range(13, 61)) + [70, 80, 100, 150]:
        for reserve in (13, 14, 16, 20, 25):
            a = p - reserve
            if a < 0:
                continue
            samples = [
                (Fraction(0), Fraction(0), Fraction(1, 100)),
                (Fraction(0), Fraction(1), Fraction(1)),
                (Fraction(1), Fraction(1), Fraction(25)),
                (Fraction(1, 100), Fraction(99, 100), Fraction(43, 10)),
            ]
            samples += [
                (Fraction(rng.randrange(101), 100), Fraction(rng.randrange(101), 100), Fraction(rng.randrange(1, 2501), 100))
                for _ in range(8)
            ]
            for u, v, c in samples:
                raw = coefficients(p, a, u, v, c)
                scale = max(float(abs(x)) for x in raw)
                coef = np.array([float(x) / scale for x in raw])
                roots = np.roots(coef[::-1])
                negative = sorted((-z.real for z in roots if abs(z.imag) < 1e-7 and z.real < 0))
                if len(negative) != len(raw) - 1:
                    continue
                rho = negative[0]
                # Chebyshev-like endpoint concentration plus a uniform grid.
                grid = rho * np.unique(np.r_[np.linspace(0, 1 - 1e-10, 401), 1 - 10.0 ** (-np.arange(1, 13))])
                powers = np.ones_like(grid)
                partial = np.zeros_like(grid)
                for k, ak in enumerate(coef):
                    partial += ak * powers
                    normalized = partial / max(abs(coef[0]), 1e-300)
                    margin = float(np.min(normalized))
                    sections += 1
                    if smallest_margin is None or margin < smallest_margin[0]:
                        smallest_margin = (margin, p, a, u, v, c, k, rho, float(grid[np.argmin(normalized)]))
                    if margin < -1e-8 and witness is None:
                        witness = {
                            "p": p, "alpha": a, "u": str(u), "v": str(v), "c": str(c),
                            "prefix_degree": k, "closest_root_magnitude": rho,
                            "z": float(grid[np.argmin(normalized)]), "normalized_value": margin,
                        }
                        break
                    powers *= -grid
                cases += 1
                if witness:
                    break
            if witness:
                break
        if witness:
            break
    report = {
        "status": "all_prefix_sections_positive" if witness is None else "counterexample",
        "cases": cases, "sections": sections, "first_witness": witness,
        "smallest_normalized_margin": None if smallest_margin is None else {
            "value": smallest_margin[0], "p": smallest_margin[1], "alpha": smallest_margin[2],
            "u": str(smallest_margin[3]), "v": str(smallest_margin[4]), "c": str(smallest_margin[5]),
            "prefix_degree": smallest_margin[6], "closest_root_magnitude": smallest_margin[7], "z": smallest_margin[8],
        },
    }
    out = Path(__file__).with_name("adjacent_cubic_abel_prefix_positivity_probe_20260806.json")
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
