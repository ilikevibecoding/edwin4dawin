# Double-broom diagonal gap: exact `i+j=6` extension

Date: 2026-08-29

Status: **exact all-path-order, all-rank extension.**  Together with
`ISO_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_COLLAR_H5_AGENT_2026-08-29.md`, this
proves the connected double-broom terminal Newton collar `i+j<=6`.

The proof uses the same exact four-carrier decomposition

\[
G_{i,j}=\mathcal O_{M_A,R_A}(H_A)+\mathcal O_{M_B,R_B}(H_B)
+\mathcal O_{M_C,R_C}(H_C)+\mathcal O^{CD}_{F,Q}(D),
\]

with

\[
\mathcal O_{M,R}(H)=M[pH-\delta\partial_pH]-\delta RH,
\qquad
\mathcal O^{CD}_{F,Q}(H)=\delta FH+2\delta^2Q\partial_pH.
\]

The carrier polynomials `H_A`, `H_B`, the consecutive cross product `H_C`,
and the consecutive Christoffel--Darboux quotient `D` are all
elementary-symmetric-positive in `s=z+w,p=zw` by the frozen `h<=5` carrier
proof.

For every unordered pair

```text
(0,6), (1,5), (2,4), (3,3),
```

the replay expands all four operators on the universal carrier monomial
`H=s^a p^b`, treats both parities `a=2m+epsilon`, and groups by weighted output
layer.  After division by `C(2m,m)`, all `316` layer values have exact
numerators and denominators with nonnegative coefficients in `m,b`, with
positive denominator constant term.  This proves every layer for all carrier
exponents, hence every path order and rank.

The fixed `n=2,3` terminal bases (`84` complete diagonal cells) and fixed
`n=4,5` path-Pascal gaps (`92` complete diagonal cells) are also nonnegative
on their entire polynomial support.  These are exhaustive bases, not a
bounded extrapolation.

Run

```powershell
python .\prove_iso_double_broom_diagonal_gap_h6_extension_agent.py
```

It ends with

```text
PASS_EXACT_ALL_PATH_ORDER_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_COLLAR_H_LE_6_EXTENSION
```

Immutable hashes:

```text
source SHA256:
F147255D847E521DF206AFF057CCD396726956911D60E0619001B59BACF0568F

report SHA256:
D2EAD11354E4447870839CE3715DB69C34D490A3C7AF8CDB452122D8749DDD2B

value-stream SHA256:
D4EBB5630D58338CC0ECD2E4507CBE3E865B4B892FAD668E9F626CFF7ECEE8FB
```

The precise remaining double-broom diagonal obligation begins at `i+j=7`.
This extension does not prove the full double-broom family, arbitrary-forest
ISO, or Erdős Problem 993.
