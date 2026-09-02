"""Exact probe of a Hausdorff-moment representation for the lowering row.

Let lambda_k=[t^k]H/[t^k]U (up to one positive common constant) and set
mu_k=lambda_k/(n-k), 0<=k<n.  If mu is a truncated Hausdorff moment
sequence, then H is a positive mixture of n U(st)-st U'(st), proving the
closest-root order.  This script checks every finite-difference inequality
(-1)^j Delta^j mu_k >= 0 on exact rational samples.
"""

from fractions import Fraction
import json
from pathlib import Path
import random

from probe_adjacent_cubic_coefficient_ratio_sign import lam


def main():
    rng = random.Random(993_20260806)
    cases = 0
    inequalities = 0
    minimum = None
    witness = None
    order_failures = {}
    for p in range(13, 81):
        for reserve in (13, 14, 16, 20, 25):
            a = p - reserve
            if a < 0:
                continue
            n = p // 2
            samples = [
                (Fraction(0), Fraction(0), Fraction(1, 100)),
                (Fraction(0), Fraction(1), Fraction(1)),
                (Fraction(1), Fraction(1), Fraction(25)),
                (Fraction(1, 100), Fraction(99, 100), Fraction(43, 10)),
            ]
            samples += [
                (
                    Fraction(rng.randrange(0, 101), 100),
                    Fraction(rng.randrange(0, 101), 100),
                    Fraction(rng.randrange(1, 2501), 100),
                )
                for _ in range(6)
            ]
            for u, v, c in samples:
                cases += 1
                try:
                    row = [
                        lam(p, a, k, u, v, c)
                        / ((p - 2 * k) * (p - 2 * k - 1))
                        for k in range(n)
                    ]
                except ZeroDivisionError:
                    continue
                current = row
                for order in range(n):
                    sign = -1 if order % 2 else 1
                    for k, value in enumerate(current):
                        signed = sign * value
                        inequalities += 1
                        if minimum is None or signed < minimum[0]:
                            minimum = (signed, p, a, u, v, c, order, k)
                        if signed < 0:
                            order_failures[str(order)] = order_failures.get(str(order), 0) + 1
                            if witness is None:
                                witness = {
                                    "p": p, "alpha": a, "reserve": reserve,
                                    "u": str(u), "v": str(v), "c": str(c),
                                    "difference_order": order, "k": k,
                                    "signed_difference": str(signed),
                                    "decimal": float(signed),
                                }
                    current = [current[k + 1] - current[k] for k in range(len(current) - 1)]
    report = {
        "status": "all_hausdorff_signs_pass" if witness is None else "counterexample",
        "cases": cases,
        "inequalities": inequalities,
        "failure_orders": order_failures,
        "first_witness": witness,
        "minimum_signed_difference": None if minimum is None else {
            "value": str(minimum[0]), "decimal": float(minimum[0]),
            "p": minimum[1], "alpha": minimum[2], "u": str(minimum[3]),
            "v": str(minimum[4]), "c": str(minimum[5]),
            "order": minimum[6], "k": minimum[7],
        },
    }
    out = Path(__file__).with_name("adjacent_cubic_hausdorff_multiplier_probe_20260806.json")
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
