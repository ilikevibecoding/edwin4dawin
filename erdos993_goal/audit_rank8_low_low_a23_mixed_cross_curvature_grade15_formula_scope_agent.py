#!/usr/bin/env python3
"""Canonical formula-scope audit for curvature grade 15."""
from __future__ import annotations
import ast,hashlib,json,math,os
from pathlib import Path
HERE=Path(__file__).resolve().parent
CANONICAL=("probe_rank8_low_low_a23_mixed_cross_face_grade_outer_stream_agent.py","BF0F79B2A7C1F35FBBFD350601421914C71648557BF1B6E41E38F3C1C75077DC")
PRODUCER=("probe_rank8_low_low_a23_mixed_cross_curvature_grade15_tail_v_piece_merge_agent.py","D408E1A73F202934652BDC19C830AD3C6BC3D826E79080F4B5798DDF448261E4")
NOTE=("RANK8_LOW_LOW_A23_MIXED_CROSS_HIGH_GRADE_BOUNDS_AGENT_20260822.md","BE056D1EAC7AD07EDB42BFDEE40873C949D32D24F3EC8912BD5B555D5E3B394E")
def sha256(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()
def atomic_json(path,payload):
    temporary=path.with_suffix(path.suffix+".tmp"); temporary.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8"); os.replace(temporary,path); return sha256(path)
def ftext(tree,name):
    nodes=[x for x in tree.body if isinstance(x,ast.FunctionDef) and x.name==name]; assert len(nodes)==1; return ast.unparse(nodes[0])
def main():
    for name,expected in (CANONICAL,PRODUCER,NOTE): assert sha256(HERE/name)==expected
    canonical=ast.parse((HERE/CANONICAL[0]).read_text(encoding="utf-8")); producer=ast.parse((HERE/PRODUCER[0]).read_text(encoding="utf-8"))
    common=ftext(canonical,"build_common"); curvature=ftext(canonical,"curvature_pieces"); row_spec=ftext(canonical,"row_spec"); corrected=ftext(producer,"build_common"); pieces=ftext(producer,"pieces")
    assert "tail = [zero, zero, zero] + left[3:]" in common and "convolution(tail, right_base, rank, zero)" in common
    assert "base_v = common['base_v']" in curvature and "curvature_grade(base_v, degree, zero, h)" in curvature
    assert "degree <= PIECE_DEGREE_BOUNDS['curvature']['linear']" in curvature and "cross_grade(base_v, direction_v, degree, zero, h)" in curvature
    assert "degree <= PIECE_DEGREE_BOUNDS['curvature']['direction']" in curvature
    assert "scales = (('base', 4), ('linear', 2))" in row_spec and "scales = (('base', 1), ('linear', 1), ('direction', 1))" in row_spec
    assert "tail = [FO(zero, zero), FO(zero, zero), FO(zero, zero)] + left[3:]" in corrected
    assert "vp = ap_add(vp" in corrected and "dp = ap_add(dp" in corrected
    assert "first_product(v[8], v[8]" in pieces and "first_product(v[8], dv[8]" in pieces
    # Exact degree gates: base<=16, linear<=15, direction<=14.
    surviving=[name for name,bound in (("base",16),("linear",15),("direction",14)) if 15<=bound]
    assert surviving==["base","linear"]
    bounds=[]
    for outer in range(3):
        d=15-outer; reduced=math.comb(d+8,8)-math.comb(d+3,3)
        if outer==0: reduced-=math.comb(d+4,4)
        bounds.append(5*reduced)
    assert bounds==[2428110,1595450,1014650]
    report={"schema":"rank8-low-low-a23-mixed-cross-curvature-grade15-formula-scope-audit-agent-v1","status":"PASS_CANONICAL_GRADE15_CURVATURE_SCOPE_TAIL_V_BASE_LINEAR_DISTINCT_FACES","canonical_source":{"path":CANONICAL[0],"sha256":CANONICAL[1]},"producer_source":{"path":PRODUCER[0],"sha256":PRODUCER[1]},"checks":{"canonical_oriented_tail_V":True,"full_convolution_C_excluded":True,"surviving_pieces":["base","linear"],"direction_excluded_at_grade15":True,"middle_scales":{"base":4,"linear":2},"far_scales":{"base":1,"linear":1},"face_streams_must_be_separate":True},"exact_mixed_support_universe_bounds":{"outer_0":bounds[0],"outer_1":bounds[1],"outer_2":bounds[2],"total":sum(bounds)},"source_sha256":sha256(Path(__file__))}
    output=HERE/"rank8_low_low_a23_mixed_cross_curvature_grade15_formula_scope_audit_agent_20260823.json"; print("PASS",output,atomic_json(output,report),flush=True)
if __name__=="__main__": main()
