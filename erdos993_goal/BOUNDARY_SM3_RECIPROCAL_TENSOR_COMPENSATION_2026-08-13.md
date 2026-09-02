# Boundary-SM3 reciprocal tensor compensation

Date: 2026-08-13

Status: **EXACT ALL-ORDER IDENTITY AND EQUIVALENT REDUCTION; NOT AN
ALL-ORDER SIGN PROOF.**  The reciprocal/component-labelled formulas below are
proved for arbitrary rooted tree-branch products.  The coefficient audits are
exact but bounded.  No Boundary-SM3 counterexample was found, but the final
adjacent-coefficient inequality is still open.  This note does not prove SM3
or Erdos Problem 993, and no master route file is changed.

## 1. Rooted branch states

Use the exceptional leaf-induction setup

```text
F=T-p,              H=T-N[p],
alpha(T)=alpha(F)=beta,              r=floor(2 beta/3),
beta mod 3 in {1,2}.
```

The components of `F` are rooted at the distinct neighbors `s_i` of `p`.
For branch `F_i`, put

```text
C_i(x)=I(F_i-s_i;x),          D_i(x)=I(F_i-N_Fi[s_i];x),
B_i(x)=I(F_i;x)=C_i(x)+xD_i(x).
```

Write `alpha_i=deg B_i`, `c_i=deg C_i`, and `d_i=deg D_i`.  Define the
reciprocal defect states at the *true branch degree* by

```text
E_i(x)=x^alpha_i C_i(1/x),
Z_i(x)=x^(alpha_i-1) D_i(1/x).                       (1)
```

These are nonnegative integer polynomials and

```text
x^alpha_i B_i(1/x)=E_i+Z_i.                         (2)
```

A branch is critical exactly when `d_i=c_i`.  Equivalently,
`alpha_i-c_i=1`; otherwise `alpha_i-c_i=0`.  If `t` is the number of
critical branches, then

```text
alpha(H)=beta-t.                                     (3)
```

Thus `E_i` is divisible by `x` exactly for a critical branch, and

```text
P(x):=product_i(E_i+Z_i)=x^beta F(1/x),
E(x):=product_i E_i=x^beta H(1/x)
                    =x^t {x^(beta-t)H(1/x)}.         (4)
```

This recovers the critical-count identity while retaining every root state.

## 2. THEOREM (unsplit reciprocal tensor identity)

Put

```text
a=beta-r=ceil(beta/3),
J(x)=(1+x)P(x)+E(x)
    =(1+x) product_i(E_i+Z_i)+product_i E_i.          (5)
```

If `j_k=[x^k]J`, then at every exceptional boundary

```text
D_(r+1)(F)+D_r(F)+D_r(H)=3j_a-j_(a+1).              (6)
```

Equivalently,

```text
D_(r+1)(F)+D_r(F)+D_r(H)
  =[x^(a+1)] (3x-1) J(x).                            (7)
```

Consequently Boundary-SM3 for arbitrary rooted branch products is exactly
the single adjacent defect-row inequality

```text
                         j_(a+1) <= 3j_a.             (8)
```

Unlike the false two-payment split, (5)-(8) combine the `F` and `H` states
before any sign estimate.

### Proof

Reciprocity at degree `beta` gives

```text
[x^(a-1)]P=f_(r+1),   [x^a]P=f_r,   [x^(a+1)]P=f_(r-1),
[x^a]E=h_r,                         [x^(a+1)]E=h_(r-1).
```

Therefore

```text
3j_a-j_(a+1)
 =3(f_(r+1)+f_r+h_r)-(f_r+f_(r-1)+h_(r-1))
 =3f_(r+1)+2f_r-f_(r-1)+3h_r-h_(r-1),
```

which is the left side of (6).  Factorization (7) uses the same compensation
as the `T_m` family,

```text
3x^2+2x-1=(3x-1)(1+x),
```

but now at the full rooted-branch tensor level.  This proves the identity at
all orders.  It does not prove the sign in (8).

## 3. Exact defect-object interpretation

Let `I_k(Q)` denote the independent `k`-sets of `Q`.  The coefficient `j_d`
counts the following disjoint labelled objects:

```text
Omega_d = I_(beta-d)(F)       tagged F0
          disjoint union I_(beta-d+1)(F) tagged F1
          disjoint union I_(beta-d)(H)   tagged H.    (9)
```

The `F1` tag is the extra `x` in `(1+x)P`; the `H` tag is the compensating
tensor `E`.  Hence a branch-local injection

```text
Omega_(a+1)  -->  {1,2,3} x Omega_a                  (10)
```

would prove Boundary-SM3.  Formula (9) is an exact all-order reduction, but
no such structured injection is proved here.  Merely observing that an
unstructured injection exists when the cardinalities satisfy (8) is of
course circular.

The tensors also have the positive append-one-branch recurrence

```text
P_k=P_(k-1)(E_k+Z_k),
J_k=E_k J_(k-1)+(1+x)Z_k P_(k-1).                    (11)
```

This is a possible induction interface, but the target index `a` changes
with the sum of the branch degrees, and no invariant closing (8) has been
found.

## 4. Labelled polarization and a sharp no-go

Keep every selected-root pattern visible:

```text
J(x;y_1,...,y_s)
 =(1+x) product_i(E_i+y_i Z_i)+product_i E_i.        (12)
```

At `y_i=1`, this is (5).  If `S` is nonempty, its labelled channel is

```text
J_S=(1+x) product_(i in S)Z_i product_(i notin S)E_i;
```

the empty channel has one additional `product_i E_i` term.  The full boundary
is the sum of `3[x^a]J_S-[x^(a+1)]J_S` over all `S`.

It is false that every labelled channel is nonnegative, even after grouping
by a nonempty root pattern.  Take `T=K_(1,4)` and let `p` be its center.  The
four singleton branches have `E_i=x`, `Z_i=1`, while

```text
beta=4, r=2, a=2,
J=(1+x)^5+x^4,
3j_2-j_3=3*10-10=20>0.
```

For any one-root pattern `S`, however,

```text
J_S=(1+x)x^3,
3[x^2]J_S-[x^3]J_S=-1.                              (13)
```

Thus coefficientwise positivity in the root labels, positivity by a fixed
number of selected roots, and independent branch-channel payment are all
false routes.  The entire tensor in (12) must be aggregated.

## 5. Replay of the 57-vertex split counterexample

For the previous route witness `F=T_17 union 3K_1`, with `p` adjacent to the
center and all three isolates, the four branches are critical.  With
`A=1+3x+x^2` and `U=1+x`, (4)-(5) specialize to

```text
P=x A^17 U^3+U^37,
E=x^4 A^17,
J=x A^17(U^4+x^3)+U^38.                              (14)
```

Here `beta=38`, `r=25`, `a=13`, and exact expansion gives

```text
j_13 =  81,394,033,100,
j_14 = 187,095,469,484,
3j_13-j_14 = 57,086,629,816.                         (15)
```

This is exactly the positive Boundary-SM3 margin.  Formula (14) also shows
that the earlier `T_m` compensator and its positive binomial term are the two
pieces of one general tensor `J`, shifted by the global defect convention.
The empty selected-root channel itself has margin `-401,573,728`; the full
root-labelled aggregation repairs it.  This independently reinforces why
the failed `F/H` payments cannot be revived channelwise.

## 6. Exact bounded audit

Run

```text
python verify_boundary_sm3_tensor_compensation.py \
  --max-order 13 --random-samples 1000 --product-samples 20000 \
  --output boundary_sm3_tensor_compensation_exact_20260813.json
```

The replay performs three checks:

```text
unlabelled trees of orders 2..13                         2,287
all vertex setups                                        27,918
eligible exceptional setups                              11,336
identity failures                                             0
Boundary-SM3 failures                                         0

random trees (orders 14..100)                             1,000
eligible sampled vertex setups                            3,384
identity failures                                             0
Boundary-SM3 failures                                         0

distinct rooted branch states from trees through order 9    482
random branch products requested                         20,000
eligible exceptional products                            12,200
Boundary-SM3 failures                                         0
```

The labelled audit finds `15,565` negative channels, including `13,685`
nonempty channels; its first nonempty failure is exactly (13).  These counts
are failure shields for overly strong tensorwise targets, not counterexamples
to the aggregated boundary.

The exhaustive and random-product checks use exact integer convolution.  The
random choices are reproducible from seed `993081311`.  Zero failures are
bounded evidence only.

## 7. Remaining all-order obligation

The surviving target is precisely (8) for the structured tensor (5), or a
noncircular branch-local injection of the form (10).  The following are now
ruled out:

* separating `F` and `H` before estimating signs;
* the false second payment or the false strong reserve target;
* proving every selected-root channel separately;
* proving every fixed selected-root-count layer separately.

No genuine Boundary-SM3 counterexample was found.  Since (8) remains open,
the master proof route is not edited.

## 8. Artifact hashes

```text
F4C563D2664355A7CA5C0FCC0861F0CF438FEB71A9574737E1E5E44155463CB6
  verify_boundary_sm3_tensor_compensation.py
5FE2C8945321B4FE193E83B4D9781CC49687FB0325689BF88F4084391218CB4D
  boundary_sm3_tensor_compensation_exact_20260813.json
```

