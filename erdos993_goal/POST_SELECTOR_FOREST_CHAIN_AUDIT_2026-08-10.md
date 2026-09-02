# Post-selector forest-chain clean-room audit

Date: 2026-08-10

## Verdict

The selector theorem in Section 82 is sound as a theorem about the **upper
homogeneous rows**, and its parameters meet the fixed-ceiling theorem in
Sections 1--61, including both parity boundaries.  It does not yet imply the
hard-group reserve polynomial, either affine package, the pendant cascade, or
forest unimodality.

The shortest honest dependency graph is

```text
Section 82 two-outlier selector theorem
        |
        v
Sections 1--61 fixed-ceiling/window theorem
        |
        v
all upper residual rows (s <= r=N-d) are stable                 PROVED
        |
        +--> shifted lower residual rows (s>r)                  OPEN
        |
        +--> compatibility through the common homogenizer       OPEN
                |
                v
hard-group reserve G_(N,d)(X,Y) stable                          OPEN
                |
                v
original group and bottom affine central coefficients >= 0      OPEN
                |
                v
protected-leaf / Lambda / mixed-payment / pendant assembly       OPEN
                |
                v
prefix GSB + known bipartite decreasing tail
                |
                v
unimodality of every forest                                     CONDITIONAL
```

There are therefore at least three mathematical gates after the selector:

1. finish the hard-group reserve endpoint;
2. prove the original signed affine comparison in the group and bottom
   packages;
3. prove and assemble the protected-leaf, mixed-payment, and pendant
   reductions.

The often-listed "shifted lower selector" and "shared homogenizer" gaps are
not fully independent of each other.  A direct theorem proving the complete
homogenized group endpoint would automatically settle every lower row.  They
are separate obligations only in the present row-by-row route.  By contrast,
the affine comparison is genuinely independent of reserve stability.

## 1. What Section 82 actually closes

For an upper layer, Section 90 of
`NYQUIST_RESERVE_INDUCTION_LEMMA_2026-08-02.md` has

```text
r=N-d,       0<=s<=r,
p=d+s,       alpha=r-s,
m=floor(s/2)+2.
```

Equations (709)--(717) identify its Newton selector with the gamma polynomial

```text
Gamma_(N,s)=G_(N,s)-2tG_(N-1,s)+t^2G_(N-2,s).
```

Section 82 proves that `Gamma_(N,s)` has two roots in `(1,infinity)` and
`floor(s/2)` negative roots for `s>=2`.  The boundary layers are direct:

```text
Gamma_(N,0)=(1-t)^2,
Gamma_(N,1)=2(N-3)(t-1)(t-(N-1)/(N-3)).
```

The group cone is `2d-N>=5`, and hence

```text
p-alpha = 2d-N+2s >= 2s+5.
```

The fixed-ceiling theorem requires `p-alpha>=4m-3`.  At the sharp cone
boundary the slack is exactly

```text
s=2h:     (2s+5)-(4m-3)=0,
s=2h+1:   (2s+5)-(4m-3)=2.
```

Thus there is no even/odd or `s=0,1` hole.  The hypotheses of Sections 1--61
apply to every upper layer.  The result is negative-rootedness of each upper
residual binary row.  It is not a statement about the sum of those rows.

## 2. Lower layers and the common homogenizer

For `s>r`, put

```text
k=s-r,        p_-=N-k,       j=k+h.
```

After the formal endpoint zeros are removed, Section 90 gives the exact row

```text
Qtilde^(s)_(N,d)(z)
 =sum_(h=0)^p_- binom(p_-,h) binom(p_-+2k,k+h)
   R_(N,d,s)(kN+h(p_--h)) z^h.                      (L)
```

The identity behind the shift is

```text
j(d+s-j)=kN+h(p_--h).
```

The selector theorem controls the unshifted upper source.  It supplies no
root theorem for `R_(N,d,s)(kN+lambda)`.  An additive shift of a selector is
not a harmless change of the binomial-window parameters, and no upper/lower
reflection identity was found in the exact formulas.  The terminal constant
row is harmless, but all nonconstant rows in (L) still need a theorem.

The finite audit in Section 90 proves neither this nor global stability: it
checks 552 complete-diamond rows through `d=12` and 516 adjacent exact
Bezoutian interlacings.  Those are finite certificates only.

The exact hard-group target is

```text
G_(N,d)(X,Y)
 =S^d(g_(N,1) tensor g_(N,1))
  -2S^(d-2)(g_(N-1,1) tensor g_(N-1,1))
  +S^(d-4)(g_(N-2,1) tensor g_(N-2,1)),              (G)
```

for the admissible cone `N>=d` and `2d-N>=5`.  The minimal reserve theorem is
simply:

> **Group reserve lemma.**  The polynomial (G) is real stable throughout the
> admissible cone.

A stable ternary homogenization is a clean sufficient package.  It would
settle lower rows as well, because every homogeneous row is obtained by
differentiating in the homogenizing variable and specializing that variable
to zero, operations that preserve stability (or yield zero).

Conversely, even stability of every homogeneous component does not imply
stability of their sum.  The exact two-variable counterexample is

```text
P(x,y)=1+(x+y)+2xy.
```

Its three homogeneous pieces are stable, but

```text
P(z,z)=1+2z+2z^2
```

vanishes at `z=(-1+i)/2` in the upper half-plane.  Therefore shared-variable
compatibility is a genuine theorem, not bookkeeping.  This counterexample
also explains why finite adjacent-row interlacing cannot simply be promoted
to the group endpoint.

Equation (478) gives a second exact formulation,

```text
G_(N,d)=D_X D_Y(F_(N+1,d)-F_(N,d-2)).
```

Both `F` terms are stable by the solved bottom theorem, but their fixed minus
difference is not covered by a generic closure theorem.  The stronger pencil
`F_(N+1,d)-uF_(N,d-2)` is false for general `u`, as Section 77 records.  Hence
that route also leaves the required value `u=1` open.

Logical classification:

- Lower shifted selectors are independent of the **upper selector theorem**.
- They are not independent of the **full group reserve lemma**, which would
  subsume them.
- Stable rows do not imply the full group reserve lemma.

## 3. The exact minimal affine bridge

Reserve stability is only the reference half of the affine argument.  The
direct statements still needed are the following two coefficient families.
Put

```text
A=(1+z)(1+w),
T=z(1+z)+w(1+w),
V=1+z+w,
M=m+r+5.
```

### Group family

For both `epsilon in {0,1}` and every

```text
c>=1,  m>=3,  x>=0,  r>=0,
```

prove

```text
[z^M w^M]
A^(2c+m+x-3) T^(2m+epsilon-4) V^r
* (B^grp_epsilon(c,m,x)+r P^grp) >= 0.               (A_grp)
```

Here `B^grp_epsilon=T^3 K^aff_epsilon V+JA` and `P^grp=JA` are the exact
finite kernels of
`PATH_ISOLATE_P4_GROUP_AFFINE_TWO_KERNEL_REDUCTION_2026-08-01.md`.

### Bottom family

For both `epsilon in {0,1}` and every

```text
m>=3,  x>=0,  r>=0,
```

prove

```text
[z^M w^M]
A^(m+x-3) T^(2m+epsilon-5) V^r
* (B^bot_epsilon(m,x)+r P^bot_epsilon(m)) >= 0.       (A_bot)
```

These are the exact kernels and moving target of
`PATH_ISOLATE_P4_BOTTOM_PAIR_AFFINE_TWO_KERNEL_REDUCTION_2026-08-01.md`.

Statements `(A_grp)` and `(A_bot)` are the minimal algebraic bridge at the
current reduction level.  The ten coordinate-monotonicity inequalities

```text
group:  epsilon x {x,c,m},
bottom: epsilon x {x,m}
```

are a sufficient finite-base strategy, not the theorem that ultimately has
to be proved.

The independence from reserve stability is formal and exact.  Every reserve
kernel `P` is nonnegative/stable, but the target is `D+rP` with a signed base
`D`.  At `r=0` the reserve disappears completely.  More generally, stability
or nonnegative-rootedness of `P` gives no coefficient domination of `D`.
The group audit actually contains 978 negative base increments and the
bottom audit 902, while their sampled combined targets remain positive.

Thus proving (G), even in the strongest possible stable form, does not prove
`(A_grp)` or `(A_bot)`.

## 4. What remains between the affine bridge and forests

The surviving source notes do not support treating final propagation as a
clerical assembly.

1. `PROTECTED_LEAF_PHASE_INDUCTION_REDUCTION_2026-07-29.md` proves a
   conditional induction assuming the four local recurrences P1--P4, their
   rank-four versions, and collision variants.  It explicitly says the
   computations do not prove P1--P4.  The stable path/P4 affine work addresses
   a terminal part of this program; it is not a proof of P1--P3.

2. `SHARP_MIXED_LAMBDA_BRIDGE_CANDIDATE_2026-07-29.md` proves identities and
   factorial reductions, but leaves three nonnegativity obligations: the
   Lambda leaf recursion/deletion-fiber Poincare inequality, the nested
   bridge, and the complete mixed bracket.  Its final update closes the
   rank-three pruning boundary, not the `q>=4` induction.

3. `PENDANT_GSB_CASCADE_REDUCTION_2026-07-26.md` proves that the pendant
   cascade

   ```text
   H_k(I(G)) >= H_(k-1)(I(F)),       2<=k<L(G),
   L(G)=floor((2 alpha(G)+1)/3),
   ```

   would imply all prefix GSB inequalities and hence forest unimodality.  The
   same note labels this cascade conjectural.  Rank two is proved for every
   forest and several terminals are proved, but the uniform cascade is not.

4. The external Levit--Mandrescu theorem supplies the nonincreasing tail for
   every bipartite graph, beginning at

   ```text
   ceil((2 alpha-1)/3)=floor((2 alpha+1)/3).
   ```

   Since every forest is bipartite, this tail would meet the prefix supplied
   by PGC.  The edgeless and rank-one bases are explicit in the pendant note.

Accordingly, even a future proof of both affine families would only allow the
protected-induction assembly to resume.  It would not, on the present written
record, finish the conjecture without the local recurrences, mixed bridge,
and pendant cascade.

## 5. Boundary and parity ledger

| Location | Boundary audit |
|---|---|
| Selector `s=0` | `(1-t)^2`; allowed double root at 1; no negative roots required. |
| Selector `s=1` | Roots `1` and `(N-1)/(N-3)>1`; no negative roots required. |
| Upper even `s=2h` | Fixed-ceiling reserve is sharp: zero slack. |
| Upper odd `s=2h+1` | Two units of reserve slack. |
| Lower terminal row | Constant after formal endpoint zeros are removed; harmless. |
| Group affine | Both parities, `c>=1,m>=3,x,r>=0`; six monotonicity directions if that route is used. |
| Bottom affine | Both parities, `m>=3,x,r>=0`; four monotonicity directions if that route is used. |
| Pendant base | Edgeless forests and rank one are direct; rank-two PGC is proved. |
| Protected induction | Rank-three boundary is closed; uniform `q>=4` recurrences remain open. |

No missing parity case was found in the selector-to-upper-window step.

## 6. External theorem ledger

The following are genuine external dependencies of the proved selector and
fixed-ceiling spine.

1. **Durán, Theorem 1.3, arXiv:2507.22425 (2025).**  For monic Laguerre
   combinations, if the coefficient polynomial `Q` has only real zeros below
   `alpha+1`, the combination has positive simple zeros from `n>=K`.  The
   application has `alpha=beta in {-1/2,1/2}>-1`, `K=m`, `n>=m`, nonzero
   endpoint coefficients, and strict fixed-ceiling margins.  The hypotheses
   match.  This is a recent preprint, not a classical theorem, and should be
   cited as such.

2. **Golitsyna--Karpenko, JDEA 22 (2016), 1871--1879.**  Their Theorem A says
   the falling-Pochhammer transform has at least as many positive roots as
   its source; Theorem C says it has no more negative roots.  These are
   exactly the two zero-count directions used in Sections 27 and 60.
   Their Theorem B/Brenti mesh result supplies the positive-root mesh used in
   Section 28.  Here `h=1>0`, so the hypotheses match.

3. **Pólya--Schur multiplier sequences.**  The diagonal sequences
   `1/(B)_j` and `1/(alpha+1)_j` require `B>0` and `alpha+1>0`; both hold.
   Their exponential generating functions are `0F1` functions with negative
   zeros.  The finite symbol criterion is also used for the path-block
   multiplier.  Selector closure does not ultimately require a strict
   version, because Section 82 includes a limiting argument.

4. **Grace--Walsh--Szegő.**  Section 58 uses a symmetric multiaffine
   polynomial and the closed half-plane `C_theta`, a convex circular domain.
   This is precisely the convex-domain branch of the theorem.

5. **Laguerre's polar-derivative theorem.**  Section 59 applies it twice to
   a circular half-plane containing both all zeros and the polar point.
   Differentiation lowers the degree but preserves the same containment, so
   the second application has the required hypothesis.

6. **Classical real-rootedness tools.**  The proof also uses Obreschkoff's
   pencil/interlacing theorem, Descartes exactness for a real-rooted
   polynomial without zero roots, variation diminution for totally
   nonnegative matrices, classical Jacobi/Laguerre/Gegenbauer zero locations
   and interlacing, and stability of elementary symmetric polynomials.  The
   parameter ranges displayed in the proof place every orthogonal-polynomial
   parameter above `-1`.

7. **Finite multiplicative convolution.**  Real-rootedness preservation for
   a fixed one-sign-rooted factor, plus linearity and Obreschkoff, gives the
   compatibility transport used in Sections 79--82.  The manuscript should
   cite a precise normalization-compatible theorem (for example the finite
   free convolution literature); no parameter conflict was found.

8. **Levit--Mandrescu decreasing tail.**  Their 2006 theorem for bipartite
   graphs gives
   `i_ceil((2alpha-1)/3)>=...>=i_alpha`.  Galvin's 2012 paper states this
   exact form and cites the primary paper.  Nonincreasing, not strict,
   monotonicity is all the pendant reduction needs.

The external tools above do not repair any of the open implications in
Sections 2--4.  They validate the already-closed analytic spine only.

## 7. Current literature status

The local literature audit dated 2026-08-07 and a fresh 2026-08-10 search
both find the universal tree/forest assertion still publicly listed as
open.  Recent papers prove special families only.  This status check is not
evidence for any mathematical implication in this audit.

## 8. Exact replay

`audit_post_selector_forest_chain.py` checks:

- the upper even/odd fixed-ceiling slack through `s=400`;
- the exact lower-shift identity symbolically;
- the homogeneous-row counterexample and its upper-half-plane zero;
- the prefix/tail cutoff identity through `alpha=1000`.

It writes `post_selector_forest_chain_audit_exact_20260810.json`.  These
checks are transcription guards; the open/closed classification above comes
from the exact source theorems and explicit status statements, not from a
finite computation.
