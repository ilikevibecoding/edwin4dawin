#!/usr/bin/env python3
"""Moment probe for split-mark two attachments whose roots are both isolated."""

from __future__ import annotations

import argparse, hashlib, json
from pathlib import Path
import sympy as sp
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary

HERE = Path(__file__).resolve().parent
DERIVE_REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_isolated_roots_exact_rank7_g5_finish_20260831.json"
DERIVE_REPORT_SHA256 = "020B8F586F3E5320B1C6B528F345AF0C246E03D108ADD928BB5140B749272C4F"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_BOTH_ISOLATED_INTERSECTED_TAU_RANK7_G5_FINISH"

def sha256(path): return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def build_value(chart):
    assert sha256(DERIVE_REPORT) == DERIVE_REPORT_SHA256
    raw = json.loads(DERIVE_REPORT.read_text(encoding="utf-8"))["both_roots_isolated"]["identity_in_K_rows"]
    q = sp.Symbol("q", positive=True)
    I = {0: sp.Integer(1), 1: q, **{k: sp.Symbol(f"I{k}", nonnegative=True) for k in range(2,9)}}
    exact = sp.expand(sp.sympify(raw, locals={"q":q, **{f"I{k}":I[k] for k in range(2,9)}}))
    ep,op,tp=sp.symbols("edge_parameter omega_parameter tau_parameter",nonnegative=True)
    ex={k:sp.Symbol(f"extension{k}_parameter",nonnegative=True) for k in range(5,9)}
    edge=q/2+(q/2-1)*ep; ol=2*edge-q; oh=edge**2/2
    boundary=sp.cancel((22*edge**2-11*edge*q-12*edge+6*q)/(8*edge))
    omega=sp.cancel(ol+op*(boundary-ol)) if chart=="low_excess" else sp.cancel(boundary+op*(oh-boundary))
    excess=omega-2*edge+q
    tu=2*edge-q+sp.Rational(11,6)*edge*excess if chart=="low_excess" else omega*edge/2
    tau=sp.cancel(tp*tu)
    bad4=edge*choose_poly(q-2,2)-omega*(q-4)-edge*(edge-1)/2+tau
    rows={2:choose_poly(q,2)-edge,3:choose_poly(q,3)-edge*(q-2)+omega,4:choose_poly(q,4)-bad4}
    for rank in range(5,9):
        p=rank-1; low=((q-p)*rows[p]-2*edge*choose_poly(q-2,p-1))/rank; high=(q-p-1)*rows[p]/rank
        rows[rank]=sp.expand(low+ex[rank]*(high-low))
    return q,(ep,op,tp,*(ex[k] for k in range(5,9))),sp.cancel(exact.subs({I[k]:rows[k] for k in range(2,9)})),exact

def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--chart",choices=("low_excess","high_excess"),required=True); parser.add_argument("--threshold-q",type=int,default=7); args=parser.parse_args()
    q,variables,value,exact=build_value(args.chart); tail=sp.Symbol("tail",nonnegative=True)
    numerator,denominator=map(sp.expand,sp.fraction(sp.cancel(value.subs(q,tail+args.threshold_q))))
    if sp.LC(sp.Poly(denominator,tail,variables[0]))<0: numerator,denominator=-numerator,-denominator
    assert all(v>0 for v in sp.Poly(denominator,tail,variables[0]).coeffs())
    summary=fast_summary(numerator,variables,tail); n=args.threshold_q+4
    output=HERE/("iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_isolated_intersected_tau_"+args.chart+f"_n{n}_probe_rank7_g5_finish_20260831.json")
    report={"marker":MARKER,"status":"exact diagnostic relaxation; no theorem asserted","chart":args.chart,"threshold_q":args.threshold_q,"threshold_n":n,"exact_expression_in_K_rows":str(exact),"summary":summary,"positive_denominator":str(sp.factor(denominator)),"scope":"Split-mark exactly two attachments, both roots isolated; K isolate-free and nonempty.","source_sha256":sha256(Path(__file__))}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n"; output.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,"chart":args.chart,"negatives":summary["negative_tail_scalar_coefficients"],"minimum":summary["minimum_tail_scalar_coefficient"],"first_negative":summary["first_negative"]},indent=2,sort_keys=True)); print("SOURCE_SHA256",report["source_sha256"]); print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper()); print(MARKER)
if __name__=="__main__": main()
