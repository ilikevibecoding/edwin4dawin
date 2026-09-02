#!/usr/bin/env python3
"""Probe the inertia threshold when h is proper with both g and g'.

h is constructed as a positive weighted rank-one compression of g, so
h<<g.  Exact isolating intervals retain only samples for which h and g'
also alternate.  This tests whether the second proper-position relation,
rather than the special common double root, removes the generic failures.
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


OUT=Path("double_proper_generic_inertia_threshold_probe_20260802.json")


def intervals(poly:sp.Poly)->list[tuple[sp.Rational,sp.Rational]]:
    raw=poly.intervals(eps=sp.Rational(1,10**14))
    return [(sp.Rational(ab[0]),sp.Rational(ab[1])) for ab,m in raw for _ in range(m)]


def alternates(a:sp.Poly,b:sp.Poly)->bool:
    aa,bb=intervals(a),intervals(b)
    if len(aa)!=a.degree() or len(bb)!=b.degree() or len(aa)!=len(bb):return False
    def order(first,second):
        return all(first[i][1]<second[i][0] for i in range(len(first))) and all(
            second[i][1]<first[i+1][0] for i in range(len(first)-1)
        )
    return order(aa,bb) or order(bb,aa)


def nonreal(values:list[sp.Rational])->int:
    return sum(m for z,m in fmpz_poly(integer_values(values)).complex_roots() if not z.imag.is_zero())


def main()->None:
    ctx.prec=180
    rng=random.Random(993_20260802+4)
    records=[];witnesses=[];total_lines=0
    for N in range(4,16):
        d=2*N//3+1
        accepted=0;rejected=0;failures=0;attempt=0
        while accepted<45 and attempt<900:
            attempt+=1
            roots=sorted(rng.sample(range(-25*N,25*N),N))
            g=sp.Poly(sp.prod(X-r for r in roots),X)
            gp=sp.Poly(sp.diff(g.as_expr(),X),X)
            # Moderate lognormal-like perturbations around equal weights;
            # large spikes are normally rejected by h<<g'.
            scale=rng.choice([2,3,5,10,30,100,1000])
            weights=[rng.randint(1,scale) for _ in range(N)]
            h=compression_polynomial(g,roots,weights)
            if sp.expand(h.as_expr()-gp.as_expr())==0 or not alternates(gp,h):
                rejected+=1;continue
            accepted+=1
            gd=derivative_table(g,d);hd=derivative_table(h,d-2)
            for trial in range(35):
                base=(rng.randint(-300,300),rng.randint(-300,300))
                direction=(rng.randint(1,70),rng.randint(1,70))
                aa=derivative_sum_line(gd,d,base,direction)
                bb=derivative_sum_line(hd,d-2,base,direction)
                nr=nonreal(add(aa,bb,-1));total_lines+=1
                if nr:
                    failures+=1
                    witnesses.append({
                        "N":N,"d":d,"roots":roots,"weights":weights,
                        "base":base,"direction":direction,"nonreal":nr,
                    })
                    break
            if failures:break
        rec={"N":N,"d":d,"accepted":accepted,"rejected":rejected,
             "attempts":attempt,"target_failures":failures}
        records.append(rec);print(rec,flush=True)
        if failures:break
    report={
        "kind":"double_proper_generic_inertia_threshold_probe","date":"2026-08-02",
        "status":"COUNTEREXAMPLE" if witnesses else "NO_COUNTEREXAMPLE_IN_EXACT_PROBE",
        "hypotheses":"h<<g, h<<g', and leading(h)=leading(g')",
        "threshold":"d=floor(2N/3)+1","records":records,
        "exact_target_lines":total_lines,"witnesses":witnesses,
        "warning":"Finite passes are evidence only; witnesses are exact.",
    }
    OUT.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":report["status"],"exact_target_lines":total_lines,
                      "output":str(OUT.resolve())},indent=2))


if __name__=="__main__":main()
