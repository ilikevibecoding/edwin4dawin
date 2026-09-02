#!/usr/bin/env python3
"""Replay the complete strong rooted rank-6 theorem for all n>=18."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from verify_rank6_all_roots_n22 import main as verify_order_22_plus


HERE = Path(__file__).resolve().parent


def main():
    verify_order_22_plus()
    subprocess.run(
        [
            sys.executable,
            str(HERE / "verify_rank6_finite_orders_18_21.py"),
        ],
        cwd=HERE,
        check=True,
    )
    print(
        "strong rooted rank-6 inequality for every tree "
        "of order n>=18: CERTIFIED"
    )


if __name__ == "__main__":
    main()
