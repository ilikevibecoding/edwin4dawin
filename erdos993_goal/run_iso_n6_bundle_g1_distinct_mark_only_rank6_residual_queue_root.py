#!/usr/bin/env python3
"""Fail-closed sequential runner for the 13 residual rank-six classes.

Default operation is a static dry run.  It never launches a producer.  The
runner pins the frozen class order, expression digests, labelled members, and
producer source hashes; audits each producer's terminal-lock state; and checks
that the protected distinct-pq replay is absent and resource headroom is safe.

Execution requires both ``--execute SLUG`` and ``--authorize-one-class``.  No
interface exists for executing more than one class.  A successful child is not
treated as a promotion until its exact report, marker, source hash, expression
digest, two sector records, zero-negative counts, and row hashes are replayed.
"""

from __future__ import annotations

import argparse
import ast
import ctypes
from ctypes import wintypes
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys


HERE = Path(__file__).resolve().parent
CLASS_REPORT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_mark_only_"
    "expression_classes_exact_root_20260831.json"
)
CLASS_REPORT_SHA256 = (
    "A4E9CC944444473E378D443BCB53B0DA63337EB4654EE2D4A1593C206BC1DD2E"
)
MIN_AVAILABLE_PHYSICAL_GIB = 12
MIN_AVAILABLE_COMMIT_GIB = 16
MIN_FREE_DISK_GIB = 20
GIB = 1024 ** 3
REQUIRED_STREAM_FIELDS = {
    "power_terms", "cube_degrees", "bernstein_rows", "positive",
    "negative", "minimum", "rows_sha256",
}


# Frozen expression-class order after removing edgeless and the protected pq
# class.  This is an explicit queue, never a filesystem-discovered worklist.
QUEUE = (
    {
        "slug": "pu",
        "digest": "D37D98AE001BF6EF68C6A24D2E8116EBC0D979EED02252BEB795CF36E884B62F",
        "members": ["pu", "pv"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_mark_only_common_forest_root.py",
        "source_sha256": "957406909752DDF1EB94FE42FC7040A49358B2AAA31CEBA43FCF74ADA7D469B4",
    },
    {
        "slug": "qu",
        "digest": "12F6739C612A79381E15BBF4E848BCB7F85439118155AE5536EC1C028DB2F345",
        "members": ["qu", "qv"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_qu_mark_only_common_forest_root.py",
        "source_sha256": "DC88B4E310E70B3D3F644A4F3A73DF6F4938927C9B47320D75ABEE8B0F56DB8D",
    },
    {
        "slug": "pq_pu",
        "digest": "1E02282E60528CBC567D5F8C09F10F740745803C06B7A418530A195345FE008D",
        "members": ["pq,pu", "pq,pv"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_pu_mark_only_common_forest_root.py",
        "source_sha256": "B60F21EDA4C029F238E3EA75AEA8F8F67A12E3E8D683CAB9A4FB4804B64CDBD4",
    },
    {
        "slug": "pq_qu",
        "digest": "6019EFECDB717EFC45FC01DC3C42B5D19F60AC1BD098C0A466428F7C0A11B353",
        "members": ["pq,qu", "pq,qv"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_qu_mark_only_common_forest_root.py",
        "source_sha256": "3F8401EFD6645758B05FBFEED52AA51C6776DBACBFF924CE0DB6A109CC957516",
    },
    {
        "slug": "pu_pv",
        "digest": "88B3DF4636B1E6171F8044E268E30CA4519DAB8D58DF463014BF1ACBE036D37C",
        "members": ["pu,pv"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_pv_mark_only_common_forest_root.py",
        "source_sha256": "C70CA87FCD87DC1BD5CA29EB29BE90080CAF72A34BC07603958F95DCD2D39F13",
    },
    {
        "slug": "pu_qu",
        "digest": "D5621A149A98CE54A7FB08E7BAACBC0EFCDF09FEAD6ADE027F27D4B1C2B41641",
        "members": ["pu,qu", "pv,qv"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_qu_mark_only_common_forest_root.py",
        "source_sha256": "9DD727FC157192877C04920462F756ACEF6926F20B8F971B3A2475A270D1C5C5",
    },
    {
        "slug": "pu_qv",
        "digest": "EF72CE682AD3727145BF4BCD2A707235F1D06A43366069917876C6B474B4F6D9",
        "members": ["pu,qv", "pv,qu"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_qv_mark_only_common_forest_root.py",
        "source_sha256": "5F2C7B07D8B13EEACCAD75FACF1340E2A251A85136EB9F830A6F4D1B0C37B2A3",
    },
    {
        "slug": "qu_qv",
        "digest": "4E004AB425DB65CD0C3C24833DDC906B96E53E3016779B18A85C979BCF01E7F7",
        "members": ["qu,qv"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_qu_qv_mark_only_common_forest_root.py",
        "source_sha256": "32B38EAD7F3A3464888F6DACAEA384583A7FF9219C86166FF451B64F1BAA6AC5",
    },
    {
        "slug": "pq_pu_pv",
        "digest": "08D7D7D3661E866F0CBD89127826C9FD66B6CA73D5522EEC125C4ED16DB19394",
        "members": ["pq,pu,pv"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_pu_pv_mark_only_common_forest_root.py",
        "source_sha256": "BA4C5449354DCD1BC888AEE2C11A00E62DBB3673DD2A0B1F63A68BB779504D7E",
    },
    {
        "slug": "pq_pu_qv",
        "digest": "C6431991F7A341708A82A62838599AC6CDFE5BCCE4F38530A9B90CD557E3F199",
        "members": ["pq,pu,qv", "pq,pv,qu"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_pu_qv_mark_only_common_forest_root.py",
        "source_sha256": "B8200C2970439A0209DEB22EC9AA5307015583AB0863461583B578ED67C0C906",
    },
    {
        "slug": "pu_pv_qu",
        "digest": "C03466DDF51C19ED7B07111B94358D2CA2F280CD4A19B246FC0CB7A1CC96CF46",
        "members": ["pu,pv,qu", "pu,pv,qv"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_pv_qu_mark_only_common_forest_root.py",
        "source_sha256": "EDB975373ED1003DC73F602E826841304B72DEB422459B780CD813712B4EFD39",
    },
    {
        "slug": "pq_qu_qv",
        "digest": "63DB8F457CE7C56264FFC31DF12113E3EA0C5B845D3325D1EAD0E1B2888F504A",
        "members": ["pq,qu,qv"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_qu_qv_mark_only_common_forest_root.py",
        "source_sha256": "AE753CD3126645FB7CDB55C35F7E6CBB582A1A72B187407A687D7E4710D99389",
    },
    {
        "slug": "pu_qu_qv",
        "digest": "C615D0004D1D2BD11B11615217A604647F2972D9A51260FF36630C35F499F199",
        "members": ["pu,qu,qv", "pv,qu,qv"],
        "source": "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_qu_qv_mark_only_common_forest_root.py",
        "source_sha256": "D4EBC65E82B3BE35C57604DBB45FAAEA897CD05715B8D72B1E5052608DD32435",
    },
)

FROZEN_RESIDUAL_CLASS_ORDER = (
    ("pu", "D37D98AE001BF6EF68C6A24D2E8116EBC0D979EED02252BEB795CF36E884B62F"),
    ("qu", "12F6739C612A79381E15BBF4E848BCB7F85439118155AE5536EC1C028DB2F345"),
    ("pq_pu", "1E02282E60528CBC567D5F8C09F10F740745803C06B7A418530A195345FE008D"),
    ("pq_qu", "6019EFECDB717EFC45FC01DC3C42B5D19F60AC1BD098C0A466428F7C0A11B353"),
    ("pu_pv", "88B3DF4636B1E6171F8044E268E30CA4519DAB8D58DF463014BF1ACBE036D37C"),
    ("pu_qu", "D5621A149A98CE54A7FB08E7BAACBC0EFCDF09FEAD6ADE027F27D4B1C2B41641"),
    ("pu_qv", "EF72CE682AD3727145BF4BCD2A707235F1D06A43366069917876C6B474B4F6D9"),
    ("qu_qv", "4E004AB425DB65CD0C3C24833DDC906B96E53E3016779B18A85C979BCF01E7F7"),
    ("pq_pu_pv", "08D7D7D3661E866F0CBD89127826C9FD66B6CA73D5522EEC125C4ED16DB19394"),
    ("pq_pu_qv", "C6431991F7A341708A82A62838599AC6CDFE5BCCE4F38530A9B90CD557E3F199"),
    ("pu_pv_qu", "C03466DDF51C19ED7B07111B94358D2CA2F280CD4A19B246FC0CB7A1CC96CF46"),
    ("pq_qu_qv", "63DB8F457CE7C56264FFC31DF12113E3EA0C5B845D3325D1EAD0E1B2888F504A"),
    ("pu_qu_qv", "C615D0004D1D2BD11B11615217A604647F2972D9A51260FF36630C35F499F199"),
)
EXPECTED_DIGEST_ORDER = tuple(digest for _slug, digest in FROZEN_RESIDUAL_CLASS_ORDER)
EDGELLESS_EXPRESSION_SHA256 = (
    "24E326AF2419A66C2335938056A10DD824E582372799FBC4757AF2000BDEF5E1"
)
PROTECTED_PQ_EXPRESSION_SHA256 = (
    "E25FCD2FEBA4085A452E4B0E540C61ADC3C60ACA66A2A1643467B70E6C865A6C"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def safe_eval(node: ast.AST, environment: dict[str, object] | None = None):
    """Evaluate the small literal subset used by producer constants."""
    env = {} if environment is None else environment
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name) and node.id in env:
        return env[node.id]
    if isinstance(node, (ast.Tuple, ast.List, ast.Set)):
        values = [safe_eval(item, env) for item in node.elts]
        return tuple(values) if isinstance(node, ast.Tuple) else (
            set(values) if isinstance(node, ast.Set) else values
        )
    if isinstance(node, ast.Dict):
        return {
            safe_eval(key, env): safe_eval(value, env)
            for key, value in zip(node.keys, node.values)
        }
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        return safe_eval(node.left, env) + safe_eval(node.right, env)
    if isinstance(node, ast.DictComp) and len(node.generators) == 1:
        generator = node.generators[0]
        if generator.ifs or generator.is_async or not isinstance(generator.target, ast.Name):
            raise ValueError("unsupported dict comprehension")
        result = {}
        for item in safe_eval(generator.iter, env):
            local = dict(env)
            local[generator.target.id] = item
            result[safe_eval(node.key, local)] = safe_eval(node.value, local)
        return result
    raise ValueError(f"nonliteral AST node: {type(node).__name__}")


def source_constants(path: Path) -> dict[str, object]:
    tree = ast.parse(path.read_text(), filename=str(path))
    constants: dict[str, object] = {}
    for node in tree.body:
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        target = node.targets[0]
        if not isinstance(target, ast.Name):
            continue
        try:
            constants[target.id] = safe_eval(node.value, constants)
        except ValueError:
            continue
    return constants


def lock_state(expected) -> tuple[str, list[str]]:
    problems = []
    if not isinstance(expected, dict) or set(expected) != {"high", "low"}:
        return "invalid", ["EXPECTED_LARGE must have exactly high and low"]
    pending = False
    for sector in ("high", "low"):
        row = expected[sector]
        if not isinstance(row, dict):
            problems.append(f"{sector} is not a dictionary")
            continue
        missing = REQUIRED_STREAM_FIELDS - set(row)
        extra = set(row) - REQUIRED_STREAM_FIELDS
        values = row.values()
        row_pending = bool(missing) or any(
            isinstance(value, str) and value.startswith("PENDING_")
            for value in values
        )
        pending = pending or row_pending
        if extra:
            problems.append(f"{sector} extra fields {sorted(extra)}")
        if not row_pending:
            if row.get("negative") != 0:
                problems.append(f"{sector} negative count is not zero")
            if re.fullmatch(r"[0-9A-F]{64}", str(row.get("rows_sha256", ""))) is None:
                problems.append(f"{sector} rows hash is invalid")
    if problems:
        return "invalid", problems
    return ("pending" if pending else "complete"), []


def static_manifest_audit() -> tuple[list[dict], list[str]]:
    errors = []
    records = []
    if len(QUEUE) != 13:
        errors.append("queue length is not 13")
    if len({row["slug"] for row in QUEUE}) != 13:
        errors.append("queue slugs are not unique")
    if len(set(EXPECTED_DIGEST_ORDER)) != 13:
        errors.append("queue digests are not unique")
    if tuple((row["slug"], row["digest"]) for row in QUEUE) != FROZEN_RESIDUAL_CLASS_ORDER:
        errors.append("queue order differs from frozen residual class order")
    if sha256(CLASS_REPORT) != CLASS_REPORT_SHA256:
        errors.append("expression class report hash mismatch")
        classes = {}
    else:
        classes = json.loads(CLASS_REPORT.read_text())["classes"]
        residual = set(classes) - {
            EDGELLESS_EXPRESSION_SHA256, PROTECTED_PQ_EXPRESSION_SHA256
        }
        if residual != set(EXPECTED_DIGEST_ORDER):
            errors.append("queue digests do not exactly exhaust the 13 residual classes")
    for index, row in enumerate(QUEUE, start=1):
        path = HERE / row["source"]
        actual_hash = sha256(path) if path.is_file() else None
        if actual_hash != row["source_sha256"]:
            errors.append(f"{row['slug']} source hash mismatch")
            constants = {}
        else:
            constants = source_constants(path)
        digest_values = {
            value for name, value in constants.items()
            if name.endswith("EXPRESSION_SHA256") and isinstance(value, str)
        }
        if digest_values != {row["digest"]}:
            errors.append(f"{row['slug']} embedded digest mismatch")
        if classes.get(row["digest"]) != row["members"]:
            errors.append(f"{row['slug']} expression-class members mismatch")
        state, lock_errors = lock_state(constants.get("EXPECTED_LARGE"))
        errors.extend(f"{row['slug']} {error}" for error in lock_errors)
        records.append({
            "index": index,
            "slug": row["slug"],
            "digest": row["digest"],
            "source": row["source"],
            "source_sha256": actual_hash,
            "lock_state": state,
            "promoted": False,
        })
    return records, errors


class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ("dwLength", wintypes.DWORD), ("dwMemoryLoad", wintypes.DWORD),
        ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
        ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
        ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
        ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
    ]


def headroom() -> dict[str, float]:
    status = MEMORYSTATUSEX()
    status.dwLength = ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise ctypes.WinError()
    disk = shutil.disk_usage(HERE)
    return {
        "available_physical_gib": status.ullAvailPhys / GIB,
        "available_commit_gib": status.ullAvailPageFile / GIB,
        "free_disk_gib": disk.free / GIB,
    }


TH32CS_SNAPPROCESS = 0x00000002
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value


class PROCESSENTRY32W(ctypes.Structure):
    _fields_ = [
        ("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD), ("th32DefaultHeapID", ctypes.c_void_p),
        ("th32ModuleID", wintypes.DWORD), ("cntThreads", wintypes.DWORD),
        ("th32ParentProcessID", wintypes.DWORD), ("pcPriClassBase", ctypes.c_long),
        ("dwFlags", wintypes.DWORD), ("szExeFile", wintypes.WCHAR * 260),
    ]


class UNICODE_STRING(ctypes.Structure):
    _fields_ = [
        ("Length", wintypes.USHORT), ("MaximumLength", wintypes.USHORT),
        ("Buffer", ctypes.c_void_p),
    ]


def process_command_line(pid: int) -> str | None:
    kernel32 = ctypes.windll.kernel32
    ntdll = ctypes.windll.ntdll
    handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
    if not handle:
        return None
    try:
        needed = wintypes.ULONG(0)
        ntdll.NtQueryInformationProcess(handle, 60, None, 0, ctypes.byref(needed))
        if needed.value == 0:
            return None
        buffer = ctypes.create_string_buffer(needed.value)
        status = ntdll.NtQueryInformationProcess(
            handle, 60, buffer, needed.value, ctypes.byref(needed)
        )
        if status != 0:
            return None
        value = UNICODE_STRING.from_buffer(buffer)
        if not value.Buffer or not value.Length:
            return ""
        return ctypes.wstring_at(value.Buffer, value.Length // 2)
    finally:
        kernel32.CloseHandle(handle)


def protected_pq_replays() -> list[dict]:
    kernel32 = ctypes.windll.kernel32
    snapshot = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
    if snapshot == INVALID_HANDLE_VALUE:
        raise ctypes.WinError()
    found = []
    try:
        entry = PROCESSENTRY32W()
        entry.dwSize = ctypes.sizeof(entry)
        more = kernel32.Process32FirstW(snapshot, ctypes.byref(entry))
        while more:
            pid = int(entry.th32ProcessID)
            command = process_command_line(pid)
            normalized = (command or "").lower()
            protected = (
                "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_mark_only_common_forest_root.py"
                in normalized
                or (
                    "probe_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_rank6_ratio_g1_nonadjacent.py"
                    in normalized
                    and re.search(r"--edges\s+pq(?:\s|$)", normalized) is not None
                )
            )
            if protected:
                found.append({"pid": pid, "command_line": command})
            more = kernel32.Process32NextW(snapshot, ctypes.byref(entry))
    finally:
        kernel32.CloseHandle(snapshot)
    return found


def system_blockers() -> tuple[dict, list[str]]:
    resources = headroom()
    protected = protected_pq_replays()
    blockers = []
    if protected:
        blockers.append("protected distinct-pq replay is alive")
    if resources["available_physical_gib"] < MIN_AVAILABLE_PHYSICAL_GIB:
        blockers.append("available physical memory below guard")
    if resources["available_commit_gib"] < MIN_AVAILABLE_COMMIT_GIB:
        blockers.append("available commit below guard")
    if resources["free_disk_gib"] < MIN_FREE_DISK_GIB:
        blockers.append("free disk below guard")
    return {
        "resources": {key: round(value, 3) for key, value in resources.items()},
        "guards_gib": {
            "minimum_available_physical": MIN_AVAILABLE_PHYSICAL_GIB,
            "minimum_available_commit": MIN_AVAILABLE_COMMIT_GIB,
            "minimum_free_disk": MIN_FREE_DISK_GIB,
        },
        "protected_pq_processes": protected,
    }, blockers


def expected_report_path(slug: str) -> Path:
    return HERE / (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_" + slug +
        "_mark_only_common_forest_exact_root_20260831.json"
    )


def expected_marker(slug: str) -> str:
    return (
        "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_DISTINCT_" +
        slug.upper() + "_MARK_ONLY_COMMON_FOREST_ROOT"
    )


def verify_completed_report(row: dict, constants: dict, stdout: str) -> dict:
    marker = expected_marker(row["slug"])
    assert marker in stdout, "success marker absent from child stdout"
    report_path = expected_report_path(row["slug"])
    assert report_path.is_file(), "expected report was not written"
    report = json.loads(report_path.read_text())
    assert report["marker"] == marker
    assert report["source_sha256"] == row["source_sha256"]
    expression = report["expression_certificate"]
    report_digest = expression.get("expression_sha256", expression.get("class_sha256"))
    assert report_digest == row["digest"]
    expected_large = constants["EXPECTED_LARGE"]
    assert set(report["large_certificates"]) == {"high", "low"}
    for sector in ("high", "low"):
        actual = report["large_certificates"][sector]
        assert actual["negative"] == 0
        assert actual["rows_sha256"] == expected_large[sector]["rows_sha256"]
        assert {key: actual[key] for key in REQUIRED_STREAM_FIELDS} == expected_large[sector]
    return {
        "report": report_path.name,
        "report_sha256": sha256(report_path),
        "marker": marker,
        "promoted_certificate_verified": True,
    }


def dry_run_payload() -> tuple[dict, list[str]]:
    records, static_errors = static_manifest_audit()
    system, blockers = system_blockers()
    payload = {
        "mode": "dry-run",
        "launches": 0,
        "queue_length": len(QUEUE),
        "exact_digest_order": list(EXPECTED_DIGEST_ORDER),
        "classes": records,
        "static_errors": static_errors,
        "system": system,
        "blockers": static_errors + blockers,
        "promotion_inference": False,
    }
    return payload, static_errors + blockers


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--execute", choices=[row["slug"] for row in QUEUE])
    parser.add_argument("--authorize-one-class", action="store_true")
    args = parser.parse_args()
    if args.dry_run and args.execute:
        parser.error("--dry-run and --execute are mutually exclusive")

    payload, blockers = dry_run_payload()
    if not args.execute:
        print(json.dumps(payload, indent=2, sort_keys=True))
        print("REFUSE_NO_LAUNCH", "; ".join(blockers) if blockers else "dry-run only")
        return 2 if blockers else 0

    if not args.authorize_one_class:
        print("REFUSE_NO_LAUNCH --authorize-one-class is required", file=sys.stderr)
        return 2
    if blockers:
        print(json.dumps(payload, indent=2, sort_keys=True))
        print("REFUSE_NO_LAUNCH", "; ".join(blockers), file=sys.stderr)
        return 2

    row = next(item for item in QUEUE if item["slug"] == args.execute)
    source_path = HERE / row["source"]
    constants = source_constants(source_path)
    state, errors = lock_state(constants.get("EXPECTED_LARGE"))
    if state != "complete" or errors:
        print(
            "REFUSE_NO_LAUNCH target terminal locks are not complete: " +
            state + (" " + "; ".join(errors) if errors else ""),
            file=sys.stderr,
        )
        return 2

    # Exactly one child can be constructed by this code path.
    completed = subprocess.run(
        [sys.executable, "-u", str(source_path)],
        cwd=HERE,
        text=True,
        capture_output=True,
        check=False,
    )
    if completed.stdout:
        print(completed.stdout, end="")
    if completed.stderr:
        print(completed.stderr, end="", file=sys.stderr)
    if completed.returncode != 0:
        print("STOP_NONZERO_CHILD", completed.returncode, file=sys.stderr)
        return completed.returncode or 1
    try:
        verified = verify_completed_report(row, constants, completed.stdout)
    except (AssertionError, KeyError, TypeError, ValueError) as error:
        print("STOP_CERTIFICATE_MISMATCH", str(error), file=sys.stderr)
        return 1
    print(json.dumps({
        "mode": "execute-one",
        "slug": row["slug"],
        "digest": row["digest"],
        **verified,
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
