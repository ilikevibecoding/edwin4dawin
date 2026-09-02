# The odd block theorem does not formally propagate through the diagonal

The new Gegenbauer theorem proves the strict directed proper position

```text
B_(n,s) prec B_(n-4,s),       n odd, n>=4s+9.       (1)
```

This closes the one-factor block problem, but it does not by itself prove
the simultaneous diagonal gamma comparison.  The distinction is exact and
cannot be repaired by an abstract convolution-preservation argument.

## 1. What does propagate

Write normalized finite multiplicative convolution as `box_s`, and put

```text
R_(m,s)(x)=x^s B_(m,s)(1/x)/lc(B_(m,s)).            (2)
```

This is exactly the hypergeometric factor in (79.3).  Coefficient comparison
gives

```text
F_(n,m,s)(-x)/q_(m,s)=B_(n,s) box_s R_(m,s).        (3)
```

The polynomial `R_(m,s)` has roots of one sign.  Hence finite
multiplicative convolution with this *fixed* factor preserves proper
position.  Equation (1) therefore proves, with the direction retained,

```text
F_(n,m,s)(-x) prec F_(n-4,m,s)(-x)                 (4)
```

for every admissible fixed second path `m`.

Set `n=2M-1`, `ell=n-4`, and

```text
A_M(z)=F_(n,n,s)(z),
K(z)=F_(ell,n,s)(z),
A_(M-2)(z)=F_(ell,ell,s)(z).                       (5)
```

Applying (4) at `m=n`, and then at `m=ell` followed by reciprocal
reflection, brackets both diagonal endpoint root sets by the reciprocal
mixed pair `K,K*`.  This proves the codimension-two positive-compatibility
bridge described in Sections 76 and 79.  It is the strongest formal
consequence of fixed-factor preservation.

It does **not** compare `A_M` directly with `A_(M-2)`.  In (3), the first
diagonal uses `B_n box R_n` and the second uses
`B_(n-4) box R_(n-4)`: both convolution factors move.  Chaining the two
mixed comparisons would be precisely the invalid interlacing-transitivity
step warned about in Sections 75--76.

## 2. Exact counterexample to simultaneous diagonal preservation

The failure already occurs in degree four in the same normalized
finite-convolution formalism.  Let

```text
P(x)=product_(r in {1,3,5,7})(1-x/r),
Q(x)=product_(r in {2,4,6,14})(1-x/r).             (6)
```

Their roots have the strict directed order

```text
1<2<3<4<5<6<7<14,                                  (7)
```

so `P prec Q`.  Let `P^vee,Q^vee` be the normalized reciprocals from
(2).  Fixed-factor preservation is strict in both cases:

```text
P box_4 P^vee prec Q box_4 P^vee,
P box_4 Q^vee prec Q box_4 Q^vee.                  (8)
```

Reciprocal reflection gives the full mixed bracket

```text
P box Q^vee prec P box P^vee prec Q box P^vee,
P box Q^vee prec Q box Q^vee prec Q box P^vee.     (9)
```

Thus the two self-dual diagonals occupy the same mixed interlacing gaps,
exactly as in the path reduction.  Nevertheless they do not interlace each
other.

To see the failure directly at the required gamma level, put

```text
D_P=P box_4 P^vee,       D_Q=Q box_4 Q^vee,
D_P(-z)=(1+z)^4 G_P(z/(1+z)^2),
D_Q(-z)=(1+z)^4 G_Q(z/(1+z)^2).                    (10)
```

Exact coefficient extraction gives

```text
G_P(t)=1+284/105 t+104/315 t^2,
G_Q(t)=1+407/168 t+19/63 t^2.                      (11)
```

Both individual polynomials have two simple real roots.  But

```text
disc_t(G_P-cG_Q)
 =(1096675 c^2-2488000 c+1410048)/235200.          (12)
```

At the positive rational value

```text
c=49760/43867,
```

the discriminant is

```text
-14944/3290025<0.                                  (13)
```

Therefore directed proper position of the blocks, even together with both
fixed-factor mixed comparisons and self-duality, does not imply
real-rootedness of the signed diagonal gamma pencils.

This is an abstract counterexample to the inference, not a counterexample
to the actual path family.

## 3. Exact remaining path lemma

Let

```text
D_(n,s)=B_(n,s) box_s R_(n,s)
       =F_(n,n,s)(-x)/q_(n,s).                     (14)
```

The remaining path-specific statement is

```text
Gamma_s(D_(n,s)(-z))-lambda Gamma_s(D_(n-4,s)(-z))
is real-rooted for every lambda>0,                 (15)
```

for odd `n>=4s+9`.  Positive normalizations in (14) show that (15) is
equivalent to

```text
G_(M,s)(t)-cG_(M-2,s)(t) is real-rooted
for every c>0,       n=2M-1.                       (16)
```

Equivalently, using (74.1), the exact coefficient-of-powers form is

```text
[z^s] B_t(z) A_t(z)^(R-4)(A_t(z)^4-c),             (17)
R=2M-s-1,
A_t(z)=(1+z+t z^2)/(1-t z^2)^2,
B_t(z)=1/(1-t z^2),
```

and the assertion is that (17), as a polynomial in `t`, is real-rooted for
every `c>0` throughout the forest reserve.

This lemma is minimal in the Obreschkoff sense.  The positive pencil is
already supplied by the mixed-slice bridge.  Adding (16) supplies the
missing signed half, hence strict proper position of `G_(M,s)` and
`G_(M-2,s)`.  The strict root-sum orientation from Sections 67 and 75 then
selects

```text
a_i<c_i<a_(i+1),                                   (18)
```

where `a_i` and `c_i` are the increasing negative roots at sizes `M` and
`M-2`.  Thus (16) would close the codimension-two cross-gap and (62.4).

No theorem cited in Sections 62, 75, 76, 79, or 80 proves (15)--(17).  The
odd Gegenbauer block theorem establishes all of (4), but the simultaneous
diagonal lemma remains a genuinely additional path-specific obligation.

## 4. Exact replay

`audit_block_to_diagonal_propagation.py` verifies over `QQ` the two strict
fixed-factor comparisons in (8), the reciprocal bracket (9), failure of
diagonal alternation, the gamma identities (11), and the negative rational
discriminant (13).  It writes
`block_to_diagonal_propagation_exact_20260810.json` and reports

```text
PASS_EXACT_BLOCK_TO_DIAGONAL_PROPAGATION_COUNTEREXAMPLE.
```
