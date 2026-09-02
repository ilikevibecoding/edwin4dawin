#!/usr/bin/env python3
"""Fail-closed order-27 literal audit seal for the endpoint-quartic leaf."""
from __future__ import annotations
import hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
PRIMARY=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_exact_agent_20260823.json"
RAW=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_literal_raw_agent_20260823.txt"
OUTPUT=ROOT/"rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_independent_audit_agent_20260823.json"
EXPECTED={
"rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":"A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
"rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":"E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
"seal_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_exact_agent.py":"95600C06DAA74549C0C78B7CC16F5EDB5EBE55052B95E64EDB9A025A04D8B78E",
"rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_exact_agent_20260823.json":"DCBF568C6C849E20D64C3444A8CF566E95BFAF5C1523B22F083CE50F6E918E6A",
"rank8_delta03_e4_literal_i256_audit_common_agent.rs":"BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
"rank8_delta03_e3_cubic_exact_i256_core_root.rs":"7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
"rank8_delta01_e3_cubic_exact_i256_core_agent.rs":"B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
"audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_literal_i256_agent.rs":"1EA80AAF97878002EC851A25274286DB5B251B451A1DDCB744E60413E2C6A784",
"audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_literal_i256_agent.exe":"F525B57EC4BBC2EAC8629D9E9FF4528BE41B2B13C9045944FA952385FFD03774",
"rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_literal_raw_agent_20260823.txt":"F33657750B2FE27F7B6B7E301FFB9BB98F475323C352C645362677237955A953",
}
def sha(p:Path)->str:return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def main():
 a={n:sha(ROOT/n)for n in EXPECTED};assert a==EXPECTED;p0=json.loads(PRIMARY.read_text());assert p0["status"]=="PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF_ORDER27"
 lines=RAW.read_text().splitlines();assert lines[0]=="PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF_ORDER27";rows=dict(x.split(" ",1)for x in lines[1:])
 assert set(rows)=={"RAW_COMPOSITIONS","ORDER27_COUNT","NONPOSITIVE","LITERAL_TREES","VALUE_STREAM"};assert rows["RAW_COMPOSITIONS"]=="480700" and rows["ORDER27_COUNT"]=="161161" and rows["NONPOSITIVE"]=="0 0 0 0" and rows["LITERAL_TREES"]=="161161" and rows["VALUE_STREAM"]==p0["value_stream_sha256"]
 p={"schema":"rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-leaf-order27-independent-audit-agent-v1","status":"PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF_ORDER27_AUDIT","audit_claim":"An independently transcribed checked-i256 engine enumerated all 480,700 positive compositions by cut positions, retained 161,161 canonical representatives, rebuilt every literal tree at the quartic leaf root, and matched the complete primary value stream.","no_gap_enumeration":{"raw_positive_compositions":480_700,"rooted_automorphism_group_order":4,"partition_burnside_orbits":161_161,"direct_canonical_representatives":161_161,"burnside_fixed_counts":{"identity":480_700,"single_transposition_each":76_714,"single_transposition_elements":2,"double_transposition":10_516}},"exact_checks":{"literal_tree_checks":161_161,"nonpositive":[0,0,0,0]},"matching_value_stream_sha256":rows["VALUE_STREAM"],"observed_runtime_seconds":2.661,"arithmetic":"checked signed i256 residual arithmetic and checked i128 independence-vector arithmetic","immutable_input_hashes":a,"source_sha256":sha(Path(__file__)),"scope_guard":"Exactly e=5, n=27, quartic_endpoint_cubic_path:quartic_leaf, Delta0..3; no broader claim."}
 assert (480_700+2*76_714+10_516)//4==161_161
 OUTPUT.write_text(json.dumps(p,indent=2)+"\n");print(p["status"]);print("LITERAL_TREES",161_161);print("STREAM",rows["VALUE_STREAM"]);print("SOURCE",p["source_sha256"]);print("REPORT",sha(OUTPUT))
if __name__=="__main__":main()
