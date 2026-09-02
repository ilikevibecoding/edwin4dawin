#!/usr/bin/env python3
"""Fail-closed seal for the endpoint-cubic-pendant-internal primary."""

from __future__ import annotations
import hashlib,json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
RAW=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_i256_raw_agent_20260823.txt"
OUTPUT=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_all_order_exact_agent_20260823.json"
EXPECTED={
 "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":"A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
 "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":"E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
 "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_newton_reduction_agent.py":"EBD1CEF55EC8BC7503EBA0EEE9F34E3B32AA8E49E8F12391174934BD89AA59A2",
 "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_newton_reduction_exact_agent_20260823.json":"3133A55138FCA7D9BA62A95F8D7B385C7EAF5E075B931A41BC888CDD25F762EF",
 "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_preflight_agent.py":"3ABEED87164D8E397C55272549D0DBB0F0CEBCD7C20A31BD99FE266AA33E2A7E",
 "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_preflight_exact_agent_20260823.json":"B62FA721746161356C6473D6ABEA8B97F060CB6CA1082F79A7E678DC763939D8",
 "rank8_delta03_e4_literal_i256_audit_common_agent.rs":"BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
 "rank8_delta03_e3_cubic_exact_i256_core_root.rs":"7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
 "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":"B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
 "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_i256_agent.rs":"A3B0D2F1627E2F27DE6B7FB66AAED0E86982467957C59FDE41681047F6D7E036",
 "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_i256_agent.exe":"D7F0E415B6303D7E260CF6CD92E1541668B5332FAA64B338CDAE07E647D5DFDF",
 "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_i256_raw_agent_20260823.txt":"2965054D00897F6A936318E41463855C859DEFF1FC5FECC060779DAC53778D3D",
}
def sh(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def main():
 actual={n:sh(ROOT/n)for n in EXPECTED};assert actual==EXPECTED
 lines=RAW.read_text().splitlines();assert lines[0]=="PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_PENDANT_INTERNAL"
 rows=dict(x.split(" ",1)for x in lines[1:]);assert set(rows)=={"COUNTS","UNSEEN","LITERAL_CHECKS","COEFFICIENT_MERKLE_STREAM","FINITE_MERKLE_STREAM"}
 assert rows["COUNTS"]=="4148928 3619379 10602815 1 10602816";assert rows["UNSEEN"]=="42411264";assert rows["LITERAL_CHECKS"]=="24"
 for k in("COEFFICIENT_MERKLE_STREAM","FINITE_MERKLE_STREAM"):assert len(rows[k])==64;int(rows[k],16)
 p={"schema":"rank8-delta03-e5-quartic-endpoint-cubic-path-endpoint-cubic-pendant-internal-all-order-exact-agent-v1","status":"PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_PENDANT_INTERNAL_N28_PLUS","theorem":"For an endpoint-cubic-pendant-internal root in every subdivision of the quartic-endpoint-cubic-path e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.","root_orbit":"quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal","quotient_counts":{"all_short_total":4148928,"all_short_n28_plus":3619379,"mixed_rays":10602815,"all_long_rays":1,"non_all_short_rays":10602816},"rank_ray_samples":10602816*4*29,"samples_per_rank_ray":29,"degree_bounds":{"0":28,"1":28,"2":27,"3":26},"newton_gate":"d0>0, d1>0, remaining coefficients through the exact degree nonnegative, all higher coefficients zero, and S=29 checked on every rank-ray","unseen_S29_rank_checks":42411264,"literal_formula_spot_checks":24,"coefficient_merkle_stream_sha256":rows["COEFFICIENT_MERKLE_STREAM"],"finite_merkle_stream_sha256":rows["FINITE_MERKLE_STREAM"],"observed_primary_runtime_seconds":737.0,"arithmetic":"six-thread checked signed i256 residual/Newton arithmetic with decode-on-demand core keys","immutable_input_hashes":actual,"source_sha256":sh(Path(__file__)),"scope_guard":"Exactly quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal for n>=28; independent audit remains required and no other e=5 orbit is credited."}
 OUTPUT.write_text(json.dumps(p,indent=2)+"\n");print(p["status"]);print("STREAM",p["coefficient_merkle_stream_sha256"],p["finite_merkle_stream_sha256"]);print("SOURCE",p["source_sha256"]);print("REPORT",sh(OUTPUT))
if __name__=="__main__":main()
