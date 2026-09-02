#!/usr/bin/env python3
"""Fail-closed seal for the endpoint-cubic-pendant-internal literal audit."""

from __future__ import annotations
import hashlib,json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
PRIMARY=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_all_order_exact_agent_20260823.json"
RAW=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_literal_i256_raw_agent_20260823.txt"
OUTPUT=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json"
EXPECTED={
 "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":"A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
 "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":"E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
 "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":"213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
 "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":"BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
 "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_newton_reduction_exact_agent_20260823.json":"3133A55138FCA7D9BA62A95F8D7B385C7EAF5E075B931A41BC888CDD25F762EF",
 "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_exact_agent.py":"683721CA6D63964A8CEB2C19EFD105D60638C77DC3DDED38634CE2B7313D08AE",
 "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_all_order_exact_agent_20260823.json":"95C453545E643764C7387E2961C8D84949A74CAB1B245022BBED3D3EF7FBA182",
 "rank8_delta03_e4_literal_i256_audit_common_agent.rs":"BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
 "rank8_delta03_e3_cubic_exact_i256_core_root.rs":"7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
 "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":"B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
 "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_literal_i256_agent.rs":"7C5A0FD41E89898990B60306B405D195EB7F066A5B7E55D82AE44FC6F4640C32",
 "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_literal_i256_agent.exe":"7E213B5FBBF724C01C6609122FB41927A3278FD10EA2D7513A1D9C38F9CB5DF9",
 "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_literal_i256_raw_agent_20260823.txt":"986ED233C2B7D6221278F9C56F7C2B25E85A7316CE8B1DF43A9D2D7BD4AB225A",
}
def sh(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def main():
 actual={n:sh(ROOT/n)for n in EXPECTED};assert actual==EXPECTED
 primary=json.loads(PRIMARY.read_text());assert primary["status"]=="PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_PENDANT_INTERNAL_N28_PLUS"
 lines=RAW.read_text().splitlines();assert lines[0]=="PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_PENDANT_INTERNAL"
 rows=dict(x.split(" ",1)for x in lines[1:]);assert set(rows)=={"COUNTS","UNSEEN","LITERAL_TREES","LITERAL_RAY_POINTS","COEFFICIENT_MERKLE_STREAM","FINITE_MERKLE_STREAM"}
 assert rows["COUNTS"]=="4148928 3619379 10602815 1 10602816";assert rows["UNSEEN"]=="42411264";assert rows["LITERAL_TREES"]=="35427827";assert rows["LITERAL_RAY_POINTS"]=="0 13 29"
 assert rows["COEFFICIENT_MERKLE_STREAM"]==primary["coefficient_merkle_stream_sha256"];assert rows["FINITE_MERKLE_STREAM"]==primary["finite_merkle_stream_sha256"]
 p={"schema":"rank8-delta03-e5-quartic-endpoint-cubic-path-endpoint-cubic-pendant-internal-all-order-independent-audit-agent-v1","status":"PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_PENDANT_INTERNAL_N28_PLUS_AUDIT","audit_claim":"A separately compiled checked-i256 engine independently enumerated every endpoint-cubic-pendant-internal quotient key, used a separately transcribed endpoint-to-center-to-quartic message construction, matched every finite and coefficient record, and rebuilt every eligible finite tree plus S=0,13,29 on every ray by generic literal forest DP.","root_orbit":"quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal","counts":{"all_short_total":4148928,"all_short_n28_plus":3619379,"mixed_rays":10602815,"all_long_rays":1,"non_all_short_rays":10602816,"literal_trees_evaluated":35427827,"literal_ray_points":[0,13,29],"unseen_S29_rank_checks":42411264},"matching_coefficient_merkle_stream_sha256":rows["COEFFICIENT_MERKLE_STREAM"],"matching_finite_merkle_stream_sha256":rows["FINITE_MERKLE_STREAM"],"observed_audit_runtime_seconds":0.0,"arithmetic":"six-thread checked signed i256 residual/Newton arithmetic with 48 deterministic tasks and decode-on-demand core keys","immutable_input_hashes":actual,"source_sha256":sh(Path(__file__)),"scope_guard":"Audit credits only quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal for n>=28; no other e=5 orbit is credited."}
 OUTPUT.write_text(json.dumps(p,indent=2)+"\n");print(p["status"]);print("STREAM",p["matching_coefficient_merkle_stream_sha256"],p["matching_finite_merkle_stream_sha256"]);print("SOURCE",p["source_sha256"]);print("REPORT",sh(OUTPUT))
if __name__=="__main__":main()
