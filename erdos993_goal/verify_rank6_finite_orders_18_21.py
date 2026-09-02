#!/usr/bin/env python3
"""Build and run the exact Rust/WASM rank-6 finite-base verifier."""

from __future__ import annotations

from pathlib import Path
import shutil
import subprocess


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "verify_rank6_finite_orders_18_21.rs"
MODULE = HERE / "verify_rank6_finite_orders_18_21.wasm"
RUNNER = HERE / "verify_rank6_finite_orders_18_21.js"
TARGET = "wasm32-wasip1"


def require(program):
    path = shutil.which(program)
    if path is None:
        raise RuntimeError(f"required program is not installed: {program}")
    return path


def main():
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
            f"missing Rust target {TARGET}; run: "
            f"rustup target add {TARGET}"
        )

    subprocess.run(
        [
            rustc,
            "-O",
            "--target",
            TARGET,
            str(SOURCE),
            "-o",
            str(MODULE),
        ],
        check=True,
        cwd=HERE,
    )
    subprocess.run(
        [node, str(RUNNER)],
        check=True,
        cwd=HERE,
    )


if __name__ == "__main__":
    main()
