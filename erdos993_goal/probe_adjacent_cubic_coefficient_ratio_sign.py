"""Exact sign probe for the adjacent-row coefficient-ratio route.

For U=S_{p,a}[G_c] and H=S_{p-2,a+1}[G_c], remove the common
factorial prefactors and form the adjacent/current coefficient ratio

    lambda_k = (p-2k)(p-2k-1)/(a+k+1) * R'(k)/R(k).

This script checks whether lambda_{k+1}-lambda_k has a uniform sign
on exact rational samples in the reserve p-a >= 13.  It is a route
probe only, not a proof certificate.
"""

from fractions import Fraction
import json
import random
from pathlib import Path


def falling(x, h):
    out = 1
    for j in range(h):
        out *= x - j
    return out


def gamma(u, v, c):
    return (c, 1 - c * (u + v), c * u * v - (u + v), u * v)


def reduced_R(p, a, k, u, v, c):
    nsum = p + a
    g = gamma(u, v, c)
    out = Fraction(0)
    for h in range(4):
        out += g[h] * Fraction(falling(nsum, h) * falling(k, h), falling(p, 2 * h))
    return out


def lam(p, a, k, u, v, c):
    rp = reduced_R(p - 2, a + 1, k, u, v, c)
    r = reduced_R(p, a, k, u, v, c)
    return Fraction((p - 2 * k) * (p - 2 * k - 1), a + k + 1) * rp / r


def main():
    rng = random.Random(993_20260806)
    counts = {"positive": 0, "negative": 0, "zero": 0, "undefined": 0}
    witnesses = {"positive": None, "negative": None, "zero": None}
    trials = 0

    # Include both parity boundaries, larger reserves, endpoints, and broad c.
    fixed_uv = [
        (Fraction(0), Fraction(0)),
        (Fraction(0), Fraction(1)),
        (Fraction(1), Fraction(1)),
        (Fraction(1, 100), Fraction(99, 100)),
        (Fraction(19, 20), Fraction(103, 500)),
    ]
    for p in range(13, 91):
        for reserve in (13, 14, 15, 16, 19, 25):
            a = p - reserve
            if a < 0:
                continue
            n = p // 2
            samples = list(fixed_uv)
            samples.extend(
                (Fraction(rng.randrange(0, 101), 100), Fraction(rng.randrange(0, 101), 100))
                for _ in range(8)
            )
            for u, v in samples:
                for c in (Fraction(1, 100), Fraction(1, 2), Fraction(1), Fraction(43, 10), Fraction(25)):
                    for k in range(max(0, n - 1)):
                        trials += 1
                        try:
                            d = lam(p, a, k + 1, u, v, c) - lam(p, a, k, u, v, c)
                        except ZeroDivisionError:
                            counts["undefined"] += 1
                            continue
                        key = "positive" if d > 0 else "negative" if d < 0 else "zero"
                        counts[key] += 1
                        if witnesses[key] is None:
                            witnesses[key] = {
                                "p": p,
                                "alpha": a,
                                "reserve": reserve,
                                "u": str(u),
                                "v": str(v),
                                "c": str(c),
                                "k": k,
                                "difference": str(d),
                                "decimal": float(d),
                            }

    report = {
        "status": "uniform" if not (counts["positive"] and counts["negative"]) else "mixed_sign",
        "trials": trials,
        "counts": counts,
        "first_witnesses": witnesses,
    }
    out = Path(__file__).with_name("adjacent_cubic_coefficient_ratio_sign_probe_20260806.json")
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
