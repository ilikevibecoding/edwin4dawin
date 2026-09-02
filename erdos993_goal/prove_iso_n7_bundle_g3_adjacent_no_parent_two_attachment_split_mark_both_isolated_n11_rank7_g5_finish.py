#!/usr/bin/env python3
"""Large-order split-mark two-attachment theorem with both roots isolated."""
from __future__ import annotations
import hashlib,json
from pathlib import Path
import sympy as sp
from probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_isolated_intersected_tau_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein
HERE=Path(__file__).resolve().parent; OUTPUT=HERE/"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_isolated_n11_exact_rank7_g5_finish_20260831.json"; MARKER="PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_BOTH_ISOLATED_N11_RANK7_G5_FINISH"
FILES={"derive_source":"derive_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_isolated_roots_rank7_g5_finish.py","derive_report":"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_isolated_roots_exact_rank7_g5_finish_20260831.json","probe_source":"probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_isolated_intersected_tau_rank7_g5_finish.py","low_report":"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_isolated_intersected_tau_low_excess_n11_probe_rank7_g5_finish_20260831.json","high_report":"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_isolated_intersected_tau_high_excess_n11_probe_rank7_g5_finish_20260831.json","bernstein_source":"prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py"}
EXPECTED={"derive_source":"224BE2FA8F7AA5B66D3A60D15A425A5AA39A6CFD6A6FA5459B5081AF3A352C7C","derive_report":"020B8F586F3E5320B1C6B528F345AF0C246E03D108ADD928BB5140B749272C4F","probe_source":"CEE322D9839362E9AF662068BDC8E94EE6E7081FF3DBAC8A3E2055A856A2258E","low_report":"EB62D0DD0486A4C10F88ACCA0C1484F4A70045E25F3EA08BFB9D13166A9D4227","high_report":"132BFDCD5C7D1F211D8BBC82F7AAF7AA81CB54FFCCB2982694F525339D1E792D","bernstein_source":"2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF"}
def sha256(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def main():
 for k,d in EXPECTED.items():assert sha256(HERE/FILES[k])==d,k
 certs={};dens={};exact=None
 for short,chart in (("low","low_excess"),("high","high_excess")):
  probe=json.loads((HERE/FILES[f"{short}_report"]).read_text());assert probe["chart"]==chart and probe["threshold_q"]==7 and probe["summary"]["negative_tail_scalar_coefficients"]==0
  q,vars,value,exact=build_value(chart);tail=sp.Symbol("tail",nonnegative=True);num,den=map(sp.expand,sp.fraction(sp.cancel(value.subs(q,tail+7))));
  if sp.LC(sp.Poly(den,tail,vars[0]))<0:num,den=-num,-den
  assert all(v>0 for v in sp.Poly(den,tail,vars[0]).coeffs());c=efficient_certify_bernstein(num,vars,tail);s=probe["summary"]
  assert c["degree_profile"]==s["degree_profile"] and c["bernstein_coefficients"]==s["bernstein_controls"] and c["tail_power_coefficients"]==s["tail_scalar_coefficients"] and c["minimum_tail_power_coefficient"]==s["minimum_tail_scalar_coefficient"] and c["ordered_stream_sha256"]==s["ordered_stream_sha256"] and c["exact_power_inversion"] is True;certs[chart]=c;dens[chart]=str(sp.factor(den))
 report={"marker":MARKER,"status":"proved exact","theorem":"For split-mark exactly-two attachments with both roots isolated, if remaining K is isolate-free with |K|>=7 (n>=11), then adjacent no-parent G3>=0.","exact_expression_in_K_rows":str(exact),"certificates":certs,"positive_denominators":dens,"coverage_gap_within_stated_split_mark_both_isolated_large_branch":None,"dependencies_sha256":EXPECTED,"scope":"Both roots isolated, K isolate-free, |K|>=7; finite and padding separate.","source_sha256":sha256(Path(__file__))};raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"charts":list(certs),"coverage_gap_within_stated_split_mark_both_isolated_large_branch":None},indent=2));print("SOURCE_SHA256",report["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
