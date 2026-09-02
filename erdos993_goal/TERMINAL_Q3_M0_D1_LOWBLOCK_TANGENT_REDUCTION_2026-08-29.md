# d=1 low-block H/K tangent reduction for terminal m=0

Date: 2026-08-29

For a one-centre spider write `F=H+xK`, put `P=p0`, and use the exact
retained-`h_(j-1)` decomposition.  The frozen smaller-forest low-block lemma
gives caps `u_H` and `u_I` with

```text
f_j(q3-q_j) >= H_j(q3-u_H)+K_(j-1)(q3-u_I).
```

Adding this reserve before choosing row endpoints cancels every `z3` term.
After division by the positive factor `a*f3`, the remaining sufficient target
is exactly

```text
L=(j+1)A0(H_(j-1)+H_(j+1)+K_j)+B_H H_j+B_K K_(j-1),
```

with the explicit `B_H,B_K` in the JSON report.  Apply the frozen graft
residual tangent to `H`.  For `K`, condition on the literal number `Z` of
paths of length at least two and apply the same theorem with parameters
`(R,T,Y,j)=(Y,T-Y,Z,j-1)`.  The resulting all-order lower is
`Hlower+min_Z Klower`.

The exact finite sign audit checked 60052
parameter-rank cells in its stated box and found zero negatives.  This does
not prove the lower nonnegative outside that box: interior `Z` minimizers
occur, so an unbounded sign cone is still required.

Replay:

```powershell
python .\audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary.py
```

Required marker:

```text
PASS_EXACT_D1_LOWBLOCK_HK_TANGENT_REDUCTION_FINITE_SIGN_AUDIT
```
