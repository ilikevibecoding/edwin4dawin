# Forest terminal `m=1,j=3`: exact `S=2,3,4`, `N>=31` strips

Date: 2026-08-29

Status: **PASS independent exact all-order short-strip certificate.** This
proves the terminal `m=1,j=3` row for every no-isolate disconnected forest
with `S=2,3,4` and `N>=31`. It does not prove the finite `N=13,...,30`
boundary, `m=0`, or Erdős Problem 993.

## Structural exhaustion

Use the marked-forest coordinates

```text
S=N-d,
L=N-2h-d-R,
S=2h+R+L,
h>=1, R>=0, L>=0.                                  (1)
```

Here `G` has order `N+1` and `h+1` components, `d` is the marked degree,
`R` is the total child count at the root neighbors, and `H=G-N[w]` has
`h+R` components. Solving (1) in nonnegative integers gives exactly seven
cases:

| `S` | `h` | `R` | `L` | `c(H)=h+R` |
|---:|---:|---:|---:|---:|
| 2 | 1 | 0 | 0 | 1 |
| 3 | 1 | 0 | 1 | 1 |
| 3 | 1 | 1 | 0 | 2 |
| 4 | 1 | 0 | 2 | 1 |
| 4 | 1 | 1 | 1 | 2 |
| 4 | 1 | 2 | 0 | 3 |
| 4 | 2 | 0 | 0 | 2 |

The verifier independently enumerates every labeled forest `H` of the
indicated order and component count. The exact maxima are

| `(S,c(H))` | labeled forests | `max i3(H)` | `max i4(H)` |
|---|---:|---:|---:|
| `(2,1)` | 1 | 0 | 0 |
| `(3,1)` | 3 | 0 | 0 |
| `(3,2)` | 3 | 0 | 0 |
| `(4,1)` | 16 | 1 | 0 |
| `(4,2)` | 15 | 1 | 0 |
| `(4,3)` | 6 | 2 | 0 |

The literal enumeration stream has hash

```text
08CB2DC0E58718DFC9187813FA4253C7051E94C2223449E43E3E84F84E47D56E.
```

Thus `h4=i4(H)=0` identically, while `h3=i3(H)` has the displayed absolute
upper bound.

## Exact wedge interval

The independently frozen component-budget lemmas give

```text
Wlo=C(d,2)+R+L,
Whi=C(d,2)+C(R+1,2)+C(L+1,2).                      (2)
```

For each of the seven integer cases,

```text
Whi-Wlo=C(R,2)+C(L,2)>=0.                           (3)
```

The verifier writes `W=Wlo+w(Whi-Wlo)`, `0<=w<=1`; hence no unphysical
ordering of the endpoints enters this short-strip proof.

## Row lower and the absolute `h3` cap

Put `N=31+E`, `E>=0`, `d=N-S`, and `m=N-h`. Direct subset counts give

```text
p0=C(N+1,3)-m(N-1)+W+C(N+1,2)-m,
p1=C(N+1,2)-m+N+1,
R1=mN-2W,
a=C(N,2)-(m-d),
z2=(m-d)(N-2)-2(W-C(d,2)-R),
h2=C(S,2)-(m-d-R),
c0=a+z2+h2,
b=C(N,3)-(m-d)(N-2)+W-C(d,2)-R.                   (4)
```

Define

```text
A1=p0*a+p1*c0+p1*a-a*R1,
g=2*p1*c0-3*a*R1,
y=h3/b,
ebar=1+y+3*z2/(2a),
Q0=4*c0-3*ebar*(p0+a),
Q1=4*(a+R1)-3*ebar*p1-3*(p0+a+p1),
Q=p0*Q1+p1*Q0+p1*Q1.                               (5)
```

The exact identity `U1=p0/b` and the root-neighbor tangent lower

```text
U0>=1+y+(h2+f4_lower)/b                             (6)
```

give the normalized row lower

```text
Phi=4*(3*p0*R1/2
       +p0*U1*g/(2*p1)
       +A1*(U0+U1)) + Q.                            (7)
```

The source reconstructs (4)--(7) directly. Multiplication by the positive
factor

```text
2*a*p1*b*(N-3)                                     (8)
```

produces its `tangent_scaled(y)` polynomial. The verifier separately checks
strict positivity of `a`, `p1`, `b`, and `N-3` on every strip.

The frozen slope theorem says (8) times (7) is affine and nonincreasing in
`y`. If the literal enumeration gives `h3<=M`, then

```text
y=h3/b<=M/b.                                        (9)
```

The final source polynomial is exactly

```text
b*tangent_scaled(0)
 +M*(tangent_scaled(1)-tangent_scaled(0)),          (10)
```

which is `b` times the row evaluated at (9). Both multipliers cleared in
(8),(10) are positive, so a positive certificate for (10) proves the
original row with no sign reversal.

## Rank-four lower in the short strips

Since `h4=0`, only independent four-sets using root neighbors remain. The
retained lower is

```text
f4_lower=
 d*C(S-2,3)-R*C(S-3,2)
 +C(d,2)*C(S-1,2)-(d-1)R(S-2)
 +C(d,3)S-C(d-1,2)R+C(d,4).                        (11)
```

For completeness, classify a four-set by the number `k` of selected root
neighbors. Those neighbors are mutually independent.

- `k=4` contributes exactly `C(d,4)`.
- `k=3` contributes exactly `C(d,3)S-C(d-1,2)R`, since each forbidden child
  is excluded from exactly `C(d-1,2)` root-neighbor triples.
- `k=2` uses the forest pair floor after deleting the children of the two
  selected neighbors. Summing the deletion loss gives at least
  `C(d,2)C(S-1,2)-(d-1)R(S-2)`.
- `k=1` uses the analogous forest triple floor and gives at least
  `d*C(S-2,3)-R*C(S-3,2)`.

This proves (11). At `S=2`, the only formally negative-top binomial is
multiplied by the forced value `R=0`; every surviving term has its ordinary
combinatorial meaning.

## Exact Bernstein certificate

For each structural case the verifier compactifies `E>=0` by

```text
z=E/(1+E)                                           (12)
```

and converts the possible wedge coordinate `w` to its exact Bernstein
basis. The seven nets have respectively

```text
17, 17, 17, 85, 17, 85, 17
```

coefficients: **255 total, zero negative, zero zero**. Their common exact
minimum is `1/288`. The complete labeled coefficient stream is frozen as

```text
4D19F2E3F73E188D88032D56F29E0C233D672ED2EBC0CD7B35350C04F37F95EA.
```

Because every Bernstein coefficient is strictly positive, (10) is positive
for every finite `E>=0` and every `w` in (2), not merely through a finite
order cutoff.

## Scope and remaining gate

Together with the frozen `S>=5,N>=31` theorem, this leaves only the finite
`N=13,...,30` boundary before the no-isolate disconnected-forest `m=1,j=3`
theorem is all-order. Isolate shifts, the tree base, `m=0`, and the final
global assembly remain separate obligations.

## Replay and pins

```powershell
$env:PYTHONHASHSEED='0'
python prove_terminal_q3_m1_forest_j3_short_s_independent_agent.py
```

The verifier checks all dependency hashes and statuses, re-enumerates every
short `H`, enforces both frozen streams and counts, and writes atomically.

```text
prove_terminal_q3_m1_forest_j3_short_s_independent_agent.py
  D8886C0715445E46ACF8AA1183294E9984394DFBDA872F317F782FD9BF3D6E8C
terminal_q3_m1_forest_j3_short_s_independent_20260829.json
  17710D95651A12836EFF44BEEAA6F8EE16EC66468D7F8F33B572CF79CD4961AA
```
