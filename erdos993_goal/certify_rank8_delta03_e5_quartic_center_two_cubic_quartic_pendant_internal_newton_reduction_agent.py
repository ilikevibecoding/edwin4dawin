#!/usr/bin/env python3
"""Exact transfer/Newton reduction for the e=5 quartic-pendant-internal root orbit."""
from __future__ import annotations
import hashlib,itertools,json
from collections import Counter
from pathlib import Path

R=Path(__file__).resolve().parent
O=R/"rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_newton_reduction_exact_agent_20260823.json"
E={
 "rank8_stable_path_offset_transfer_exact_agent_20260822.json":"3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
 "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":"A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
 "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":"E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
 "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json":"51E4E7647988CF358152A52444CD25638E342E20421977269F00C279C77F228E",
 "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_exact_agent_20260823.json":"49F913A9869E0896A465695A80A523726FD4BA3B7124D18EB8B38C054C5BCD73",
 "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_independent_audit_agent_20260823.json":"9E410DD3D45DB35D4D7977CFB3F55A13EAD51023AEBA0F43AD51076B3D57348C",
}
def sh(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def conv(*fs):
 t=Counter({(0,0):1})
 for f in fs:
  z=Counter()
  for(a,x),u in t.items():
   for(b,y),v in f.items():z[a+b,x+y]+=u*v
  t=z
 return t
def dist(rows):return Counter((sum(x for x,_ in z),sum(y for _,y in z))for z in rows)
def main():
 a={n:sh(R/n)for n in E};assert a==E
 pendant=[(x,x==7)for x in range(1,8)];gap=[(x,x==7)for x in range(8)];spine=[(x,x==8)for x in range(1,9)]
 arms=list(itertools.combinations_with_replacement(pendant,2));modules=[(*ab,s)for ab in arms for s in spine]
 module_pairs=[tuple(left+right)for left,right in itertools.combinations_with_replacement(modules,2)]
 d=conv(dist([(x,)for x in gap]),dist([(x,)for x in pendant]),dist([(x,)for x in pendant]),dist(module_pairs))
 c=Counter();orders=Counter()
 for(stored,longs),m in d.items():
  n=2+stored
  if longs==0:c["all_short"]+=m;orders[n]+=m;c["order27"]+=m*(n==27);c["finite"]+=m*(n>=28)
  elif longs==9:c["all_long"]+=m
  else:c["mixed"]+=m
 c["total"]=sum(d.values());c["rays"]=c["mixed"]+c["all_long"]
 assert len(modules)==224 and c==Counter(total=9878400,all_short=2741256,finite=2399155,order27=91501,mixed=7137143,all_long=1,rays=7137144)
 part=json.loads((R/"rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json").read_text());row=next(x for x in part["root_location_partitions"]if x["root_location_orbit"]=="quartic_center_two_cubic:quartic_pendant_internal")
 assert row["stabilizer_order"]==8 and row["coordinate_count"]==9 and row["coordinate_patterns"]==c["total"] and row["all_short_literal_patterns"]==c["all_short"] and row["all_short_patterns_order27"]==c["order27"] and row["all_short_patterns_n28_plus"]==c["finite"] and row["mixed_long_short_patterns"]==c["mixed"] and row["all_long_patterns"]==1
 assert {int(k):v for k,v in row["all_short_order_distribution"].items()}==dict(sorted(orders.items()))
 u=json.loads((R/"rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json").read_text());assert u["integer_newton_matrix_determinant"]==1
 p={"schema":"rank8-delta03-e5-quartic-center-two-cubic-quartic-pendant-internal-newton-reduction-agent-v1","status":"PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_PENDANT_INTERNAL_TRANSFER_NEWTON_REDUCTION","root_orbit":"quartic_center_two_cubic:quartic_pendant_internal","quotient_formula":"near gap 8 * root tail 7 * sibling quartic pendant 7 * unordered pair of 224 cubic modules C(225,2)=25,200","coordinate_order":"quartic-root near gap; root-tail pendant; sibling quartic pendant; first cubic pendant low,high,spine; second cubic pendant low,high,spine, with modules nondecreasing","order_formula":"n=2+sum(the nine stored coordinates)","quotient_counts":dict(c),"all_short_order_distribution":{str(k):v for k,v in sorted(orders.items())},"graded_path_transfer":u["graded_path_transfer"],"degree_bounds":u["degree_bounds"],"newton_gate":u["newton_gate"],"integer_newton_matrix_determinant":1,"nested_order27_evidence":{"canonical_subdivisions":191267,"nonpositive_by_delta":[0,0,0,0]},"immutable_input_hashes":a,"source_sha256":sh(Path(__file__)),"scope_guard":"Reduction only; no n>=28 sign claim."}
 O.write_text(json.dumps(p,indent=2)+"\n");print(p["status"]);print("SOURCE",p["source_sha256"]);print("REPORT",sh(O))
if __name__=="__main__":main()
