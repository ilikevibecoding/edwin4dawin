#!/usr/bin/env python3
"""Exact transfer/Newton reduction for quartic-endpoint cubic-path quartic-leaf root."""
from __future__ import annotations
import hashlib,itertools,json
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parent;OUTPUT=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_newton_reduction_exact_agent_20260823.json"
EXPECTED={"rank8_stable_path_offset_transfer_exact_agent_20260822.json":"3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D","rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":"A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F","rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":"E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7","certify_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_agent.py":"0FCEA510998EA4ABBB45D09261D7954FD7ADE2C942B1CAD061CC4C86B7376B8E","rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json":"51E4E7647988CF358152A52444CD25638E342E20421977269F00C279C77F228E","rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_exact_agent_20260823.json":"DCBF568C6C849E20D64C3444A8CF566E95BFAF5C1523B22F083CE50F6E918E6A","rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_independent_audit_agent_20260823.json":"E570F4C3B3C2BE0B12A5596216E2A073184A89417B0B82AE2CAC3F0BBFA6D427"}
def sha(p:Path)->str:return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def conv(*fs):
 t=Counter({(0,0):1})
 for f in fs:
  o=Counter()
  for(a,x),ac in t.items():
   for(b,y),bc in f.items():o[a+b,x+y]+=ac*bc
  t=o
 return t
def main():
 a={n:sha(ROOT/n)for n in EXPECTED};assert a==EXPECTED;u=json.loads((ROOT/"rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json").read_text());assert u["graded_path_transfer"]["literal_pair_checks"]==4536 and u["degree_bounds"]=={"0":{"terms":15,"degree_bound":28},"1":{"terms":18,"degree_bound":28},"2":{"terms":22,"degree_bound":27},"3":{"terms":26,"degree_bound":26}}and u["integer_newton_matrix_determinant"]==1
 vertices=("Q","C0","C1");endpoints={"root_incident_pendant":("Q",),"quartic_sibling_pendant_0":("Q",),"quartic_sibling_pendant_1":("Q",),"quartic_center_cubic_spine":("Q","C0"),"center_cubic_pendant":("C0",),"center_endpoint_cubic_spine":("C0","C1"),"endpoint_cubic_pendant_0":("C1",),"endpoint_cubic_pendant_1":("C1",)};guards=[]
 for root_selected in(0,1):
  for bits in itertools.product((0,1),repeat=3):
   selected={v for v,b in zip(vertices,bits)if b};cap=8-root_selected-len(selected);effective={}
   for label,ends in endpoints.items():
    base=8 if label=="root_incident_pendant"or label.endswith("spine")else 7;loss=sum(v in selected for v in ends)+(root_selected if label=="root_incident_pendant"else 0);order=base-loss;assert order>=cap-1;effective[label]=order
   guards.append({"root_selected":bool(root_selected),"selected_branch_vertices":sorted(selected),"rank_cap":cap,"effective_long_path_orders":effective})
 pendant=tuple((x,x==7)for x in range(1,8));incident=tuple((x,x==8)for x in range(1,9));spine=tuple((x,x==8)for x in range(1,9));pairs=tuple(itertools.combinations_with_replacement(pendant,2));pd=Counter((sum(x[0]for x in row),sum(int(x[1])for x in row))for row in pairs);sd=Counter((x,int(y))for x,y in spine);idist=Counter((x,int(y))for x,y in incident);one=Counter((x,int(y))for x,y in pendant);dist=conv(idist,pd,sd,one,sd,pd);counts=Counter();orders=Counter()
 for(stored,longs),m in dist.items():
  order=1+stored
  if longs==0:
   counts["all_short"]+=m;orders[order]+=m
   if order==27:counts["all_short_order27"]+=m
   if order>=28:counts["all_short_n28_plus"]+=m
  elif longs==8:counts["all_long"]+=m
  else:counts["mixed"]+=m
 counts["coordinate_patterns"]=sum(dist.values());counts["non_all_short_rays"]=counts["mixed"]+counts["all_long"];counts["n28_plus_records"]=counts["all_short_n28_plus"]+counts["non_all_short_rays"]
 assert counts==Counter({"coordinate_patterns":2_809_856,"mixed":1_902_277,"non_all_short_rays":1_902_278,"n28_plus_records":2_547_030,"all_short":907_578,"all_short_n28_plus":644_752,"all_short_order27":54_585,"all_long":1})
 part=json.loads((ROOT/"rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json").read_text());o=next(x for x in part["root_location_partitions"]if x["root_location_orbit"]=="quartic_endpoint_cubic_path:quartic_leaf");assert o["stabilizer_order"]==4 and o["coordinate_patterns"]==counts["coordinate_patterns"]and o["all_short_literal_patterns"]==counts["all_short"]and o["all_short_patterns_order27"]==counts["all_short_order27"]and o["all_short_patterns_n28_plus"]==counts["all_short_n28_plus"]and o["mixed_long_short_patterns"]==counts["mixed"]and o["all_long_patterns"]==1 and {int(k):v for k,v in o["all_short_order_distribution"].items()}==dict(sorted(orders.items()))
 p={"schema":"rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-leaf-newton-reduction-exact-agent-v1","status":"PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF_TRANSFER_NEWTON_REDUCTION","root_orbit":"quartic_endpoint_cubic_path:quartic_leaf","quotient_formula":"root incident 8 * quartic sibling pair C(8,2)=28 * quartic-center spine 8 * center-cubic pendant 7 * center-endpoint spine 8 * endpoint-cubic pendant pair C(8,2)=28, total 2,809,856 keys","canonical_coordinate_order":"root incident arm; quartic sibling arms low,high; quartic-center-cubic spine; center-cubic pendant; center-endpoint-cubic spine; endpoint-cubic pendant arms low,high","order_formula":"n=1+sum(the eight stored edge lengths)","quotient_counts":dict(counts),"all_short_order_distribution":{str(k):v for k,v in sorted(orders.items())},"graded_path_transfer":{"universal_rows":u["graded_path_transfer"]["rows"],"literal_pair_checks":4536,"endpoint_state_guards":guards,"conclusion":"all long offsets enter core and root-deleted coefficients only through total S"},"degree_bounds":u["degree_bounds"],"newton_gate":u["newton_gate"],"integer_newton_matrix_determinant":1,"nested_order27_evidence":{"canonical_subdivisions":161_161,"primary_literal_checks":161_161,"independent_literal_checks":161_161,"nonpositive_by_delta":[0,0,0,0],"all_short_order27_keys":counts["all_short_order27"]},"immutable_input_hashes":a,"source_sha256":sha(Path(__file__)),"scope_guard":"Reduction only; no n>=28 census or sign claim is made."};OUTPUT.write_text(json.dumps(p,indent=2)+"\n");print(p["status"]);print("COUNTS",json.dumps(p["quotient_counts"],sort_keys=True));print("SOURCE",p["source_sha256"]);print("REPORT",sha(OUTPUT))
if __name__=="__main__":main()


