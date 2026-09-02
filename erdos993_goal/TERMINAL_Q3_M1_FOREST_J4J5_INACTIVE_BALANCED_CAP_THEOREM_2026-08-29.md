# Forest terminal `m=1`, targets `j=4,5`: inactive balanced-cap strips

Date: 2026-08-29

Status: **exact all-order endpoint theorem, independently replayed.**  This
closes the inactive endpoint arithmetic conditional on the common `W^2>=0`
cone; that common cone must be pinned in the final `j=4,5` producer.  This
note does not by itself close all forest `m=1` cases.

## Parameter partition

For a marked no-isolate forest write

```text
|G|=N+1, h=c(G)-1, d=deg_G(w), R=d*q+s, 0<=s<d,
L=N-2h-d-R>=0, S=N-d,
K=S-q=2h+(d-1)q+s+L.
```

For `d<=j`, the frozen all-`R` balanced-neighbor cap bounds

```text
y=i_j(H)/i_j(F)
 <= C(S,j)/[C(S,j)+(d-s)P_(j-1)(S-q)+sP_(j-1)(S-q-1)].
```

The two path-floor terms are simultaneously polynomial on the active region
`K>=2j-2`.  This theorem treats the complementary integer region

```text
K<=2j-3.                                             (1)
```

The already pinned direct-canonical finite forest theorem supplies `N<=12`,
so every verifier below assumes `N>=13`.

## The `d=1` infinite strips

Here `s=0` and `K=2h+L`, independent of `q=R`.  Condition (1) leaves the
finite list

```text
j=4: (h,L)=(1,0..3),(2,0..1),
j=5: (h,L)=(1,0..5),(2,0..3),(3,0..1).
```

For each strip, `q` is shifted by the exact lower value imposed by `N>=13`.
After the balanced cap is substituted, the exact Gap-retaining lower is
quadratic in `W`.  Its `W^2` coefficient is nonnegative by the common
structural cone, so the producer removes that square and verifies the
remaining linear polynomial at both rigorous `W` endpoints.  Every shifted
`q` coefficient and every shifted denominator coefficient is nonnegative.

The exact producer checked 468 numerator coefficients, with no zeros and
minimum positive coefficient `1`.  Its ordered coefficient stream is

```text
E06FF2D512B24C36F816121A3143136634B10ABC912D640BB98DCA94FFDE6596.
```

Pins:

```text
prove_terminal_q3_m1_general_forest_j4j5_d1_inactive_agent.py
  3F3EE2E6CC463E4930A50E6B4FC75EB685D1204FF75CCA3E74997155CE84ADC9
terminal_q3_m1_general_forest_j4j5_d1_inactive_exact_agent_20260829.json
  C2A1C9D2FD9B443DC50FA5794121B2DC367F106277C1A2A6A00F40D4DE1F8BD4
```

Marker:

```text
PASS_EXACT_ALL_ORDER_D1_INACTIVE_BALANCED_CAP_STRIPS
```

## The finite `2<=d<=j` cells

For `d>=2`, (1) bounds `h,q,L` outright.  Literal enumeration of every
integer tuple with `N>=13` finds no `j=4` cells and exactly five `j=5`
cells.  Both `W` endpoints were checked in exact rational arithmetic, for
ten values total.  Their minimum is

```text
147204665105/402783
```

at `j=5,d=5,s=0,h=1,q=1,L=1`, on the low endpoint.  The ordered value
stream is

```text
934F2F1DE55FD4795534009BF01BD3A07C01C916F8F5F808275F1A0715F4DF2A.
```

Pins:

```text
audit_terminal_q3_m1_general_forest_j4j5_balanced_cap_inactive_agent.py
  01F0B554E2A9F2917AD30BE05F56B8ED2E4B159B28722D50599E005FA116724B
terminal_q3_m1_general_forest_j4j5_balanced_cap_inactive_audit_20260829.json
  22539B4BFC9EF6375BD6099B31E5D3E63C07DE239B8909C6DF958593BB41857F
```

Marker:

```text
PASS_EXACT_FINITE_INACTIVE_BALANCED_CAP_D2_TO_J
```

## Exact scope

Together these two independently replayed certificates close the
square-dropped endpoint inequality in every `N>=13`, `j in {4,5}`, `d<=j`
cell satisfying (1).  Promotion to the full quadratic also cites the common
`W^2>=0` cone, which is intentionally left to the final combined producer.
The active region `K>=2j-2`, the high-degree relative-cap region `d>j`,
target `j=3`, forest `m=0`, the final assembly, unimodality, and Erdos
Problem 993 remain separate obligations.
