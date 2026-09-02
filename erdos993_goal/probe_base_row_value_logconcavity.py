"""Probe value-log-concavity of all adjacent source-1 rows.

For X_j=S_{p-2j,a+j}[1], the exact identity
S_{p-2j,a+j}[(1-ut)(1-vt)]
 = X_j-(u+v)t X_{j+1}+uv t^2 X_{j+2}
turns the quadratic Turan target into convolution preservation if the
positive value sequence X_j(-z) is log-concave in j.
"""

from fractions import Fraction
from math import comb
import json
from pathlib import Path

import mpmath as mp
import numpy as np

from probe_adjacent_quadratic_turan_closest_root import normalized_coefficients, evaluate


def main():
    mp.mp.dps = 60
    checked = 0
    witness = None
    minimum = None
    monotonicity_failures = 0
    smallest_increment = None
    for p in list(range(13, 81)) + [100, 150, 250]:
        a = p - 13
        n = p // 2
        total = p + 2 * a
        rows = []
        for j in range(n + 1):
            rows.append((comb(total, a + j), normalized_coefficients(p - 2*j, a + j, [Fraction(1)])))
        coef0 = np.array([float(x) for x in rows[0][1]])
        coef0 /= max(abs(coef0))
        roots = np.roots(coef0[::-1])
        rho = min(-z.real for z in roots if abs(z.imag) < 1e-7 and z.real < 0)
        grid = rho * np.unique(np.r_[np.linspace(0, 1 - 1e-6, 101), 1 - 10.0**(-np.arange(1,7))])
        previous_ratios = None
        for z in grid:
            values = [mp.mpf(c0)*evaluate(row,-z) for c0,row in rows]
            if any(x <= 0 for x in values):
                witness = {"kind":"positivity","p":p,"alpha":a,"z":float(z),"rho":rho}
                break
            for j in range(1,n):
                turan = values[j]**2-values[j-1]*values[j+1]
                normalized = turan/(values[j]**2)
                value=float(normalized)
                checked += 1
                if minimum is None or value < minimum[0]: minimum=(value,p,a,j,float(z),rho)
                if value < -1e-30:
                    witness={"kind":"logconcavity","p":p,"alpha":a,"j":j,"z":float(z),"rho":rho,"normalized_turan":value}
                    break
            ratios = [values[j]**2/(values[j-1]*values[j+1]) for j in range(1,n)]
            if previous_ratios is not None:
                for j, (old, new) in enumerate(zip(previous_ratios, ratios), start=1):
                    increment = float(new-old)
                    if smallest_increment is None or increment < smallest_increment[0]:
                        smallest_increment=(increment,p,a,j,float(z),rho)
                    if increment < -1e-25:
                        monotonicity_failures += 1
                        if witness is None:
                            witness={"kind":"ratio_monotonicity_in_z","p":p,"alpha":a,"j":j,"z":float(z),"rho":rho,"increment":increment}
                        break
            previous_ratios = ratios
            if witness: break
        if witness: break
    report={"status":"all_base_rows_value_logconcave_and_ratio_increasing" if witness is None else "counterexample","checks":checked,"monotonicity_failures":monotonicity_failures,"first_witness":witness,"minimum":None if minimum is None else {"value":minimum[0],"p":minimum[1],"alpha":minimum[2],"j":minimum[3],"z":minimum[4],"rho":minimum[5]},"smallest_ratio_increment":None if smallest_increment is None else {"value":smallest_increment[0],"p":smallest_increment[1],"alpha":smallest_increment[2],"j":smallest_increment[3],"z":smallest_increment[4],"rho":smallest_increment[5]}}
    out=Path(__file__).with_name("base_row_value_logconcavity_probe_20260806.json")
    out.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2))


if __name__=="__main__":main()
