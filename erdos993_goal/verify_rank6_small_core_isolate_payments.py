#!/usr/bin/env python3
"""Build and run the exact rank-6 small-core isolate verifier."""

from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
import sys


HERE = Path(__file__).resolve().parent
STEM = "verify_rank6_small_core_isolate_payments"
TARGET = "wasm32-wasip1"


def require(program: str) -> str:
    path = shutil.which(program)
    if path is None:
        raise RuntimeError(f"required program is not installed: {program}")
    return path


def main() -> int:
    rustc = require("rustc")
    rustup = require("rustup")
    node = require("node")
    installed = subprocess.run(
        [rustup, "target", "list", "--installed"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()
    if TARGET not in installed:
        raise RuntimeError(
            f"missing Rust target {TARGET}; "
            f"run: rustup target add {TARGET}"
        )
    subprocess.run(
        [
            rustc,
            "-O",
            "--target",
            TARGET,
            str(HERE / f"{STEM}.rs"),
            "-o",
            str(HERE / f"{STEM}.wasm"),
        ],
        check=True,
        cwd=HERE,
    )
    subprocess.run(
        [node, str(HERE / f"{STEM}.js"), *sys.argv[1:]],
        check=True,
        cwd=HERE,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
