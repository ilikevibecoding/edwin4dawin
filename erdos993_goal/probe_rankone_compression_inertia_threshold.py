#!/usr/bin/env python3
"""Exact adversarial probe of the rank-one compression inertia threshold.

For a monic real-rooted g of degree N and

  h = sum_i lambda_i g/(X-r_i),  lambda_i>0, sum_i lambda_i=N,

the pencil g+u h has a rank-one Hermitian determinant representation and
leading(h)=leading(g').  Test

  S^d(g tensor g)-S^(d-2)(h tensor h)

at d*=floor(2N/3)+1, the exact point where the last relevant elementary
symmetric function of the one-negative derivative matrix changes sign.
Every line and coefficient is exact; Flint supplies certified root counts.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from probe_catalan_smoothed_proper_position import derivative_sum_line, derivative_table
from probe_generic_compression_endpoint_pencil import compression_polynomial
from probe_umbral_repaired_core_stability import X, add, integer_values


OUT = Path("rankone_compression_inertia_threshold_probe_20260802.json")


def nonreal(values: list[sp.Rational]) -> int:
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(integer_values(values)).complex_roots()
        if not root.imag.is_zero()
    )


def model_weights(N: int, model: int, rng: random.Random) -> tuple[str, list[int]]:
    if model == 0:
        return "equal", [1]*N
    if model == 1:
        return "increasing", [10**(i % 10) for i in range(N)]
    if model == 2:
        return "decreasing", [10**((N-1-i) % 10) for i in range(N)]
    if model == 3:
        return "left_spike", [10**30]+[1]*(N-1)
    if model == 4:
        return "middle_spike", [1 if i != N//2 else 10**30 for i in range(N)]
    if model == 5:
        return "right_spike", [1]*(N-1)+[10**30]
    if model == 6:
        return "alternating_extreme", [10**25 if i%2 else 1 for i in range(N)]
    return "random_logscale", [rng.randint(1, 10**rng.randint(1, 18)) for _ in range(N)]


def main() -> None:
    ctx.prec = 180
    rng = random.Random(993_20260802 + 3)
    records = []
    witnesses = []
    total_lines = 0
    total_failures = 0
    lower_failures = 0

    for N in range(4, 19):
        d = (2*N)//3 + 1
        r = 2*N-d
        inertia_numerator = sp.expand(
            d*(d-1)*2*N*(2*N-1)-N*N*r*(r-1)
        )
        assert inertia_numerator > 0
        if d > 2:
            previous = d-1
            previous_r = 2*N-previous
            previous_numerator = sp.expand(
                previous*(previous-1)*2*N*(2*N-1)
                -N*N*previous_r*(previous_r-1)
            )
            assert previous_numerator < 0

        failures_N = 0
        controls_N = 0
        for root_model in range(3):
            if root_model == 0:
                roots = list(range(-N//2, -N//2+N))
            elif root_model == 1:
                roots = sorted({-(i*i+3*i+1) for i in range(1,N+1)})
            else:
                roots = sorted(rng.sample(range(-30*N,30*N),N))
            assert len(roots)==N
            g = sp.Poly(sp.prod(X-root for root in roots), X)
            for model in range(10):
                label, weights = model_weights(N, model, rng)
                h = compression_polynomial(g, roots, weights)
                gd = derivative_table(g, d)
                hd = derivative_table(h, d-2)
                lower_gd = derivative_table(g, d-1)
                lower_hd = derivative_table(h, d-3) if d>=3 else None
                failures = 0
                for trial in range(80):
                    xy_base = (rng.randint(-250,250),rng.randint(-250,250))
                    xy_direction = (rng.randint(1,60),rng.randint(1,60))
                    a_line = derivative_sum_line(gd,d,xy_base,xy_direction)
                    b_line = derivative_sum_line(hd,d-2,xy_base,xy_direction)
                    count = nonreal(add(a_line,b_line,-1))
                    total_lines += 1
                    failures += bool(count)
                    if count and len(witnesses)<20:
                        witnesses.append({
                            "N":N,"d":d,"root_model":root_model,"label":label,
                            "roots":roots,"weights":weights,"trial":trial,
                            "xy_base":xy_base,"xy_direction":xy_direction,
                            "nonreal":count,
                        })
                    if count:
                        break
                # One below-threshold control on ten lines.  Failures are
                # expected but are not required for the target theorem.
                if lower_hd is not None:
                    for _ in range(10):
                        base=(rng.randint(-250,250),rng.randint(-250,250))
                        direction=(rng.randint(1,60),rng.randint(1,60))
                        aa=derivative_sum_line(lower_gd,d-1,base,direction)
                        bb=derivative_sum_line(lower_hd,d-3,base,direction)
                        if nonreal(add(aa,bb,-1)):
                            controls_N += 1
                            lower_failures += 1
                            break
                failures_N += failures
                total_failures += failures
        record={
            "N":N,"d_star":d,"remaining_degree":r,
            "derivative_cone_numerator":int(inertia_numerator),
            "models":30,"exact_target_lines":30*80 if not failures_N else None,
            "target_failures":failures_N,"below_threshold_models_with_failure":controls_N,
        }
        records.append(record)
        print(record,flush=True)
        if failures_N:
            break

    report={
        "kind":"rankone_compression_inertia_threshold_probe",
        "date":"2026-08-02",
        "status":"COUNTEREXAMPLE" if total_failures else "NO_COUNTEREXAMPLE_IN_EXACT_PROBE",
        "threshold":"d*=floor(2N/3)+1",
        "matrix_direction_spectrum":[
            "1 (multiplicity 2N-2)",
            "1+N/sqrt(d(d-1))",
            "1-N/sqrt(d(d-1))",
        ],
        "elementary_symmetric_formula":(
            "e_j(B)=binom(2N,j)*(1-N^2*j*(j-1)/(d(d-1)*2N*(2N-1)))"
        ),
        "records":records,"exact_target_lines_executed":total_lines,
        "target_failures":total_failures,"below_threshold_control_failures":lower_failures,
        "first_witnesses":witnesses,
        "warning":"Passes are finite evidence; any reported witness is exact.",
    }
    OUT.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({
        "status":report["status"],"exact_target_lines_executed":total_lines,
        "target_failures":total_failures,"below_threshold_control_failures":lower_failures,
        "output":str(OUT.resolve()),
    },indent=2))


if __name__=="__main__":
    main()
