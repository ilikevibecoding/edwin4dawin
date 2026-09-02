#!/usr/bin/env python3
"""Narrow n>=27 theorem for endpoint-cubic-pendant-internal roots only."""

from __future__ import annotations
import hashlib,json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
OUTPUT=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_n27_plus_exact_agent_20260823.json"
EXPECTED={
 "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":"A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
 "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":"E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
 "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":"213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
 "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":"BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
 "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_exact_agent.py":"683721CA6D63964A8CEB2C19EFD105D60638C77DC3DDED38634CE2B7313D08AE",
 "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_all_order_exact_agent_20260823.json":"95C453545E643764C7387E2961C8D84949A74CAB1B245022BBED3D3EF7FBA182",
 "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_independent_audit_agent.py":"A7EB68D3DC7EF2FD3C8C0AFCDDA237F12A8F269DA2CDF391D27F4173949DEF4A",
 "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json":"57C510151169DBBA4FFDF071F8FC1A1798813A04C2A4616FFEF5D6D8C8945D9F",
}
def sh(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def load(n):return json.loads((ROOT/n).read_text())
def main():
 actual={n:sh(ROOT/n)for n in EXPECTED};assert actual==EXPECTED
 n27=load("rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json");n27a=load("rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json")
 p=load("rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_all_order_exact_agent_20260823.json");a=load("rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json")
 assert n27["status"]=="PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27" and n27["scope"]["core_order"]==27 and n27["scope"]["all_rooted_pairs"]==20278767420 and n27["acceptance"]["negative_counts"]==[0,0,0,0]
 assert n27a["status"]=="PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27" and n27a["scope"]==n27["scope"] and n27a["threaded_no_gap_coverage"]["adjacent_no_gap_no_overlap"] is True
 assert p["status"]=="PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_PENDANT_INTERNAL_N28_PLUS" and a["status"]=="PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_PENDANT_INTERNAL_N28_PLUS_AUDIT"
 assert p["root_orbit"]==a["root_orbit"]=="quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal";assert a["matching_coefficient_merkle_stream_sha256"]==p["coefficient_merkle_stream_sha256"] and a["matching_finite_merkle_stream_sha256"]==p["finite_merkle_stream_sha256"]
 out={"schema":"rank8-delta03-e5-quartic-endpoint-cubic-path-endpoint-cubic-pendant-internal-n27-plus-exact-agent-v1","status":"PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_PENDANT_INTERNAL_N27_PLUS","theorem":"For an endpoint-cubic-pendant-internal root in every subdivision of the quartic-endpoint-cubic-path degree-surplus-e=5 suppressed skeleton and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.","root_orbit":"quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal","order_partition":[{"minimum":27,"maximum":27,"evidence":"independently audited exhaustive all-root finite census"},{"minimum":28,"maximum":None,"evidence":"independently audited transfer/Newton all-order orbit census"}],"order27_shared_evidence":{"all_rooted_pairs":20278767420,"nonpositive_by_delta":[0,0,0,0]},"n28_plus_evidence":{"eligible_finite":3619379,"mixed_rays":10602815,"all_long_rays":1,"non_all_short_rays":10602816,"unseen_S29_rank_checks_per_engine":42411264,"independent_literal_trees":35427827,"coefficient_merkle_stream_sha256":p["coefficient_merkle_stream_sha256"],"finite_merkle_stream_sha256":p["finite_merkle_stream_sha256"]},"immutable_input_hashes":actual,"source_sha256":sh(Path(__file__)),"scope_guard":"This theorem credits exactly quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal. With the fifteen previously sealed e=5 root orbits this makes 16/42 closed; the other 26 and all broader obligations remain separate."}
 OUTPUT.write_text(json.dumps(out,indent=2)+"\n");print(out["status"]);print("SOURCE",out["source_sha256"]);print("REPORT",sh(OUTPUT))
if __name__=="__main__":main()
