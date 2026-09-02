#!/usr/bin/env python3
"""Independent closed-product audit of all four curvature grade-16 cells.

No producer code is imported.  The left and the two affine-b0 right factor
rows are written as explicit prefix products, then every coefficient of
C8^2-C7*C9 is reconstructed and compared with all four producer manifests.
"""

from __future__ import annotations

import argparse
import ctypes
import gc
import hashlib
import json
import math
import os
from ctypes import wintypes
from pathlib import Path

from flint import fmpz_mpoly_ctx


HERE = Path(__file__).resolve().parent
JOB = "rank8_low_low_a23_mixed_cross_curvature_grade16_top_shared_job_agent_20260823.json"
JOB_SHA256 = "FB2071B5D79D1016CADDD6E6F53BCA2D13E9019925E4A9946F768AF02780FABE"
PRODUCER_SOURCE = "88B9319CE3A6C4B78E4E097E8A725196B3E30B99ADB3D923AB73DA4F164B0282"
NOTE = (
    "RANK8_LOW_LOW_A23_MIXED_CROSS_HIGH_GRADE_BOUNDS_AGENT_20260822.md",
    "BE056D1EAC7AD07EDB42BFDEE40873C949D32D24F3EC8912BD5B555D5E3B394E",
)
REDUCED = ("a0", "b4", "b5", "b6", "b7", "a4", "a5", "a6", "a7")
GA = (0, 1, 2, 3, 4); GB = (5, 6, 7, 8)
FACES = (("01", (0, 1)), ("10", (1, 0)))
LABELS = (("curvature_middle_times_4", 4), ("curvature_far", 1))
DEGREE = 16; LIMIT = 475_000_000; FAILURE_CONTEXT: dict = {}


class PMC(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
        ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t), ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t), ("PrivateUsage", ctypes.c_size_t),
    ]


def private_bytes():
    c = PMC(); c.cb = ctypes.sizeof(c)
    current = ctypes.windll.kernel32.GetCurrentProcess; current.restype = wintypes.HANDLE
    query = ctypes.windll.psapi.GetProcessMemoryInfo
    query.argtypes = (wintypes.HANDLE, ctypes.POINTER(PMC), wintypes.DWORD)
    query.restype = wintypes.BOOL
    if not query(current(), ctypes.byref(c), c.cb): raise OSError("GetProcessMemoryInfo failed")
    return int(c.PrivateUsage)


def guard(stage, peak, limit):
    current = private_bytes(); peak[0] = max(peak[0], current)
    FAILURE_CONTEXT.update(stage=stage, private_bytes=current, peak_private_bytes=peak[0])
    if current >= limit: raise MemoryError(f"private-memory guard at {stage}: {current} >= {limit}")


def sha256(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def atomic_json(path, payload):
    path = Path(path); temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path); return sha256(path)


def pinned_json(path, expected):
    assert sha256(path) == expected, (Path(path).name, sha256(path), expected)
    return json.loads(Path(path).read_text(encoding="utf-8"))


def explicit_rows(context, peak, limit):
    x = dict(zip(REDUCED, context.gens())); zero = context.constant(0); one = context.constant(1)
    A = x["a4"] + x["a5"] + x["a6"] + x["a7"]
    A5 = x["a5"] + x["a6"] + x["a7"]; A6 = x["a6"] + x["a7"]
    X = x["a0"] + A
    B = x["b4"] + x["b5"] + x["b6"] + x["b7"]
    B5 = x["b5"] + x["b6"] + x["b7"]; B6 = x["b6"] + x["b7"]
    left = [
        one, X, X*A, X*A**2, X*A**3, X*A**4,
        X*A**4*A5, X*A**4*A5*A6, X*A**4*A5*A6*x["a7"], zero,
    ]
    right0 = [
        one, B, B**2, B**3, B**4, B**5,
        B**5*B5, B**5*B5*B6, B**5*B5*B6*x["b7"], zero,
    ]
    right1 = [
        zero, one, B, B**2, B**3, B**4,
        B**4*B5, B**4*B5*B6, B**4*B5*B6*x["b7"], zero,
    ]
    for rank in range(1, 9): assert right0[rank] == B * right1[rank]
    guard("explicit factor rows", peak, limit)
    c = {}
    for rank in (7, 8, 9):
        c0 = zero; c1 = zero
        for i in range(rank + 1):
            c0 += math.comb(rank, i) * left[i] * right0[rank-i]
            c1 += math.comb(rank, i) * left[i] * right1[rank-i]
        c[rank] = (c0, c1); guard(f"explicit convolution {rank}", peak, limit)
    return c


def slice_polynomial(c, outer, peak, limit):
    if outer == 0:
        value = c[8][0]*c[8][0]; guard("audit outer0 square", peak, limit)
        other = c[7][0]*c[9][0]; guard("audit outer0 product", peak, limit); value -= other
    elif outer == 1:
        value = 2*c[8][0]*c[8][1]; guard("audit outer1 first", peak, limit)
        other = c[7][0]*c[9][1]; guard("audit outer1 second", peak, limit); value -= other
        del other; gc.collect(); other = c[7][1]*c[9][0]
        guard("audit outer1 third", peak, limit); value -= other
    else:
        assert outer == 2
        value = c[8][1]*c[8][1]; guard("audit outer2 square", peak, limit)
        other = c[7][1]*c[9][1]; guard("audit outer2 product", peak, limit); value -= other
    del other; gc.collect(); guard(f"audit outer{outer} determinant", peak, limit); return value


def replay(polynomial, outer, completes, peak, limit):
    digests = {1: hashlib.sha256(), 4: hashlib.sha256()}
    terms = negative = 0; minimum = first = None; previous = None
    for index in range(len(polynomial)):
        reduced = tuple(map(int, polynomial.monomial(index)))
        key = (-sum(reduced), tuple(reversed(reduced)))
        if previous is not None: assert previous <= key
        previous = key; assert sum(reduced) + outer == DEGREE
        if not any(reduced[i] for i in GA): continue
        if outer == 0 and not any(reduced[i] for i in GB): continue
        coefficient = int(polynomial.coefficient(index)); full = (0,0,0,0,0)+reduced+(outer,)
        prefix = ",".join(map(str, full)) + ":"
        for scale in (1,4):
            encoded = (prefix + str(scale*coefficient) + "\n").encode()
            digests[scale].update(encoded); completes[scale].update(encoded)
        terms += 1; minimum = coefficient if minimum is None else min(minimum, coefficient)
        if coefficient < 0:
            negative += 1
            if first is None: first = {"monomial": list(full), "coefficient": coefficient}
        if terms % 100_000 == 0:
            print("AUDIT OUTER", outer, "MIXED", terms, "PRIVATE", private_bytes(), flush=True)
            guard(f"audit outer{outer} term {terms}", peak, limit)
    return {
        "outer_exponent": outer, "unfiltered_terms": len(polynomial),
        "mixed_support_terms": terms, "negative_terms": negative,
        "minimum_far": minimum, "first_negative_far": first,
        "ordered_far_coefficient_sha256": digests[1].hexdigest().upper(),
        "ordered_middle_coefficient_sha256": digests[4].hexdigest().upper(),
    }


def scaled(item, scale):
    first = item["first_negative_far"]
    return {
        "outer_exponent": item["outer_exponent"], "unfiltered_terms": item["unfiltered_terms"],
        "mixed_support_terms": item["mixed_support_terms"], "negative_terms": item["negative_terms"],
        "minimum": None if item["minimum_far"] is None else scale*item["minimum_far"],
        "first_negative": None if first is None else {
            "monomial": first["monomial"], "coefficient": scale*first["coefficient"]
        },
        "ordered_coefficient_sha256": item[
            "ordered_far_coefficient_sha256" if scale == 1 else "ordered_middle_coefficient_sha256"
        ],
    }


def validate(job, replays, complete):
    assert job["status"] == "PASS_EXACT_SHARED_GRADE16_FOUR_CURVATURE_CELLS_NONNEGATIVE"
    assert job["source_sha256"] == PRODUCER_SOURCE and job["outer_slices"] == replays
    assert job["literal_identity_proof"]["face_01_equals_face_10"] is True
    assert job["literal_identity_proof"]["middle_equals_4_times_far"] is True
    produced = {(x["face_token"],x["auxiliary"]): x for x in job["completed_cells"]}; cells=[]
    for token, face in FACES:
        for label, scale in LABELS:
            item = produced[(token,label)]; path = Path(item["manifest"])
            assert sha256(path) == item["manifest_sha256"]
            manifest = json.loads(path.read_text(encoding="utf-8"))
            assert manifest["source_sha256"] == PRODUCER_SOURCE
            assert manifest["face"] == list(face) and manifest["auxiliary"] == label
            assert manifest["result"]["negative_terms"] == 0
            assert manifest["result"]["ordered_coefficient_sha256"] == complete[scale]
            chunks = manifest["result"]["chunks"]; assert len(chunks) == 3
            for source, record in zip(replays, chunks):
                chunk_path = Path(record["path"]); assert sha256(chunk_path) == record["sha256"]
                chunk = json.loads(chunk_path.read_text(encoding="utf-8")); expected = scaled(source, scale)
                assert chunk["chunk"] == expected and chunk["source_sha256"] == PRODUCER_SOURCE
                assert record["ordered_coefficient_sha256"] == expected["ordered_coefficient_sha256"]
                assert record["negative_terms"] == 0
            cells.append({
                "face_token": token, "face": list(face), "auxiliary": label,
                "scale_from_far": scale, "producer_manifest": path.name,
                "producer_manifest_sha256": item["manifest_sha256"],
                "mixed_support_terms": item["mixed_support_terms"], "replayed_negative_terms": 0,
                "replayed_ordered_coefficient_sha256": complete[scale],
            })
    assert cells[0]["replayed_ordered_coefficient_sha256"] == cells[2]["replayed_ordered_coefficient_sha256"]
    assert cells[1]["replayed_ordered_coefficient_sha256"] == cells[3]["replayed_ordered_coefficient_sha256"]
    return cells


def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--private-limit",type=int,default=LIMIT); args=parser.parse_args()
    assert JOB_SHA256 != "__PIN_AFTER_PRODUCER__" and sha256(HERE/NOTE[0]) == NOTE[1]
    job=pinned_json(HERE/JOB,JOB_SHA256); peak=[0]; guard("audit start",peak,args.private_limit)
    context=fmpz_mpoly_ctx.get(REDUCED,"degrevlex"); c=explicit_rows(context,peak,args.private_limit)
    completes={1:hashlib.sha256(),4:hashlib.sha256()}; replays=[]
    for outer in (0,1,2):
        FAILURE_CONTEXT["outer_exponent"]=outer; polynomial=slice_polynomial(c,outer,peak,args.private_limit)
        item=replay(polynomial,outer,completes,peak,args.private_limit); replays.append(item)
        print("AUDIT SLICE",outer,"UNFILTERED",item["unfiltered_terms"],"MIXED",
              item["mixed_support_terms"],"NEGATIVE",item["negative_terms"],"MIN",item["minimum_far"],flush=True)
        del polynomial; gc.collect(); guard(f"audit released outer{outer}",peak,args.private_limit)
    complete={scale:d.hexdigest().upper() for scale,d in completes.items()}; cells=validate(job,replays,complete)
    report={
        "schema":"rank8-low-low-a23-mixed-cross-grade16-top-shared-independent-audit-agent-v1",
        "status":"PASS_INDEPENDENT_CLOSED_FORM_RECONSTRUCTION_ALL_FOUR_GRADE16_CURVATURE_CELLS",
        "imports_producer":False,"producer_job":JOB,"producer_job_sha256":JOB_SHA256,
        "producer_source_sha256":PRODUCER_SOURCE,"total_ordinary_slack_degree":DEGREE,
        "outer_exponents_replayed":[0,1,2],"replayed_outer_slices":replays,"cells":cells,
        "literal_identity_checks":{
            "P_Q_and_face_coordinates_absent_from_top_rows":True,
            "face_01_equals_face_10_coefficientwise":True,"middle_equals_4_times_far_coefficientwise":True,
            "all_four_rows_have_zero_negative_coefficients":True,
        },
        "hard_private_memory_limit_bytes":args.private_limit,
        "observed_peak_private_bytes_at_checkpoints":peak[0],
        "theoretical_note":{"path":NOTE[0],"sha256":NOTE[1]},"source_sha256":sha256(Path(__file__)),
    }
    output=HERE/"rank8_low_low_a23_mixed_cross_curvature_grade16_top_shared_independent_audit_agent_20260823.json"
    print("AUDIT REPORT",output,atomic_json(output,report),report["status"],flush=True)


if __name__=="__main__":
    try: main()
    except BaseException as exc:
        atomic_json(HERE/"rank8_low_low_a23_mixed_cross_curvature_grade16_top_shared_independent_audit_failure_agent_20260823.json",{
            "schema":"rank8-low-low-a23-mixed-cross-grade16-top-shared-independent-audit-failure-agent-v1",
            "status":"FAIL_CLOSED_INDEPENDENT_AUDIT_EXCEPTION_OR_MEMORY_STOP",
            "exception_type":type(exc).__name__,"exception":str(exc),"context":FAILURE_CONTEXT,
            "source_sha256":sha256(Path(__file__)),
        }); raise
