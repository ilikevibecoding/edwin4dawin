#!/usr/bin/env python3
"""Three-root shadow probe for same-mark 3+0 adjacent attachments."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
import sympy as sp
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary
HERE=Path(__file__).resolve().parent;REPORT=HERE/"iso_n7_bundle_g3_adjacent_no_parent_three_attachment_distributions_exact_rank7_g5_finish_20260831.json";REPORT_SHA="D0E4E00568DA8C9AC448D80F005DF18019ED718AF3C1F9B670BEE7D51B5A9B00";MARKER="PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SAME_MARK_ALL_NONISOLATED_INTERSECTED_TAU_RANK7_G5_FINISH"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def build_value(chart):
 assert sha(REPORT)==REPORT_SHA;r=json.loads(REPORT.read_text())["same_mark_3plus0"];m=sp.Symbol("m",positive=True);W={k:sp.Symbol(f"W{k}",nonnegative=True) for k in range(2,9)};loc={"m":m,**{f"W{k}":W[k] for k in W}};base=sp.expand(sp.sympify(r["loss_zero_base"],locals=loc));d={int(k):sp.expand(sp.sympify(v,locals=loc)) for k,v in r["Q_coefficients"].items()};b=sp.factor(d[3]+d[4]*(m-4)/3);c=sp.factor(d[2]+b*(m-3)/2);lower=sp.expand(base+3*(m-2)*c)
 ep,op,tp=sp.symbols("edge_parameter omega_parameter tau_parameter",nonnegative=True);ex={k:sp.Symbol(f"extension{k}_parameter",nonnegative=True) for k in range(5,9)};edge=m/2+(m/2-1)*ep;ol=2*edge-m;oh=edge**2/2;bd=sp.cancel((22*edge**2-11*edge*m-12*edge+6*m)/(8*edge));omega=sp.cancel(ol+op*(bd-ol)) if chart=="low_excess" else sp.cancel(bd+op*(oh-bd));z=omega-2*edge+m;tu=2*edge-m+sp.Rational(11,6)*edge*z if chart=="low_excess" else omega*edge/2;tau=sp.cancel(tp*tu);bad4=edge*choose_poly(m-2,2)-omega*(m-4)-edge*(edge-1)/2+tau;rows={2:choose_poly(m,2)-edge,3:choose_poly(m,3)-edge*(m-2)+omega,4:choose_poly(m,4)-bad4}
 for k in range(5,9):p=k-1;lo=((m-p)*rows[p]-2*edge*choose_poly(m-2,p-1))/k;hi=(m-p-1)*rows[p]/k;rows[k]=sp.expand(lo+ex[k]*(hi-lo))
 sub={W[k]:rows[k] for k in W};return m,(ep,op,tp,*(ex[k] for k in range(5,9))),sp.cancel(lower.subs(sub)),sp.cancel(c.subs({W[k]:rows[k] for k in range(2,7)})),base,d,b,c,lower
def fs(expr,vars,m,t):
 tail=sp.Symbol("tail",nonnegative=True);num,den=map(sp.expand,sp.fraction(sp.cancel(expr.subs(m,tail+t))));
 if sp.LC(sp.Poly(den,tail,vars[0]))<0:num,den=-num,-den
 assert all(v>0 for v in sp.Poly(den,tail,vars[0]).coeffs());return fast_summary(num,vars,tail),str(sp.factor(den))
def main():
 p=argparse.ArgumentParser();p.add_argument("--chart",choices=("low_excess","high_excess"),required=True);p.add_argument("--threshold-m",type=int,default=10);a=p.parse_args();m,v,val,cv,base,d,b,c,lower=build_value(a.chart);s,den=fs(val,v,m,a.threshold_m);cs,cd=fs(-cv,v[:5],m,a.threshold_m);n=a.threshold_m+2;o=HERE/("iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_all_nonisolated_"+a.chart+f"_n{n}_probe_rank7_g5_finish_20260831.json");rep={"marker":MARKER,"status":"exact diagnostic relaxation","chart":a.chart,"threshold_m":a.threshold_m,"threshold_n":n,"loss_zero_base":str(base),"loss_coefficients":{str(k):str(x) for k,x in d.items()},"nested_b":str(b),"endpoint_c":str(c),"safe_lower":str(lower),"summary":s,"denominator":den,"negative_c_summary":cs,"c_denominator":cd,"scope":"3+0 attachments, all roots nonisolated, W isolate-free.","source_sha256":sha(Path(__file__))};raw=json.dumps(rep,indent=2,sort_keys=True)+"\n";o.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"chart":a.chart,"main_negatives":s["negative_tail_scalar_coefficients"],"minus_c_negatives":cs["negative_tail_scalar_coefficients"],"minimum":s["minimum_tail_scalar_coefficient"],"first_negative":s["first_negative"]},indent=2));print("SOURCE_SHA256",rep["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
