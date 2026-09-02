"""Known non-log-concave trees versus the ISO route.

Log-concavity of independence polynomials of trees is FALSE:
  * Kadrawi, Levit, Yosef, Mizrachi (2023): exactly two trees on 26 vertices,
    T1 = "3,4,4" and T2 = "3*,3,4" (all trees on <= 25 vertices are log-concave,
    Radcliffe).  Kadrawi & Levit (arXiv:2305.01784 / Ars Math. Contemp. 2025)
    extend them to infinite families "3,k,k+j" and "3*,k,k+j".
  * Galvin (arXiv:2502.10654, 2025): T_{m,t} (root with m children, each with t
    children, each of which has one leaf child) breaks log-concavity at
    k = mt + 2, i.e. about alpha(1 - 1/(16 log alpha)) for m = 2^{t/16}.

The WR+ISO+TAIL route does not use log-concavity.  In the descending region
ISO_r is *weaker* than LC_r, and for r >= L = ceil((2 alpha - 1)/3) the route
uses only the decreasing-tail theorem.  This script constructs the families,
reproduces the published polynomial of T1, and checks exactly where LC breaks,
that every break lies in the tail r >= L, and that ISO_r holds for every r.

Run: python3 known_counterexamples.py
"""

from __future__ import annotations

from typing import List, Tuple

from checks import L_cutoff, analyze
from indpoly import tree_independence_polynomial

Edges = List[Tuple[int, int]]


class Builder:
    def __init__(self):
        self.parent: List[int] = []

    def add(self, parent: int) -> int:
        self.parent.append(parent)
        return len(self.parent) - 1

    def attach_k2(self, v: int) -> None:      # v - a - b  (pendant P_2 = "K_2 attached")
        a = self.add(v)
        self.add(a)

    def attach_p4_end(self, v: int) -> None:  # v - a - b - c - d
        a = self.add(v); b = self.add(a); c = self.add(b); self.add(c)

    def attach_p4_inner(self, v: int) -> None:  # v - b where P4 = a-b-c-d, attach at b
        b = self.add(v); self.add(b); c = self.add(b); self.add(c)


def kl_3kk(k: int, j: int) -> List[int]:
    """Kadrawi-Levit '3,k,k+j': centre v0 with v1 (3 K2's), v2 (k K2's), v3 (k+j K2's)."""
    B = Builder()
    v0 = B.add(-1)
    for cnt in (3, k, k + j):
        vi = B.add(v0)
        for _ in range(cnt):
            B.attach_k2(vi)
    return B.parent


def kl_3star_kk(k: int, j: int, p4_inner: bool = False) -> List[int]:
    """Kadrawi-Levit '3*,k,k+j': v1 carries P4 + 2 K2's, v2 k K2's, v3 k+j K2's."""
    B = Builder()
    v0 = B.add(-1)
    v1 = B.add(v0)
    (B.attach_p4_inner if p4_inner else B.attach_p4_end)(v1)
    B.attach_k2(v1); B.attach_k2(v1)
    for cnt in (k, k + j):
        vi = B.add(v0)
        for _ in range(cnt):
            B.attach_k2(vi)
    return B.parent


def galvin_Tmt(m: int, t: int) -> List[int]:
    B = Builder()
    v = B.add(-1)
    for _ in range(m):
        w = B.add(v)
        for _ in range(t):
            x = B.add(w)
            B.add(x)
    return B.parent


def lc_breaks(p: List[int]) -> List[int]:
    return [r for r in range(1, len(p) - 1) if p[r] * p[r] < p[r - 1] * p[r + 1]]


def report(name: str, parents: List[int]) -> bool:
    p = tree_independence_polynomial(parents)
    rep = analyze(p)
    br = lc_breaks(p)
    n = len(parents)
    ok_tail = all(r >= rep.L for r in br)
    print(f"{name:28s} n={n:4d} alpha={rep.alpha:4d} L={rep.L:4d} LC breaks at r={br}  "
          f"all breaks in tail(r>=L)={ok_tail}  ISO all r={rep.iso_all}  ISO prefix={rep.iso_prefix}  "
          f"WR prefix={rep.wr_prefix_ok}  unimodal={rep.unimodal}  tail={rep.tail_ok}")
    return rep.iso_all and rep.iso_prefix and rep.wr_prefix_ok and rep.unimodal and rep.tail_ok and ok_tail


def main() -> None:
    published_T1 = [1, 26, 300, 2040, 9142, 28551, 63933, 103736, 121376, 100144, 55499, 18683, 2979, 51, 1]
    T1 = kl_3kk(4, 0)
    pT1 = tree_independence_polynomial(T1)
    assert len(T1) == 26 and pT1 == published_T1, pT1
    print("T1 = 3,4,4 reproduces the published polynomial:", pT1)
    print("   51^2 = 2601 < 2979: log-concavity broken at r = 13 = alpha - 1;  ISO_13 =",
          13 * 51 * 51 + 2979 * 2979 - 14 * 2979 * 1, "> 0")
    # T2: choose the P4 attachment that gives a 26-vertex non-log-concave tree with p_13 = 48
    cands = {"3*,3,4 (P4 at end)": kl_3star_kk(3, 1, False), "3*,3,4 (P4 at inner)": kl_3star_kk(3, 1, True)}
    for name, par in cands.items():
        p = tree_independence_polynomial(par)
        print(f"{name}: n={len(par)} coefficients={p}  LC breaks={lc_breaks(p)}")
    print()
    all_ok = True
    print("--- Kadrawi-Levit families 3,k,k+j (j=0,1,2) and 3*,k,k+j (j=0..3), k up to 40 ---")
    for k in list(range(3, 13)) + [20, 30, 40]:
        for j in (0, 1, 2):
            all_ok &= report(f"3,{k},{k+j}", kl_3kk(k, j))
        for j in (0, 1, 2, 3):
            all_ok &= report(f"3*,{k},{k+j}", kl_3star_kk(k, j, False))
    print("--- Galvin T_{m,t} ---")
    for t in range(3, 13):
        all_ok &= report(f"T_{{{t},{t}}}", galvin_Tmt(t, t))
    for (m, t) in [(2, 8), (4, 8), (8, 8), (16, 8), (3, 12), (6, 12), (12, 12), (2, 20), (5, 20)]:
        all_ok &= report(f"T_{{{m},{t}}}", galvin_Tmt(m, t))
    print()
    print("KNOWN_COUNTEREXAMPLES_ISO_PASS" if all_ok else "KNOWN_COUNTEREXAMPLES_ISO_FAIL")


if __name__ == "__main__":
    main()
