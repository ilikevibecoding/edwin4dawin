#!/usr/bin/env python3
"""Test finite-binomial factorizations of the bottom endpoint.

For C at least the coordinate degree, gamma_p=binom(C,p) is a finite
multiplier sequence.  Thus, if the coefficientwise inverse
H_C has [X^pY^q]H_C=[X^pY^q]F/(binom(C,p)binom(C,q)) and H_C is stable,
then F is stable.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from flint import ctx
import sympy as sp

from explore_bottom_slice_hypergeometric import X, Y, bottom_target
from probe_output_multiplier_bottom_stability import line_polynomial, nonreal


OUT = Path("inverse_binomial_bottom_stability_probe_20260802.json")


def inverse_binomial(poly: sp.Poly, C: int) -> sp.Poly:
    return sp.Poly(sp.expand(sum(
        coefficient/sp.binomial(C, p)/sp.binomial(C, q)*X**p*Y**q
        for (p, q), coefficient in poly.terms()
    )), X, Y)


def main() -> None:
    ctx.prec = 128
    rng = random.Random(993_20260802 + 211)
    records = []
    witnesses = []
    for m in range(1, 13):
        N = 3*m+3
        R = 4*m+3
        target = bottom_target(m)
        lines = [(rng.randint(-100, 100), rng.randint(1, 40), rng.randint(-100, 100), rng.randint(1, 40)) for _ in range(30)]
        for label, C in (("N", N), ("N+1", N+1), ("R", R), ("2N", 2*N)):
            transformed = inverse_binomial(target, C)
            failures = 0
            for trial, line in enumerate(lines):
                count = nonreal(line_polynomial(transformed, line))
                failures += bool(count)
                if count and len(witnesses) < 50:
                    witnesses.append({"m": m, "label": label, "C": C, "trial": trial, "line": line, "nonreal": count})
            record = {"m": m, "N": N, "label": label, "C": C, "trials": len(lines), "failures": failures}
            records.append(record)
            print(json.dumps(record), flush=True)
    totals = {label: sum(r["failures"] for r in records if r["label"] == label) for label in ("N", "N+1", "R", "2N")}
    report = {
        "kind": "inverse_binomial_bottom_stability_probe",
        "date": "2026-08-02",
        "status": "DONE_FINITE_EXACT_INVERSE_BINOMIAL_SCAN",
        "m_range": [1, 12],
        "failure_totals": totals,
        "records": records,
        "first_failures": witnesses,
        "warning": "Finite exact affine-line tests only.",
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"failure_totals": totals, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
