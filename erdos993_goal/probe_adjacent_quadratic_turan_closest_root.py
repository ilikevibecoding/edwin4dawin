"""Probe the quadratic-row Turan reduction for the cubic closest root.

For Q=(1-ut)(1-vt), put A=S[p,a]Q, B=S[p-2,a+1]Q,
C=S[p-4,a+2]Q.  The cubic rows satisfy U=cA+tB and H=cB+tC.
At U(-z)=0, H(-z) has the sign of B(-z)^2-A(-z)C(-z).
"""

from fractions import Fraction
from math import comb
import json
from pathlib import Path
import random

import mpmath as mp
import numpy as np


def falling(x, h):
    out = 1
    for j in range(h):
        out *= x - j
    return out


def reduced_R(p, a, k, gamma):
    ambient = p + a
    return sum(
        gamma[h] * Fraction(falling(ambient, h) * falling(k, h), falling(p, 2 * h))
        for h in range(min(k, len(gamma) - 1) + 1)
    )


def normalized_coefficients(p, a, gamma):
    n = p // 2
    row = [Fraction(1)]
    for k in range(n):
        ratio = Fraction((p - 2 * k) * (p - 2 * k - 1), (a + k + 1) * (k + 1))
        row.append(row[-1] * ratio * reduced_R(p, a, k + 1, gamma) / reduced_R(p, a, k, gamma))
    return row


def evaluate(row, t):
    out = mp.mpf("0")
    for value in reversed(row):
        out = out * t + mp.mpf(value.numerator) / value.denominator
    return out


def closest_magnitude(row):
    coef = np.array([float(x) for x in row])
    coef /= max(abs(coef))
    roots = np.roots(coef[::-1])
    candidates = sorted(-z.real for z in roots if abs(z.imag) < 2e-7 and z.real < 0)
    return candidates[0]


def main():
    mp.mp.dps = 70
    rng = random.Random(993_20260806)
    cases = 0
    evaluations = 0
    witness = None
    minimum = None
    for p in list(range(13, 51)) + [75, 100, 150, 250]:
        for reserve in (13, 14, 16, 20, 25):
            a = p - reserve
            if a < 0:
                continue
            samples = [(Fraction(0), Fraction(0)), (Fraction(0), Fraction(1)), (Fraction(1), Fraction(1)), (Fraction(1,100), Fraction(99,100))]
            samples += [(Fraction(rng.randrange(101),100), Fraction(rng.randrange(101),100)) for _ in range(4)]
            for u, v in samples:
                gamma = [Fraction(1), -(u + v), u * v]
                A = normalized_coefficients(p, a, gamma)
                B = normalized_coefficients(p - 2, a + 1, gamma)
                C = normalized_coefficients(p - 4, a + 2, gamma)
                rho = min(closest_magnitude(A), closest_magnitude(B), closest_magnitude(C))
                total = p + 2 * a
                A0, B0, C0 = comb(total, a), comb(total, a + 1), comb(total, a + 2)
                scale = mp.mpf(A0) * C0
                grid = rho * np.unique(np.r_[np.linspace(0, 1 - 1e-9, 61), 1 - 10.0 ** (-np.arange(1, 11))])
                for z in grid:
                    aa, bb, cc = evaluate(A, -z), evaluate(B, -z), evaluate(C, -z)
                    turan = (mp.mpf(B0) ** 2 * bb**2 - mp.mpf(A0) * C0 * aa * cc) / scale
                    evaluations += 1
                    value = float(turan)
                    if minimum is None or value < minimum[0]:
                        minimum = (value, p, a, u, v, float(z), rho)
                    if value < -1e-30:
                        witness = {"p":p,"alpha":a,"u":str(u),"v":str(v),"z":float(z),"common_positive_radius":rho,"normalized_turan":value}
                        break
                cases += 1
                if witness: break
            if witness: break
        if witness: break
    report = {
        "status":"all_sampled_turan_values_nonnegative" if witness is None else "counterexample",
        "cases":cases,"evaluations":evaluations,"first_witness":witness,
        "minimum":None if minimum is None else {"value":minimum[0],"p":minimum[1],"alpha":minimum[2],"u":str(minimum[3]),"v":str(minimum[4]),"z":minimum[5],"common_positive_radius":minimum[6]},
    }
    out=Path(__file__).with_name("adjacent_quadratic_turan_closest_root_probe_20260806.json")
    out.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2))


if __name__=="__main__": main()
