#!/usr/bin/env python3
"""Large-order split-mark two-attachment theorem with exactly one isolated root."""
from __future__ import annotations
import hashlib,json
from pathlib import Path
import sympy as sp
from probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_one_isolated_intersected_tau_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein
HERE=Path(__file__).resolve().parent;OUTPUT=HERE/"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_one_isolated_n13_exact_rank7_g5_finish_20260831.json";MARKER="PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_ONE_ISOLATED_N13_RANK7_G5_FINISH"
FILES={"derive_source":"derive_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_isolated_roots_rank7_g5_finish.py","derive_report":"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_isolated_roots_exact_rank7_g5_finish_20260831.json","probe_source":"probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_one_isolated_intersected_tau_rank7_g5_finish.py","low_report":"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_one_isolated_intersected_tau_low_excess_n13_probe_rank7_g5_finish_20260831.json","high_report":"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_one_isolated_intersected_tau_high_excess_n13_probe_rank7_g5_finish_20260831.json","bernstein_source":"prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py"}
EXPECTED={"derive_source":"224BE2FA8F7AA5B66D3A60D15A425A5AA39A6CFD6A6FA5459B5081AF3A352C7C","derive_report":"020B8F586F3E5320B1C6B528F345AF0C246E03D108ADD928BB5140B749272C4F","probe_source":"CB3895816357CD9660FACD91928919C0705ACF14249AE2712C950A709996D309","low_report":"18F68311E2CA53836284F75355EA54359C1A6FBAFBBC4EDF8E622A925E59F24E","high_report":"258CF897439EF6FE5E194FEF4E2A30DA49E3A3B7AA4A7E6D4D6BFA754B0F672D","bernstein_source":"2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF"}
def sha256(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def certify(expr,vars,h,s):
 tail=sp.Symbol("tail",nonnegative=True);num,den=map(sp.expand,sp.fraction(sp.cancel(expr.subs(h,tail+10))));
 if sp.LC(sp.Poly(den,tail,vars[0]))<0:num,den=-num,-den
 assert all(v>0 for v in sp.Poly(den,tail,vars[0]).coeffs());c=efficient_certify_bernstein(num,vars,tail);assert c["degree_profile"]==s["degree_profile"] and c["bernstein_coefficients"]==s["bernstein_controls"] and c["tail_power_coefficients"]==s["tail_scalar_coefficients"] and c["minimum_tail_power_coefficient"]==s["minimum_tail_scalar_coefficient"] and c["ordered_stream_sha256"]==s["ordered_stream_sha256"] and c["exact_power_inversion"] is True;return c,str(sp.factor(den))
def main():
 for k,d in EXPECTED.items():assert sha256(HERE/FILES[k])==d,k
 certs={};ccerts={};dens={};alg=None
 for short,chart in (("low","low_excess"),("high","high_excess")):
  p=json.loads((HERE/FILES[f"{short}_report"]).read_text());assert p["chart"]==chart and p["threshold_h"]==10 and p["summary"]["negative_tail_scalar_coefficients"]==0 and p["negative_c_summary"]["negative_tail_scalar_coefficients"]==0
  h,vars,value,cv,base,coeff,b,c,lower=build_value(chart);certs[chart],dens[chart+"_main"]=certify(value,vars,h,p["summary"]);ccerts[chart],dens[chart+"_minus_c"]=certify(-cv,vars[:5],h,p["negative_c_summary"]);alg=base,coeff,b,c,lower
 base,coeff,b,c,lower=alg;tail=sp.Symbol("tail",nonnegative=True);rows={str(s):s for s in (coeff[4].free_symbols|b.free_symbols) if s!=h}
 for expr in (coeff[4],b):
  for name in ("A2","A3","A4"):
   vals=sp.Poly(sp.expand(sp.diff(expr,rows[name]).subs(h,tail+10)),tail).coeffs();assert all(v<=0 for v in vals) and any(v<0 for v in vals)
  ceiling=sp.expand(expr.subs({rows["A2"]:(h-1)*(h-2)/2,rows["A3"]:0,rows["A4"]:0}));assert all(v<0 for v in sp.Poly(ceiling.subs(h,tail+10),tail).coeffs())
 report={"marker":MARKER,"status":"proved exact","theorem":"For split-mark exactly-two attachments with exactly one root isolated, if H obtained by deleting it is isolate-free with its root nonisolated and |H|>=10 (n>=13), then adjacent no-parent G3>=0.","R_zero_base":str(base),"R_coefficients":{str(k):str(v) for k,v in coeff.items()},"nested_shadow":{"d4_strictly_negative":True,"b":str(b),"b_strictly_negative":True,"c":str(c),"safe_lower":str(lower)},"certificates":certs,"negative_c_certificates":ccerts,"positive_denominators":dens,"coverage_gap_within_stated_split_mark_one_isolated_large_branch":None,"dependencies_sha256":EXPECTED,"scope":"Exactly one root isolated, H isolate-free, |H|>=10; finite h<=9 and padding separate.","source_sha256":sha256(Path(__file__))};raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"charts":list(certs),"coverage_gap_within_stated_split_mark_one_isolated_large_branch":None},indent=2));print("SOURCE_SHA256",report["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
