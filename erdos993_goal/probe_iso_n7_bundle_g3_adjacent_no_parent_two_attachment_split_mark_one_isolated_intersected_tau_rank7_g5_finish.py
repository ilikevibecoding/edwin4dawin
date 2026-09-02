#!/usr/bin/env python3
"""Root-shadow moment probe for split-mark attachments with one isolated root."""

from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
import sympy as sp
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary

HERE=Path(__file__).resolve().parent
DERIVE_REPORT=HERE/"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_isolated_roots_exact_rank7_g5_finish_20260831.json"
DERIVE_REPORT_SHA256="020B8F586F3E5320B1C6B528F345AF0C246E03D108ADD928BB5140B749272C4F"
MARKER="PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_ONE_ISOLATED_INTERSECTED_TAU_RANK7_G5_FINISH"
def sha256(path): return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def build_value(chart):
    assert sha256(DERIVE_REPORT)==DERIVE_REPORT_SHA256
    report=json.loads(DERIVE_REPORT.read_text(encoding="utf-8"))["exactly_one_root_isolated"]
    h=sp.Symbol("h",positive=True); A={0:sp.Integer(1),1:h,**{k:sp.Symbol(f"A{k}",nonnegative=True) for k in range(2,9)}}
    loc={"h":h,**{f"A{k}":A[k] for k in range(2,9)}}
    base=sp.expand(sp.sympify(report["R_zero_base"],locals=loc)); coeff={int(k):sp.expand(sp.sympify(v,locals=loc)) for k,v in report["R_coefficients"].items()}
    b=sp.factor(coeff[3]+coeff[4]*(h-4)/3); c=sp.factor(coeff[2]+b*(h-3)/2); lower=sp.expand(base+(h-2)*c)
    ep,op,tp=sp.symbols("edge_parameter omega_parameter tau_parameter",nonnegative=True); ex={k:sp.Symbol(f"extension{k}_parameter",nonnegative=True) for k in range(5,9)}
    edge=h/2+(h/2-1)*ep; ol=2*edge-h; oh=edge**2/2; boundary=sp.cancel((22*edge**2-11*edge*h-12*edge+6*h)/(8*edge)); omega=sp.cancel(ol+op*(boundary-ol)) if chart=="low_excess" else sp.cancel(boundary+op*(oh-boundary)); excess=omega-2*edge+h; tu=2*edge-h+sp.Rational(11,6)*edge*excess if chart=="low_excess" else omega*edge/2; tau=sp.cancel(tp*tu)
    bad4=edge*choose_poly(h-2,2)-omega*(h-4)-edge*(edge-1)/2+tau
    rows={2:choose_poly(h,2)-edge,3:choose_poly(h,3)-edge*(h-2)+omega,4:choose_poly(h,4)-bad4}
    for rank in range(5,9):
        p=rank-1; low=((h-p)*rows[p]-2*edge*choose_poly(h-2,p-1))/rank; high=(h-p-1)*rows[p]/rank; rows[rank]=sp.expand(low+ex[rank]*(high-low))
    sub={A[k]:rows[k] for k in range(2,9)}
    return h,(ep,op,tp,*(ex[k] for k in range(5,9))),sp.cancel(lower.subs(sub)),sp.cancel(c.subs({A[k]:rows[k] for k in range(2,7)})),base,coeff,b,c,lower

def fast(expr,vars,h,t):
    tail=sp.Symbol("tail",nonnegative=True); num,den=map(sp.expand,sp.fraction(sp.cancel(expr.subs(h,tail+t))))
    if sp.LC(sp.Poly(den,tail,vars[0]))<0:num,den=-num,-den
    assert all(v>0 for v in sp.Poly(den,tail,vars[0]).coeffs()); return fast_summary(num,vars,tail),str(sp.factor(den))

def main():
    p=argparse.ArgumentParser();p.add_argument("--chart",choices=("low_excess","high_excess"),required=True);p.add_argument("--threshold-h",type=int,default=10);a=p.parse_args()
    h,vars,value,cv,base,coeff,b,c,lower=build_value(a.chart); summary,den=fast(value,vars,h,a.threshold_h); cs,cd=fast(-cv,vars[:5],h,a.threshold_h); n=a.threshold_h+3
    output=HERE/("iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_one_isolated_intersected_tau_"+a.chart+f"_n{n}_probe_rank7_g5_finish_20260831.json")
    report={"marker":MARKER,"status":"exact diagnostic relaxation; no theorem asserted","chart":a.chart,"threshold_h":a.threshold_h,"threshold_n":n,"R_zero_base":str(base),"R_coefficients":{str(k):str(v) for k,v in coeff.items()},"nested_shadow_b":str(b),"endpoint_c":str(c),"safe_lower":str(lower),"summary":summary,"positive_denominator":den,"negative_c_summary":cs,"positive_c_denominator":cd,"scope":"Split-mark exactly two attachments, exactly one root isolated; H isolate-free and other root nonisolated.","source_sha256":sha256(Path(__file__))}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";output.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"chart":a.chart,"main_negatives":summary["negative_tail_scalar_coefficients"],"minus_c_negatives":cs["negative_tail_scalar_coefficients"],"minimum":summary["minimum_tail_scalar_coefficient"],"first_negative":summary["first_negative"]},indent=2,sort_keys=True));print("SOURCE_SHA256",report["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
