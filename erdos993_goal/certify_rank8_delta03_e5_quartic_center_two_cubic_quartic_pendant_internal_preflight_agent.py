#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,subprocess
from pathlib import Path
R=Path(__file__).resolve().parent;O=R/"rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_preflight_exact_agent_20260823.json"
E={
 "certify_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_newton_reduction_agent.py":"B805C6BED1274E84653077C1F30167A41AC6849A6A66C17A074494486B45225D",
 "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_newton_reduction_exact_agent_20260823.json":"68CAC115C0BAE9BB2F919E72C086B08EA552B45B7E6A12BF937BDA1AA9D84971",
 "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_exact_agent_20260823.json":"49F913A9869E0896A465695A80A523726FD4BA3B7124D18EB8B38C054C5BCD73",
 "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_independent_audit_agent_20260823.json":"9E410DD3D45DB35D4D7977CFB3F55A13EAD51023AEBA0F43AD51076B3D57348C",
 "rank8_delta03_e4_literal_i256_audit_common_agent.rs":"BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
 "produce_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_i256_agent.rs":"8CEBCB6C0625B4719CF23473DA62DBAEE0A713DA8AF8256390DAD6ED06B1B815",
 "produce_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_i256_agent.exe":"0636837D62F803441729AE95FA30575CAD716A1408BCCB9ADBCBF49ACC82753B",
 "audit_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_literal_i256_agent.rs":"F3B010659F62D252A931720F0F67BF2DCB759AEAC3E0DE167B0AF02650EEA831",
 "audit_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_literal_i256_agent.exe":"559A63E72D17CC21F4D80B162886E6761A13E3E866599108955F5072522FA870",
}
def sh(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(n):return subprocess.run([str(R/n),"smoke"],cwd=R,check=True,capture_output=True,text=True,timeout=180).stdout.splitlines()
def main():
 a={n:sh(R/n)for n in E};assert a==E
 rec="SMOKE_RECORDS 109 385";gate="SMOKE_GATE_FAILURES 0";stream="SMOKE_STREAM FF0C978A2322B07212B2BA5D8CCF1ABB5D46F96339953EACFCCBCDD5DA6B1FF3 8FFE1C0676118EE8EDEBD5A6BD3F6826F3F44E464EE964631AC91108F225B24B"
 assert run("produce_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_i256_agent.exe")==["PASS_E5_QUARTIC_PENDANT_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE",rec,gate,stream]
 assert run("audit_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_literal_i256_agent.exe")==["PASS_E5_QUARTIC_PENDANT_INTERNAL_INDEPENDENT_1024_LITERAL_SMOKE",rec,gate,stream]
 p={"schema":"rank8-delta03-e5-quartic-center-two-cubic-quartic-pendant-internal-preflight-agent-v1","status":"PASS_PREPARED_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_PENDANT_INTERNAL_EXACT_ENGINES","root_orbit":"quartic_center_two_cubic:quartic_pendant_internal","counts":{"keys":9878400,"all_short":2741256,"eligible_finite":2399155,"mixed_rays":7137143,"all_long_rays":1,"rays":7137144},"sealed_order27":{"canonical":191267,"nonpositive":[0,0,0,0]},"bounded_smokes":{"primary_literal":512,"audit_literal_and_cache":1024,"records":[109,385],"gate_failures":0,"streams":stream.split()[1:]},"full_workload":{"formula_evaluations_per_engine":216513475,"audit_literal_trees":23810587,"unseen_checks":28548576,"leaf_bytes":305161568,"threads":6,"ordered_tasks":56},"memory_gate_bytes":805306368,"immutable_input_hashes":a,"source_sha256":sh(Path(__file__)),"scope_guard":"Preflight only; full primary and audit streams are required."}
 O.write_text(json.dumps(p,indent=2)+"\n");print(p["status"]);print("SOURCE",p["source_sha256"]);print("REPORT",sh(O))
if __name__=="__main__":main()
