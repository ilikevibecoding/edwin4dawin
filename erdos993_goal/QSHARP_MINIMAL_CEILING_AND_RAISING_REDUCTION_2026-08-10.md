# Q-sharp minimal ceiling and the special raising chain

Date: 2026-08-10

## Result

The sharp experimental base `p=s+4` has an exact `d=4` meaning, but it is
not the stable common-scale colored-cycle core proved in Sections 104/108.
For upper grades it is a normalized central mixed derivative of the
`d=4` fixed-grade row; that fixed-grade row is precisely the conditioning
which Section 108 leaves open.  For lower grades the derivative identity
runs in the opposite direction, so stability of the actual lower row would
not imply stability of the artificial base.

The step `p -> p+1` is the symmetrized homogeneous antiderivative

```text
F_(p+1)=(p+1)(I_x+I_y)F_p.                            (1)
```

It does not preserve stability generically, even when `p=2 deg W_p` and
`W_p` has only negative roots.  Thus both the minimal-ceiling theorem and
the raising chain remain path-specific.  The exact smallest positive target
is a full-interlacing (equivalently Lace-total-positivity) theorem for the
path-selector window rows.

## 1. Exact `d=4` interpretation of `p=s+4`

For fixed `N,s`, write

```text
C_p(z)=(1+z)^p Gamma_(N,s)(z/(1+z)^2)
      =sum_(j=0)^p c_j z^j,                          (2)
```

and define the general binomial window

```text
Q_(p,alpha)(z)=sum_(j=0)^p binom(p+2alpha,alpha+j)c_j z^j.
                                                               (3)
```

The artificial Q-sharp row is `Q_(p,0)`.  In the layer notation of
Section 90, setting `d=4` gives

```text
p=s+4,                 alpha=N-s-4.                  (4)
```

Suppose first that `alpha>=0`, equivalently `s<=N-4`.  The actual binary
`d=4` row is, up to its already-cancelled positive common scalar,

```text
H_(p,alpha)(x,y)
 =(xy)^alpha sum_j binom(p+2alpha,alpha+j)c_j x^j y^(p-j).
                                                               (5)
```

Direct factorial cancellation gives

```text
(partial_x partial_y)^alpha H_(p,alpha)
 ={(p+2alpha)!/p!} Q_(p,0)(x,y).                    (6)
```

Thus the minimal-ceiling Q-sharp theorem would follow from stability of the
actual `d=4` fixed-grade row in every upper grade.  However, Section 108
proves the common-scale core before this conditioning; it explicitly leaves
the nonuniform derivative/fixed-grade step open.  Equation (6) therefore
identifies the base with that missing step rather than proving it from the
colored-cycle theorem.

If `s>N-4`, put `k=s-N+4=-alpha>0`.  The lower-row identity instead is

```text
actual d=4 lower row
 ={(p-2k)!/p!}(partial_x partial_y)^k Q_(p,0).        (7)
```

Hence stability of the minimal Q-sharp row would prove the actual lower
row, but the known stability of a derivative cannot be reversed.  This is
why the common-cycle interpretation does not settle the lower half of the
scanned range.

There is nevertheless an exact raw-selector signature at this ceiling.
Put

```text
a_(M,i)=binom(2M-i-1,i),
(r_0,r_1,r_2)=(24,-4,1).                               (8)
```

Then, with `p=s+4`, the coefficient of `z^j` in the minimal Q-sharp row is

```text
binom(p,j) sum_(q=0)^2 r_q sum_i a_(N-q,i)a_(N-q,s-i)
       * binom(4-2q,j-q-i)/(4-2q)!.                   (9)
```

Indeed `r_q/(4-2q)!=(1,-2,1)_q`.  The numbers `(24,-4,1)` are exactly the
degree-four raw two-pair selector weights: `24`, the two marked-pair
corrections `-2-2`, and the both-pairs correction `+1`.  Thus the minimal
ceiling is the inverse-factorial allocation of the stable raw degree-four
selector coupled to the three path slices.  This is a sharper description
than “the colored-cycle core”: the latter has common-scale weights
`(1,-2,1)`, whereas (9) retains the raw-selector factorials.  What is still
missing is a stability-preserving shared-slot realization of the coupling
in (9); the coefficient identity alone does not supply that contraction.

## 2. Exact raising identity

Let

```text
F_p(x,y)=sum_(j=0)^p q_(p,j)x^j y^(p-j),
q_(p,j)=binom(p,j)c_(p,j),                           (10)
```

where `c_(p,j)=[z^j]C_p` and `C_(p+1)=(x+y)C_p`.
Define the homogeneous integration operators

```text
I_x(x^j y^(p-j))=x^(j+1)y^(p-j)/(j+1),
I_y(x^j y^(p-j))=x^j y^(p-j+1)/(p-j+1).             (11)
```

Then

```text
q_(p+1,j)
 =(p+1){q_(p,j)/(p+1-j)+q_(p,j-1)/j},               (12)
```

with missing coefficients zero, and (10) is exactly (1).  Iterating gives

```text
F_(p+r)={(p+r)!/p!}(I_x+I_y)^r F_p.                 (13)
```

For a palindromic univariate `F_p(z,1)=Q_p(z)`, put

```text
R_p(z)=integral_0^z Q_p(t)dt.
```

Equation (1) is equivalently

```text
Q_(p+1)(z)=(p+1){R_p(z)+z^(p+1)R_p(1/z)}.           (14)
```

Thus the experimental raising theorem asks for stability of a reciprocal
symmetrized antiderivative on the special path-selector family.

## 3. Sharp generic counterexample

The condition `p>=2 deg W_p` and negative-rootedness of `W_p` do not make
(1) a stability preserver.  At the equality case `p=4=2 deg W_4`, take

```text
W_4(t)=(t+1)(t+2).
```

The associated binary form has

```text
Q_4(z)=2z^4+11z^3+19z^2+11z+2
      =(z+2)(2z+1)(z^2+3z+1),                       (15)
```

so all four roots are negative.  Applying (12) gives

```text
Q_5(z)=(z+1)(24z^4+261z^3+449z^2+261z+24)/12.      (16)
```

Its discriminant is

```text
-1552631591796875/47775744<0,                        (17)
```

and it has one nonreal conjugate pair.  The inverse source at `p=4` is

```text
Gamma(t)=(20t^2-63t+24)/12,
```

whose positive roots are approximately `0.44335` and `2.70665`.  Hence the
counterexample does not satisfy the stronger selector invariant that both
positive gamma roots are at least one.  A theorem using that invariant is
not excluded by (15)--(17).

## 4. The coefficient array and the Athanasiadis--Wagner boundary

Write

```text
W_p(t)=S_(p,0)[Gamma](t)=sum_k w_(p,k)t^k.
```

Formula (717) gives the exact array

```text
w_(p,k)=p!/((p-2k)!k!)
 sum_(h=0)^k gamma_h (p-2h)!/((p-h)!(k-h)!).        (18)
```

Combining (18) with the positive path formula (74.6) gives a completely
explicit finite binomial-sum target for every minor in `(p,k)`.  Exact
audits find all adjacent `2 by 2` minors

```text
w_(p,k)w_(p+1,k+1)-w_(p,k+1)w_(p+1,k)              (19)
```

strictly positive for `s>=1`, and a replay below also finds every contiguous
minor through order five nonnegative in its stated range.

This does not yet trigger the Athanasiadis--Wagner theorem.  Their
fully-interlacing criterion is total positivity of the entire interleaved
Toeplitz matrix `Lace(W_p,W_(p+1))`, not merely total positivity of the
ordinary coefficient array `(w_(p,k))`.  Adjacent minors (19) are necessary
and useful planar-network evidence, but they are only a small subset of the
Lace minors.

The sharp sufficient lemma is therefore:

> **Path-window Lace lemma.**  For every `N>=5`, `1<=s<=2N-4`, and
> `p>=s+4`, the two-entry column `(W_p,W_(p+1))^T` is fully interlacing;
> equivalently, its Athanasiadis--Wagner Lace matrix is totally nonnegative,
> with strict proper position after the forced powers of `t` are removed.

Together with the following base lemma,

> **Minimal-ceiling lemma.**  `W_(s+4)=S_(s+4,0)[Gamma_(N,s)]`, after its
> forced zero is removed, has only negative roots,

the Lace lemma proves the entire ceiling chain and in particular every
actual Q-sharp row `p=d+s>=s+5`.

The first lemma is the stable `d=4` common-grade conditioning identified in
Section 1.  The second is the special antiderivative/Jacobi principal-chain
statement suggested by (14), (18), and the strict finite alternation.

## 5. Replay

`analyze_qsharp_minimal_ceiling_raising.py` checks (3), (6)--(12), the
minimal-ceiling root statement over a finite exact range, the counterexample
(15)--(17), the adjacent coefficient minors, and contiguous coefficient-
array minors through order five.  It writes
`qsharp_minimal_ceiling_raising_exact_20260810.json`.

The identities and counterexample are all-order/exact statements.  The root
and minor ranges are evidence for the two boxed remaining lemmas, not their
proof.
