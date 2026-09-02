#!/usr/bin/env python3
"""Fail-closed order-27 primary seal for the quartic-center spine-internal orbit."""
from __future__ import annotations
import hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
RAW=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_order27_raw_agent_20260823.txt"
OUTPUT=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_order27_exact_agent_20260823.json"
EXPECTED={
"rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":"A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
"rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":"E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
"rank8_delta03_e4_literal_i256_audit_common_agent.rs":"BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
"rank8_delta03_e3_cubic_exact_i256_core_root.rs":"7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
"rank8_delta01_e3_cubic_exact_i256_core_agent.rs":"B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
"produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_i256_agent.rs":"C805CD83B5D237F6E65C6798CA04C9707B6830A6BAD84CB9EE79987A07B2BF89",
"produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_i256_agent.exe":"D9712D52256B4B39BA0B2851F6A608C3108D8B5D4E15E7EC4761FD80CD62DE93",
"rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_order27_raw_agent_20260823.txt":"2EAFBAEBB6A75ED6FE6507B97233E4A547FBF8D27EADFA383738C1720F9CD492",
}
def sha(p:Path)->str:return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def main():
 a={n:sha(ROOT/n)for n in EXPECTED};assert a==EXPECTED
 lines=RAW.read_text().splitlines();assert lines[0]=="PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_PENDANT_INTERNAL_ORDER27"
 rows=dict(x.split(" ",1)for x in lines[1:]);assert set(rows)=={"ORDER27_COUNT","NONPOSITIVE","LITERAL_SPOTS","VALUE_STREAM"}
 assert rows["ORDER27_COUNT"]=="174083" and rows["NONPOSITIVE"]=="0 0 0 0" and rows["LITERAL_SPOTS"]=="43" and len(rows["VALUE_STREAM"])==64
 p={"schema":"rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-pendant-internal-order27-exact-agent-v1","status":"PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_PENDANT_INTERNAL_ORDER27","order":27,"degree_surplus":5,"root_orbit":"quartic_endpoint_cubic_path:center_cubic_pendant_internal","canonical_subdivisions":174_083,"formula_checks":174_083,"literal_spot_checks":43,"nonpositive":[0,0,0,0],"value_stream_sha256":rows["VALUE_STREAM"],"arithmetic":"checked signed i256 residual arithmetic and checked i128 independence-vector arithmetic","immutable_input_hashes":a,"source_sha256":sha(Path(__file__)),"scope_guard":"Exactly e=5, n=27, quartic_endpoint_cubic_path:center_cubic_pendant_internal, Delta0..3; independent literal audit remains required."}
 OUTPUT.write_text(json.dumps(p,indent=2)+"\n");print(p["status"]);print("COUNT",174_083);print("STREAM",rows["VALUE_STREAM"]);print("SOURCE",p["source_sha256"]);print("REPORT",sha(OUTPUT))
if __name__=="__main__":main()
