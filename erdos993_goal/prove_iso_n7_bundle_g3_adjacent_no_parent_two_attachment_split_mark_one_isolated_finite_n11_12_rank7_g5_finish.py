#!/usr/bin/env python3
"""Exact h=8,9 seams for split-mark attachments with one isolated root."""
from __future__ import annotations
import hashlib,json
from pathlib import Path
import networkx as nx
import sympy as sp
from prove_iso_n7_bundle_g3_sum0_ordinary_nonisolated_finite_n11_14_rank7_g5_finish import component_types,expected_forest_count,forest_component_multisets,independent_rows
HERE=Path(__file__).resolve().parent;OUTPUT=HERE/"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_one_isolated_finite_n11_12_exact_rank7_g5_finish_20260831.json";MARKER="PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_ONE_ISOLATED_FINITE_N11_12_RANK7_G5_FINISH"
FILES={"derive_source":"derive_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_isolated_roots_rank7_g5_finish.py","derive_report":"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_isolated_roots_exact_rank7_g5_finish_20260831.json","enumerator_source":"prove_iso_n7_bundle_g3_sum0_ordinary_nonisolated_finite_n11_14_rank7_g5_finish.py"};EXPECTED={"derive_source":"224BE2FA8F7AA5B66D3A60D15A425A5AA39A6CFD6A6FA5459B5081AF3A352C7C","derive_report":"020B8F586F3E5320B1C6B528F345AF0C246E03D108ADD928BB5140B749272C4F","enumerator_source":"2CB2144CD9940AA725A26619B0B1EEA615ED11A07D02F165205D16AB23789271"}
def sha256(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def evaluator():
 raw=json.loads((HERE/FILES["derive_report"]).read_text())["exactly_one_root_isolated"]["identity_in_H_rooted_rows"];h=sp.Symbol("h",positive=True);A={k:sp.Symbol(f"A{k}",nonnegative=True) for k in range(2,9)};R={k:sp.Symbol(f"R{k}",nonnegative=True) for k in range(2,8)};exact=sp.expand(sp.sympify(raw,locals={"h":h,**{f"A{k}":A[k] for k in A},**{f"R{k}":R[k] for k in R}}));vars=[h,*(A[k] for k in range(2,9)),*(R[k] for k in range(2,8))];terms=sp.Poly(exact,*vars).terms()
 def ev(values):
  total=0
  for powers,c in terms:
   term=int(c)
   for v,p in zip(values,powers):term*=v**p
   total+=term
  return total
 return exact,ev
def main():
 for k,d in EXPECTED.items():assert sha256(HERE/FILES[k])==d,k
 exact,ev=evaluator();types=component_types(9);stream=hashlib.sha256();reports={};aggf=aggr=0;gmin=None
 for h in (8,9):
  forests=roots=neg=0;lmin=None;wit=None
  for ids in forest_component_multisets(h,types):
   graph=nx.disjoint_union_all([types[i][2] for i in ids]);assert graph.number_of_nodes()==h and nx.is_forest(graph) and all(d>=1 for _,d in graph.degree());forests+=1;A,rooted=independent_rows(graph);enc=tuple((types[i][0],types[i][1]) for i in ids)
   for y in range(h):
    R=rooted[y];value=ev([h,*A[2:9],*R[2:8]]);stream.update(f"{h}|{enc}|{y}|{A[2:9]}|{R[2:8]}|{value};".encode());roots+=1;neg+=value<0
    if lmin is None or value<lmin:lmin=value;wit={"component_types_size_and_index":enc,"nonisolated_root":y,"A2_through_A8":A[2:9],"R2_through_R7":R[2:8]}
  assert forests==expected_forest_count(h) and roots==h*forests and neg==0 and lmin>=0;reports[str(h+3)]={"total_order_n":h+3,"H_order_h":h,"unlabeled_isolate_free_forests":forests,"rooted_rows_checked":roots,"negative_count":neg,"minimum_G3":str(lmin),"minimum_witness":wit};aggf+=forests;aggr+=roots;gmin=lmin if gmin is None else min(gmin,lmin)
 report={"marker":MARKER,"status":"proved exact","theorem":"For split-mark exactly-two attachments with exactly one root isolated, every isolate-free rooted H of order h=8,9 gives adjacent no-parent G3>=0 (n=11,12).","method":"Complete unlabeled isolate-free forest census and every designated nonisolated root.","order_reports":reports,"aggregate":{"unlabeled_isolate_free_forests":aggf,"rooted_rows_checked":aggr,"negative_count":0,"global_minimum_G3":str(gmin),"ordered_row_stream_sha256":stream.hexdigest().upper()},"exact_expression":str(exact),"coverage_gap_within_split_mark_one_isolated_n11_12":None,"dependencies_sha256":EXPECTED,"scope":"Exactly one isolated root, H isolate-free, h=8,9 only.","source_sha256":sha256(Path(__file__))};raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,**report["aggregate"],"orders":[11,12]},indent=2));print("SOURCE_SHA256",report["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
