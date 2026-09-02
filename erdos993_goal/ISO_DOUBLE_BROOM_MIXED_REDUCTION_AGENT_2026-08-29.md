# Connected double-broom mixed-sector reduction

Date: 2026-08-29

Status: **exact all-order normal-form and route-obstruction theorem.**  No new
signed sector is claimed nonnegative.  The result below sharply reduces the
remaining payment after the proved `BB` sector, but it does not yet prove the
connected double-broom terminal, all-forest ISO, or Erdős Problem 993.

Put

\[
 \phi=z+w+zw,\qquad \delta=\frac{(z-w)^2}{2},
\]

and let `P_k` be the path independence polynomial, with
`P_{-2}=0` and `P_{-1}=P_0=1`.  For a connector order `n>=2`, set

\[
 R=P_{n-2},\qquad S=P_{n-3},\qquad T=P_{n-4}.
\]

If the endpoint leaf bundles have sizes `a,b`, the four deletion minors split
into five incidence groups through

\[
 B=(1+x)^{a+b}R,\quad X=x(1+x)^aS,\quad
 Y=x(1+x)^bS,\quad Z=x^2T,
\]

\[
 E=B+X+Y+Z,\qquad U=B+X,\qquad V=B+Y,\qquad W=B.
\]

Here `BB` is already nonnegative by
`ISO_DOUBLE_BROOM_BB_SECTOR_AGENT_2026-08-29.md`.  This note gives an exact
normal form for `BX+BY+XY+BZ`.

## Four-operator normal form

For a bivariate polynomial `Q`, define

\[
 \mathcal L_{c,d}(Q)=cQ+d(\partial_z-\partial_w)Q.
\]

The three operator pairs are

\[
\begin{aligned}
c_X={}&\frac12(2w^2z^2-w^2z-w^2+2wz^3+2wz^2-z^3+z^2),\\
d_X={}&\frac12z(z-w)(z+w),\\
c_{XY}={}&z^2w^2-\delta,\qquad
d_{XY}=\frac12zw(z-w),\\
c_Z={}&z(wz^2-w+z),\qquad
d_Z=\frac12z^2(z-w).
\end{aligned}
\]

Let `swap` interchange `z,w`, and let `(i,j)` be an arbitrary bivariate
Newton index, with `h=i+j`.  Exact classification of the leaf-factor
incidences gives

\[
\begin{aligned}
BX={}&\mathcal L_{c_X,d_X}
 (\phi^i z^jR(z)wS(w))+\operatorname{swap},\\
BY={}&\mathcal L_{c_X,d_X}
 (\phi^j z^iR(z)wS(w))+\operatorname{swap},\\
XY={}&\mathcal L_{c_{XY},d_{XY}}
 (z^{i+1}w^{j+1}S(z)S(w))+\operatorname{swap},\\
BZ={}&\mathcal L_{c_Z,d_Z}
 (z^hR(z)w^2T(w))+\operatorname{swap}.
\end{aligned}
\tag{1}
\]

Equation (1) is a polynomial identity for every `n,i,j`; it is not a finite
interpolation.  The verifier derives the abstract 42-term nested kernel,
classifies every term by its two incidence letters, and recovers the three
operators before substituting any path order or Newton index.

## Consecutive-path carriers

The only antisymmetric path products in (1) have exact positive quotients.
The consecutive quotient theorem gives

\[
 R(z)S(w)-S(z)R(w)=(z-w)D_{n-2}(z,w),
 \qquad D_{n-2}\ge_{\rm coeff}0.
\tag{2}
\]

Using `R=S+xT` once more gives the two-step identity

\[
 \frac{R(z)T(w)-T(z)R(w)}{z-w}
 =D_{n-3}(z,w)+T(z)T(w)\ge_{\rm coeff}0.
\tag{3}
\]

Thus (2)--(3) replace every antisymmetric `RS` or `RT` path dependence by a
coefficientwise nonnegative symmetric carrier.  What remains signed is the
explicit first-order multiplier/diagonal extraction in (1), not an unknown
path determinant.

## Correct path-length recurrence

Every one of the four minors satisfies

\[
 F_n=F_{n-1}+xF_{n-2}\qquad(n\ge4).
\]

For the compact nested operator `N`, common multiplication by `x` has the
defect

\[
 N(xF)=zwN(F)-\delta\mathcal R(F),
\]

where

\[
 \mathcal R(F)=z^2E(w)W(z)+w^2E(z)W(w)
 +zw\{U(w)V(z)+U(z)V(w)\}.
\]

Consequently the exact Pascal gap is

\[
\boxed{
N(F_n)-N(F_{n-1})-zwN(F_{n-2})
=2\mathcal B_N(F_{n-1},xF_{n-2})-\delta\mathcal R(F_{n-2}).}
\tag{4}
\]

The `-delta R` term in (4) is essential; omitting it gives a false identity.
The remaining double-broom proof may therefore be finished either by proving
the diagonal of (4) nonnegative for every Newton index, or by directly
dominating (1) with the already-proved `BB` reserve.

## Exact route obstructions

The mixed sector cannot be declared nonnegative by itself.  Literal cells
already refute the natural separate payments:

| order | rank | `(i,j)` | `BB` | `BX` | `BY` | `XY` | `BZ` | obstruction |
|---:|---:|:---:|---:|---:|---:|---:|---:|:---|
| 2 | 4 | `(2,2)` | 60 | -4 | -4 | 8 | 0 | `BX+BY=-8` |
| 2 | 3 | `(0,2)` | 12 | -1 | 10 | -4 | 0 | `XY+BZ=-4` |
| 2 | 4 | `(2,3)` | 35 | -7 | -3 | 0 | 0 | all mixed `=-10` |

Hence the `BB` reserve is logically necessary for this grouping.

Nor is the polynomial gap in (4) coefficientwise nonnegative.  At
`n=4,(i,j)=(0,0)`, twice the exact gap has coefficients

\[
 [z^4w](2\,\mathrm{gap})=-24,
 \qquad [z^4](2\,\mathrm{gap})=-9.
\]

This rules out a raw bivariate coefficientwise proof.  It does **not** refute
the still-observed diagonal inequality; that all-order diagonal sign is the
remaining obligation.

## Replay and hashes

Run

```powershell
python .\prove_iso_double_broom_mixed_reduction_agent.py
```

The default replay checks 144 literal group normal forms, 18 tuple
recurrences, five consecutive CD identities, four two-step CD identities,
and all exact obstruction cells.  It ends with

```text
PASS_EXACT_ALL_ORDER_ISO_DOUBLE_BROOM_MIXED_NORMAL_FORM_CD_REDUCTION
```

- source SHA-256:
  `50E5045BCDFED67757D66115751685D6138D85447949D48256236AEAF449772F`
- JSON report SHA-256:
  `5BE36090AF06FA2B30976F6519A23287A33FCB432C528B2B155F7B77A4BE81D8`
- replay value-stream SHA-256:
  `A02DC553E1248CBECB102ACBCDC29BCE35CC4FF3F0DD069472023637BBB70434`

The certificate proves the reduction and the route obstructions only.  It
does not promote the finite zero-negative diagonal probe to an all-order
positivity theorem.
