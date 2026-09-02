#!/usr/bin/env python3
"""Third, light formula-scope audit for corrected curvature grade 16."""
from __future__ import annotations
import ast, hashlib, json, math, os
from pathlib import Path

HERE=Path(__file__).resolve().parent
CANONICAL=("probe_rank8_low_low_a23_mixed_cross_face_grade_outer_stream_agent.py","BF0F79B2A7C1F35FBBFD350601421914C71648557BF1B6E41E38F3C1C75077DC")
PRODUCER=("probe_rank8_low_low_a23_mixed_cross_curvature_grade16_tail_v_top_shared_agent.py","F8A4C160C3E4F605E8B6FEFB805691452BD4F8EA795CD269500801A1E30FB8A8")

def sha256(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()
def atomic_json(path,payload):
    temporary=path.with_suffix(path.suffix+".tmp"); temporary.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8"); os.replace(temporary,path); return sha256(path)
def function_text(tree,name):
    nodes=[node for node in tree.body if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)) and node.name==name]
    assert len(nodes)==1; return ast.unparse(nodes[0])

def factor_row(terminal,gaps):
    ratios=[None]*9; ratios[8]=terminal
    for i in range(7,-1,-1): ratios[i]=ratios[i+1]+gaps[i]
    row=[1]
    for ratio in ratios: row.append(row[-1]*ratio)
    return row
def convolution(left,right,rank): return sum(math.comb(rank,i)*left[i]*right[rank-i] for i in range(rank+1))

def main():
    for name,expected in (CANONICAL,PRODUCER): assert sha256(HERE/name)==expected
    canonical=ast.parse((HERE/CANONICAL[0]).read_text(encoding="utf-8"))
    producer=ast.parse((HERE/PRODUCER[0]).read_text(encoding="utf-8"))
    canonical_common=function_text(canonical,"build_common")
    canonical_curvature=function_text(canonical,"curvature_pieces")
    corrected=function_text(producer,"build_tail_convolutions")
    # Canonical source chooses base_v, whose left row is the oriented tail.
    assert "tail = [zero, zero, zero] + left[3:]" in canonical_common
    assert "convolution(tail, right_base, rank, zero)" in canonical_common
    assert "base_v = common['base_v']" in canonical_curvature
    assert "curvature_grade(base_v, degree, zero, h)" in canonical_curvature
    # Corrected producer independently repeats exactly that scope and uses tail,
    # never left, in its V convolution loop.
    assert "tail = [zero, zero, zero] + left[3:]" in corrected
    assert "tail[i] * right[rank - i][outer]" in corrected
    assert "left[i] * right[rank - i][outer]" not in corrected

    # Exact integer spot identities against the canonical factor-row definition.
    # The values are deterministic and include asymmetric left/right data.
    evaluations=[]
    for values in ((2,3,5,7,11,13,17,19,23),(1,4,2,8,3,9,5,7,6),(9,1,8,2,7,3,6,4,5)):
        a0,b4,b5,b6,b7,a4,a5,a6,a7=values
        left=factor_row(0,[a0,0,0,0,a4,a5,a6,a7])
        tail=[0,0,0]+left[3:]
        per_b0=[]
        for b0 in (0,1,2):
            right=factor_row(0,[b0,0,0,0,b4,b5,b6,b7])
            v={rank:convolution(tail,right,rank) for rank in (7,8,9)}
            per_b0.append(v[8]*v[8]-v[7]*v[9])
        # Quadratic b0 interpolation is exact because each V is affine in b0.
        coefficients=(per_b0[0],per_b0[1]-per_b0[0],(per_b0[2]-2*per_b0[1]+per_b0[0])//2)
        assert per_b0[2]-2*per_b0[1]+per_b0[0] == 2*coefficients[2]
        evaluations.append({"slacks":list(values),"curvature_at_b0_0_1_2":per_b0,"b0_coefficients":list(coefficients)})
    report={
        "schema":"rank8-low-low-a23-mixed-cross-curvature-grade16-tail-v-formula-scope-audit-agent-v1",
        "status":"PASS_THIRD_CANONICAL_FORMULA_SCOPE_AUDIT_TAIL_V_NOT_FULL_C",
        "canonical_source":{"path":CANONICAL[0],"sha256":CANONICAL[1]},
        "corrected_producer":{"path":PRODUCER[0],"sha256":PRODUCER[1]},
        "ast_checks":{"canonical_curvature_reads_base_v":True,"canonical_base_v_uses_left_tail":True,"corrected_V_uses_same_left_tail":True,"corrected_full_C_excluded":True},
        "exact_integer_scope_evaluations":evaluations,
        "source_sha256":sha256(Path(__file__)),
    }
    output=HERE/"rank8_low_low_a23_mixed_cross_curvature_grade16_tail_v_formula_scope_audit_agent_20260823.json"
    print("PASS",output,atomic_json(output,report),flush=True)
if __name__=="__main__": main()
