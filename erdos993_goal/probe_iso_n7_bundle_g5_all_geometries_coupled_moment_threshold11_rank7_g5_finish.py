#!/usr/bin/env python3
"""Exact threshold-11 reconnaissance for the coupled-moment no-parent g5 cone."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail as base
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
)


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g5_parent_modes_probe_rank7_g5_tail_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g5_all_geometries_coupled_moment_threshold11_probe_rank7_g5_finish_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G5_ALL_GEOMETRIES_COUPLED_MOMENT_THRESHOLD11_RANK7_G5_FINISH"
THRESHOLD = 11
BRANCH_FILTER = None


def choose(h, k):
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h-j for j in range(k))/sp.factorial(k)


def main() -> None:
    base.THRESHOLD = THRESHOLD
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {"n":sp.Symbol("n", nonnegative=True)}
    for family in "WABZ":
        for rank in range(2,8):
            symbols[f"{family}{rank}"] = sp.Symbol(f"{family}{rank}", nonnegative=True)
    n = symbols["n"]
    tail = sp.Symbol("t", nonnegative=True)
    m = n-2
    e0 = choose(m,2)-symbols["W2"]

    def category_lower(h,k):
        return choose(h,k)-e0*choose(h,k-2)
    def category_upper(h,k):
        retained=e0-m*(m-h)
        extension=k*choose(h,k)/(m*(m-1))
        return choose(h,k)-retained*extension

    intervals={}
    for rank in range(3,8):
        ir=rank-1
        intervals[f"A{rank}"]=(category_lower(symbols["A2"],ir),category_upper(symbols["A2"],ir))
        intervals[f"B{rank}"]=(category_lower(symbols["B2"],ir),category_upper(symbols["B2"],ir))
    for rank in range(4,8):
        ir=rank-2
        intervals[f"Z{rank}"]=(
            symbols["Z2"]*category_lower(symbols["Z3"],ir),
            symbols["Z2"]*category_upper(symbols["Z3"],ir),
        )
    for rank in (6,7):
        incidence=e0*choose(m-2,rank-2)
        intervals[f"W{rank}"]=(choose(m,rank)-incidence,choose(m,rank)-incidence/(rank-1))

    current=sp.expand(sp.sympify(source["modes"]["no_parent"]["expression"],locals=symbols))
    elimination=[]
    for rank in range(7,2,-1):
        labels=[f"A{rank}",f"B{rank}"]
        if rank>=4:
            if rank in (6,7): labels.append(f"W{rank}")
            labels.append(f"Z{rank}")
        for label in labels:
            current,row=base.eliminate_linear(current,symbols[label],*intervals[label],n,tail)
            elimination.append(row)

    a,b,c,d=sp.symbols("a b c d", nonnegative=True)
    q,r=sp.symbols("q r", nonnegative=True)
    nval=tail+THRESHOLD
    mval=nval-2
    raw=marked_geometry_branches(mval,a,b,c,d)
    component_gap=1+(mval-1)*a
    exact_adjacent=(
        "adjacent",(a,b,c),component_gap*b,component_gap*(1-b)*c,
        mval-component_gap,sp.Integer(0),sp.Integer(0),
    )
    branches=[exact_adjacent,*raw[1:]]
    if BRANCH_FILTER is not None:
        branches = [row for row in branches if row[0] == BRANCH_FILTER]
        assert len(branches) == 1, BRANCH_FILTER
    rows=[]
    for label,variables0,x,y,e,z2,z3 in branches:
        geometry_variables=tuple(v for v in variables0 if v != d)
        omega_lower=sp.cancel(2*e**2/mval-e)
        omega_upper=e**2/2
        omega=sp.cancel(omega_lower+q*(omega_upper-omega_lower))
        tau_lower=sp.cancel(2*omega*(omega-e)/(3*e))
        tau_upper=omega*e/2
        tau=sp.cancel(tau_lower+r*(tau_upper-tau_lower))
        bad4=sp.cancel(e*choose(mval-2,2)-omega*(mval-4)-e*(e-1)/2+tau)
        bad5_floor=(mval-4)*bad4/5
        replacements={
            n:nval,
            symbols["A2"]:mval-x,
            symbols["B2"]:mval-y,
            symbols["W2"]:choose(mval,2)-e,
            symbols["W3"]:choose(mval,3)-e*(mval-2)+omega,
            symbols["W4"]:choose(mval,4)-bad4,
            symbols["W5"]:choose(mval,5)-bad5_floor,
            symbols["Z2"]:z2,
            symbols["Z3"]:z3,
        }
        value=sp.cancel(current.subs(replacements,simultaneous=True))
        variables=tuple(v for v in (*geometry_variables,q,r) if v in value.free_symbols)
        print("BRANCH_START",label,flush=True)
        rows.append({"geometry":label,"summary":fast_summary(value,variables,tail)})

    report={
        "marker":MARKER,"threshold":THRESHOLD,"rows":rows,
        "elimination":elimination,"status":"diagnostic; no theorem asserted",
        "source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded=json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(encoded,encoding="utf-8",newline="\n")
    print(json.dumps({
        "marker":MARKER,
        "negative_counts":{row["geometry"]:row["summary"]["negative_tail_scalar_coefficients"] for row in rows},
        "minima":{row["geometry"]:row["summary"]["minimum_tail_scalar_coefficient"] for row in rows},
    },indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__=="__main__":
    main()
