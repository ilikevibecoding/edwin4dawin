#!/usr/bin/env python3
"""Independent static auditor for the 13 residual distinct mark-only queues.

This checks source identity, exact class assignment, compilation, safe static
validation, pending terminal locks, and control-flow gating.  It never calls a
producer main function or a large-cone probe.  Passing certifies queue/scaffold
completeness only and is explicitly not a positivity certificate.
"""

from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import py_compile
import re
import tempfile


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_residual_queue_"
    "static_audit_exact_root_20260831.json"
)
MARKER = (
    "PASS_STATIC_QUEUE_SCAFFOLD_COMPLETENESS_ONLY_NOT_POSITIVITY_"
    "ISO_N6_BUNDLE_G1_DISTINCT_RESIDUAL_13_ROOT"
)
CLASS_SOURCE = (
    "certify_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_mark_only_"
    "expression_classes_root.py"
)
CLASS_SOURCE_SHA256 = (
    "55920CD34ED9D9938DE0486121D9341C4FE30C37CE1F93181A81CEA40DF6CD67"
)
CLASS_REPORT = (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_mark_only_"
    "expression_classes_exact_root_20260831.json"
)
CLASS_REPORT_SHA256 = (
    "A4E9CC944444473E378D443BCB53B0DA63337EB4654EE2D4A1593C206BC1DD2E"
)


# Exactly the non-edgeless, non-pq classes in the pinned 15-class exhaustion.
QUEUES = {
    "08D7D7D3661E866F0CBD89127826C9FD66B6CA73D5522EEC125C4ED16DB19394": {
        "representatives": ["pq,pu,pv"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_pu_pv_mark_only_common_forest_root.py",
        "sha256": "BA4C5449354DCD1BC888AEE2C11A00E62DBB3673DD2A0B1F63A68BB779504D7E",
    },
    "12F6739C612A79381E15BBF4E848BCB7F85439118155AE5536EC1C028DB2F345": {
        "representatives": ["qu", "qv"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_qu_mark_only_common_forest_root.py",
        "sha256": "DC88B4E310E70B3D3F644A4F3A73DF6F4938927C9B47320D75ABEE8B0F56DB8D",
    },
    "1E02282E60528CBC567D5F8C09F10F740745803C06B7A418530A195345FE008D": {
        "representatives": ["pq,pu", "pq,pv"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_pu_mark_only_common_forest_root.py",
        "sha256": "B60F21EDA4C029F238E3EA75AEA8F8F67A12E3E8D683CAB9A4FB4804B64CDBD4",
    },
    "4E004AB425DB65CD0C3C24833DDC906B96E53E3016779B18A85C979BCF01E7F7": {
        "representatives": ["qu,qv"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_qu_qv_mark_only_common_forest_root.py",
        "sha256": "32B38EAD7F3A3464888F6DACAEA384583A7FF9219C86166FF451B64F1BAA6AC5",
    },
    "6019EFECDB717EFC45FC01DC3C42B5D19F60AC1BD098C0A466428F7C0A11B353": {
        "representatives": ["pq,qu", "pq,qv"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_qu_mark_only_common_forest_root.py",
        "sha256": "3F8401EFD6645758B05FBFEED52AA51C6776DBACBFF924CE0DB6A109CC957516",
    },
    "63DB8F457CE7C56264FFC31DF12113E3EA0C5B845D3325D1EAD0E1B2888F504A": {
        "representatives": ["pq,qu,qv"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_qu_qv_mark_only_common_forest_root.py",
        "sha256": "AE753CD3126645FB7CDB55C35F7E6CBB582A1A72B187407A687D7E4710D99389",
    },
    "88B3DF4636B1E6171F8044E268E30CA4519DAB8D58DF463014BF1ACBE036D37C": {
        "representatives": ["pu,pv"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_pv_mark_only_common_forest_root.py",
        "sha256": "C70CA87FCD87DC1BD5CA29EB29BE90080CAF72A34BC07603958F95DCD2D39F13",
    },
    "C03466DDF51C19ED7B07111B94358D2CA2F280CD4A19B246FC0CB7A1CC96CF46": {
        "representatives": ["pu,pv,qu", "pu,pv,qv"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_pv_qu_mark_only_common_forest_root.py",
        "sha256": "EDB975373ED1003DC73F602E826841304B72DEB422459B780CD813712B4EFD39",
    },
    "C615D0004D1D2BD11B11615217A604647F2972D9A51260FF36630C35F499F199": {
        "representatives": ["pu,qu,qv", "pv,qu,qv"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_qu_qv_mark_only_common_forest_root.py",
        "sha256": "D4EBC65E82B3BE35C57604DBB45FAAEA897CD05715B8D72B1E5052608DD32435",
    },
    "C6431991F7A341708A82A62838599AC6CDFE5BCCE4F38530A9B90CD557E3F199": {
        "representatives": ["pq,pu,qv", "pq,pv,qu"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_pu_qv_mark_only_common_forest_root.py",
        "sha256": "B8200C2970439A0209DEB22EC9AA5307015583AB0863461583B578ED67C0C906",
    },
    "D37D98AE001BF6EF68C6A24D2E8116EBC0D979EED02252BEB795CF36E884B62F": {
        "representatives": ["pu", "pv"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_mark_only_common_forest_root.py",
        "sha256": "957406909752DDF1EB94FE42FC7040A49358B2AAA31CEBA43FCF74ADA7D469B4",
    },
    "D5621A149A98CE54A7FB08E7BAACBC0EFCDF09FEAD6ADE027F27D4B1C2B41641": {
        "representatives": ["pu,qu", "pv,qv"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_qu_mark_only_common_forest_root.py",
        "sha256": "9DD727FC157192877C04920462F756ACEF6926F20B8F971B3A2475A270D1C5C5",
    },
    "EF72CE682AD3727145BF4BCD2A707235F1D06A43366069917876C6B474B4F6D9": {
        "representatives": ["pu,qv", "pv,qu"],
        "producer": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_qv_mark_only_common_forest_root.py",
        "sha256": "5F2C7B07D8B13EEACCAD75FACF1340E2A251A85136EB9F830A6F4D1B0C37B2A3",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_module(path: Path, index: int):
    name = f"_queue_static_audit_{index}_{path.stem}"
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def declared_residual_digests(module) -> list[str]:
    values = []
    for name, value in vars(module).items():
        if "EXPRESSION" not in name or "SHA256" not in name:
            continue
        if isinstance(value, str) and value in QUEUES:
            values.append(value)
    return sorted(set(values))


def validate_module_static(module) -> dict:
    validators = [
        "validate_pins_and_reports",
        "validate_static_dependencies",
        "validate_pinned_reports",
    ]
    selected = [name for name in validators if callable(getattr(module, name, None))]
    assert selected, module.__file__
    getattr(module, selected[0])()
    certificate = module.expression_certificate()
    assert isinstance(certificate, dict)

    expected = module.EXPECTED_LARGE
    assert set(expected) == {"high", "low"}
    pending = {}
    for sector in ("high", "low"):
        pending[sector] = sorted(
            key for key, value in expected[sector].items()
            if isinstance(value, str) and "PENDING" in value
        )
        assert pending[sector], (module.__file__, sector)

    if callable(getattr(module, "terminal_locks_complete", None)):
        assert module.terminal_locks_complete() is False
        gate_runtime_check = "terminal_locks_complete_false"
    else:
        gate = getattr(module, "assert_large_pins_complete")
        try:
            gate()
        except (AssertionError, RuntimeError) as error:
            assert "pending" in str(error).lower() or "not frozen" in str(error).lower()
            gate_runtime_check = (
                f"assert_large_pins_complete_fail_closed_{type(error).__name__}"
            )
        else:
            raise AssertionError((module.__file__, "pending gate did not fail"))
    return {
        "validator": selected[0],
        "expression_certificate_returned": True,
        "pending_lock_fields": pending,
        "runtime_gate_check": gate_runtime_check,
    }


def gate_control_flow(path: Path) -> dict:
    tree = ast.parse(path.read_text())
    main = next(
        node for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name == "main"
    )
    gate_calls = []
    worker_calls = []
    direct_subprocess_calls = []
    for node in ast.walk(main):
        if not isinstance(node, ast.Call):
            continue
        if isinstance(node.func, ast.Name):
            name = node.func.id
            if name in {"terminal_locks_complete", "assert_large_pins_complete"}:
                gate_calls.append(node.lineno)
            if name == "ThreadPoolExecutor":
                worker_calls.append(node.lineno)
        elif isinstance(node.func, ast.Attribute):
            if (
                isinstance(node.func.value, ast.Name)
                and node.func.value.id == "subprocess"
                and node.func.attr == "run"
            ):
                direct_subprocess_calls.append(node.lineno)
    assert gate_calls and worker_calls, path.name
    final_gate = max(gate_calls)
    first_worker = min(worker_calls)
    assert final_gate < first_worker, (path.name, final_gate, first_worker)
    assert not direct_subprocess_calls, path.name
    return {
        "final_gate_line": final_gate,
        "first_worker_line": first_worker,
        "gate_precedes_worker": True,
        "main_has_no_direct_subprocess_run": True,
    }


def atomic_write(path: Path, payload: bytes) -> None:
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


def main() -> None:
    assert sha256(HERE / CLASS_SOURCE) == CLASS_SOURCE_SHA256
    assert sha256(HERE / CLASS_REPORT) == CLASS_REPORT_SHA256
    exhaustion = json.loads((HERE / CLASS_REPORT).read_text())
    assert exhaustion["source_sha256"] == CLASS_SOURCE_SHA256
    assert exhaustion["exact_expression_classes"] == 15
    assert exhaustion["classes"][
        "24E326AF2419A66C2335938056A10DD824E582372799FBC4757AF2000BDEF5E1"
    ] == ["edgeless"]
    assert exhaustion["classes"][
        "E25FCD2FEBA4085A452E4B0E540C61ADC3C60ACA66A2A1643467B70E6C865A6C"
    ] == ["pq"]
    residual = {
        digest: representatives
        for digest, representatives in exhaustion["classes"].items()
        if representatives not in (["edgeless"], ["pq"])
    }
    assert len(residual) == 13
    assert residual == {
        digest: row["representatives"] for digest, row in QUEUES.items()
    }
    assert len({row["producer"] for row in QUEUES.values()}) == 13

    pattern = (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_*_"
        "mark_only_common_forest_root.py"
    )
    discovered = {}
    queue_rows = []
    for index, (digest, row) in enumerate(sorted(QUEUES.items())):
        path = HERE / row["producer"]
        assert path.is_file(), row["producer"]
        observed_hash = sha256(path)
        assert observed_hash == row["sha256"], row["producer"]
        py_compile.compile(str(path), doraise=True)
        module = load_module(path, index)
        declared = declared_residual_digests(module)
        assert declared == [digest], (path.name, declared, digest)
        discovered.setdefault(digest, []).append(path.name)
        static = validate_module_static(module)
        control = gate_control_flow(path)
        queue_rows.append({
            "digest": digest,
            "representatives": row["representatives"],
            "producer": path.name,
            "producer_sha256": observed_hash,
            "py_compile_success": True,
            "static_check": static,
            "control_flow_gate": control,
        })

    # Scan every matching producer, not just the pinned list, for duplicate
    # declarations of a residual digest.  The separately promoted pq producer
    # is outside the residual set and is therefore ignored.
    scanned = {}
    for index, path in enumerate(sorted(HERE.glob(pattern)), start=100):
        module = load_module(path, index)
        for digest in declared_residual_digests(module):
            scanned.setdefault(digest, []).append(path.name)
    assert set(scanned) == set(QUEUES)
    assert all(len(names) == 1 for names in scanned.values()), scanned
    assert scanned == discovered

    report = {
        "marker": MARKER,
        "status": "queue/scaffold completeness only; not positivity",
        "rank": 6,
        "coefficient": "g1",
        "scope": (
            "the 13 residual nonempty non-pq exact expression classes in the "
            "distinct mark-only common-forest singleton-ordinary ordinary-leaf queue"
        ),
        "excluded_already_frozen_classes": ["edgeless", "pq"],
        "exhaustion_source": {
            "file": CLASS_SOURCE, "sha256": CLASS_SOURCE_SHA256,
        },
        "exhaustion_report": {
            "file": CLASS_REPORT, "sha256": CLASS_REPORT_SHA256,
        },
        "queues": queue_rows,
        "checks": {
            "exact_13_residual_digests_and_representatives_locked": True,
            "one_unique_hash_pinned_producer_per_class": True,
            "all_13_sources_py_compile": True,
            "all_13_safe_static_checks_pass": True,
            "all_26_sector_records_remain_pending": True,
            "all_13_pending_gates_fail_closed_at_runtime": True,
            "all_13_gates_precede_worker_creation": True,
            "all_13_main_functions_have_no_direct_subprocess_run": True,
            "no_heavy_certificate_invoked": True,
        },
        "scope_guard": (
            "This audit proves only that all 13 residual queues have unique, "
            "dependency-pinned, compiling, statically valid, fail-closed "
            "producer scaffolds. It proves no Bernstein stream nonnegativity, "
            "no expression-class positivity, no universal rank-six G1 theorem, "
            "and no part of Erdos Problem 993 beyond scaffold completeness."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    atomic_write(OUTPUT, payload)
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())


if __name__ == "__main__":
    main()
