#!/usr/bin/env python3
from __future__ import annotations
import hashlib,itertools,json
from collections import Counter
from pathlib import Path
R=Path(__file__).resolve().parent;O=R/"rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_newton_reduction_exact_agent_20260823.json"
E={"rank8_stable_path_offset_transfer_exact_agent_20260822.json":"3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D","rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":"A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F","rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":"E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7","rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json":"51E4E7647988CF358152A52444CD25638E342E20421977269F00C279C77F228E","rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":"213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787","rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":"BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D"}
def sh(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def conv(*fs):
 t=Counter({(0,0):1})
 for f in fs:
  z=Counter()
  for(a,x),u in t.items():
   for(b,y),v in f.items():z[a+b,x+y]+=u*v
  t=z
 return t
def main():
 a={n:sh(R/n)for n in E};assert a==E
 pend=[(x,x==7)for x in range(1,8)];gap=[(x,x==7)for x in range(8)];sp=[(x,x==8)for x in range(1,9)]
 def dist(rows):return Counter((sum(x for x,_ in z),sum(y for _,y in z))for z in rows)
 d=conv(dist([(x,)for x in gap]),dist([(x,)for x in pend]),dist([(x,)for x in sp]),dist([(x,)for x in sp]),dist(itertools.combinations_with_replacement(pend,3)),dist([(x,)for x in pend]),dist([(x,)for x in pend]))
 c=Counter();orders=Counter()
 for(stored,longs),m in d.items():
  n=2+stored
  if longs==0:c["all_short"]+=m;orders[n]+=m;c["order27"]+=m*(n==27);c["finite"]+=m*(n>=28)
  elif longs==9:c["all_long"]+=m
  else:c["mixed"]+=m
 c["total"]=sum(d.values());c["rays"]=c["mixed"]+c["all_long"]
 assert c==Counter(total=14751744,all_short=4148928,finite=3619379,order27=139476,mixed=10602815,all_long=1,rays=10602816)
 part=json.loads((R/"rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json").read_text());row=next(x for x in part["root_location_partitions"]if x["root_location_orbit"]=="quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal");assert row["coordinate_patterns"]==c["total"] and row["all_short_literal_patterns"]==c["all_short"] and row["all_short_patterns_order27"]==c["order27"] and row["all_short_patterns_n28_plus"]==c["finite"] and row["mixed_long_short_patterns"]==c["mixed"]
 u=json.loads((R/"rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json").read_text());assert u["integer_newton_matrix_determinant"]==1
 p={"schema":"rank8-delta03-e5-quartic-endpoint-cubic-path-endpoint-cubic-pendant-internal-newton-reduction-agent-v1","status":"PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_PENDANT_INTERNAL_TRANSFER_NEWTON_REDUCTION","root_orbit":"quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal","coordinate_order":"endpoint-root near gap; root-tail pendant; quartic-center spine; center-endpoint spine; quartic pendant triple; center pendant; endpoint sibling pendant","order_formula":"n=2+sum(the nine stored coordinates)","quotient_counts":dict(c),"all_short_order_distribution":{str(k):v for k,v in sorted(orders.items())},"graded_path_transfer":u["graded_path_transfer"],"degree_bounds":u["degree_bounds"],"newton_gate":u["newton_gate"],"integer_newton_matrix_determinant":1,"shared_order27_evidence":{"all_rooted_pairs":20278767420,"nonpositive_by_delta":[0,0,0,0],"scope":"exact all-root order-27 census only"},"immutable_input_hashes":a,"source_sha256":sh(Path(__file__)),"scope_guard":"Reduction only; no n>=28 sign claim. The shared order-27 base supplies no n>=28 credit."};O.write_text(json.dumps(p,indent=2)+"\n");print(p["status"]);print("SOURCE",p["source_sha256"]);print("REPORT",sh(O))
if __name__=="__main__":main()
