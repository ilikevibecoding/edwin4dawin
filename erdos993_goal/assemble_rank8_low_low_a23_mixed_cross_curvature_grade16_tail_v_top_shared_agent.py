#!/usr/bin/env python3
"""Hash-pinned assembler for corrected canonical-tail curvature grade 16."""
from __future__ import annotations
import hashlib,json,os
from pathlib import Path
HERE=Path(__file__).resolve().parent
JOB=("rank8_low_low_a23_mixed_cross_curvature_grade16_tail_v_top_shared_job_agent_20260823.json","6C8A81906AACA6224B888B16F64A08FFBD952BB5A8CCAA94B18C9A78F7764122")
AUDIT=("rank8_low_low_a23_mixed_cross_curvature_grade16_tail_v_top_shared_independent_audit_agent_20260823.json","5A84E6BCC47A5C8F11E17C7949554C3C417C71028BD4A1603E3245980062E272")
SCOPE=("rank8_low_low_a23_mixed_cross_curvature_grade16_tail_v_formula_scope_audit_agent_20260823.json","1A550E118C118EB55681099B9EEE320E0651A1A3A260792FC9146E2754E6C188")
PRODUCER_SOURCE="F8A4C160C3E4F605E8B6FEFB805691452BD4F8EA795CD269500801A1E30FB8A8"; AUDIT_SOURCE="4F17E61AF0DF5C403E0B1867B3FE9377A074A60AC433C5109BBB359122E33331"; SCOPE_SOURCE="87162C3AE0D6BFC687A0B5DFDA45115A802672A819B4DE49817A1032A08E9CD9"
LABELS=("curvature_middle_times_4","curvature_far"); FACES=(("01",[0,1]),("10",[1,0]))
def sha256(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()
def pinned(item):
    path=HERE/item[0]; assert sha256(path)==item[1]; return json.loads(path.read_text(encoding="utf-8"))
def atomic_json(path,payload):
    temporary=path.with_suffix(path.suffix+".tmp"); temporary.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8"); os.replace(temporary,path); return sha256(path)
def main():
    job=pinned(JOB); audit=pinned(AUDIT); scope=pinned(SCOPE)
    assert job["status"]=="PASS_EXACT_CANONICAL_TAIL_V_SHARED_GRADE16_FOUR_CURVATURE_CELLS_NONNEGATIVE" and job["source_sha256"]==PRODUCER_SOURCE
    assert audit["status"]=="PASS_INDEPENDENT_CLOSED_FORM_TAIL_V_RECONSTRUCTION_ALL_FOUR_GRADE16_CURVATURE_CELLS" and audit["source_sha256"]==AUDIT_SOURCE and audit["imports_producer"] is False and audit["producer_job_sha256"]==JOB[1]
    assert scope["status"]=="PASS_THIRD_CANONICAL_FORMULA_SCOPE_AUDIT_TAIL_V_NOT_FULL_C" and scope["source_sha256"]==SCOPE_SOURCE
    assert job["formula_scope"]["full_convolution_c_excluded"] is True and audit["literal_identity_checks"]["full_convolution_C_excluded"] is True and scope["ast_checks"]["corrected_full_C_excluded"] is True
    produced={(x["face_token"],x["auxiliary"]):x for x in job["completed_cells"]}; replayed={(x["face_token"],x["auxiliary"]):x for x in audit["cells"]}
    for token,face in FACES:
        rows=[]
        for label in LABELS:
            p=produced[(token,label)]; r=replayed[(token,label)]; path=Path(p["manifest"]); assert sha256(path)==p["manifest_sha256"]; m=json.loads(path.read_text(encoding="utf-8"))
            assert m["face"]==face and m["auxiliary"]==label and m["source_sha256"]==PRODUCER_SOURCE and m["literal_identities"]["canonical_oriented_left_tail_used"] is True and m["literal_identities"]["full_convolution_C_excluded"] is True
            assert m["result"]["negative_terms"]==r["replayed_negative_terms"]==0 and m["result"]["ordered_coefficient_sha256"]==r["replayed_ordered_coefficient_sha256"]==p["ordered_coefficient_sha256"]
            rows.append({"auxiliary":label,"family":"curvature","producer_manifest":path.name,"producer_manifest_sha256":p["manifest_sha256"],"producer_source_sha256":PRODUCER_SOURCE,"audit_report":AUDIT[0],"audit_report_sha256":AUDIT[1],"audit_source_sha256":AUDIT_SOURCE,"mixed_support_terms":p["mixed_support_terms"],"ordered_coefficient_sha256":p["ordered_coefficient_sha256"],"negative_terms":0})
        payload={"schema":"rank8-low-low-a23-mixed-cross-face-grade16-tail-v-assembler-agent-v1","status":f"PASS_HASH_PINNED_FACE_{token}_GRADE_16_CURVATURE_ROWS_INDEPENDENTLY_AUDITED","scope_note":"Exactly two curvature cells; grade16 strong cells remain missing","face":face,"bridge_corner":[2*face[0],2*face[1]],"total_ordinary_slack_degree":16,"rows":rows,"canonical_tail_job":{"path":JOB[0],"sha256":JOB[1]},"independent_coefficient_audit":{"path":AUDIT[0],"sha256":AUDIT[1]},"third_formula_scope_audit":{"path":SCOPE[0],"sha256":SCOPE[1]},"formula_scope":{"canonical_oriented_left_tail_V":True,"full_convolution_C_excluded":True,"face_01_equals_face_10":True,"middle_equals_4_times_far":True},"source_sha256":sha256(Path(__file__))}
        output=HERE/f"rank8_low_low_a23_mixed_cross_face_{token}_curvature_grade_16_tail_v_assembler_agent_20260823.json"; print("PASS",output,atomic_json(output,payload),flush=True)
if __name__=="__main__": main()
