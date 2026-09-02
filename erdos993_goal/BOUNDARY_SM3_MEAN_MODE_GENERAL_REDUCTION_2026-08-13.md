# Boundary-SM3 general tilted mean/mode reduction and exact no-gos

Date: 2026-08-13

Status: **conditional all-order theorem, exact component formulas, and literal
tree no-gos to the hypotheses; Boundary-SM3 remains open.**  The `T_m`
mean/mode proof does extend verbatim once two explicit aggregate conditions
hold.  Neither condition holds for every rooted tree product.  No actual
Boundary-SM3 counterexample was found, so no master route file is changed.

## 1. General reciprocal tensor

Use the rooted-branch notation of
`BOUNDARY_SM3_RECIPROCAL_TENSOR_COMPENSATION_2026-08-13.md`.  Thus

```text
B_i=E_i+Z_i=x^alpha_i I(F_i;1/x),
P=product_i B_i,                 V=product_i E_i,
U=(1+x)P,                       J=U+V,
beta=sum_i alpha_i,             a=ceil(beta/3).
```

At `beta mod 3 in {1,2}`, the exact unsplit Boundary-SM3 margin is

```text
                         3j_a-j_(a+1),               (1)
```

where `j_k=[x^k]J`.  The issue is therefore the factor-three crossing
`j_(a+1)<=3j_a`.

There is a useful warning hidden in this notation.  If `G` is the tree
obtained by adding the final leaf at `p`, then

```text
I(G)=(1+x)I(F)+xI(H),
J=x^(beta+1) I(G;1/x).                               (2)
```

Consequently global log-concavity of `J` is not a free rooted-DP fact: it is
ordinary log-concavity of the final tree independence polynomial under
reciprocity.  Known non-log-concave trees can occur literally in this setup.

## 2. Exact component hypotheses for the mean/mode mechanism

Write `u_k=[x^k]U`, `v_k=[x^k]V`, and

```text
Delta_k(Q)=q_k^2-q_(k-1)q_(k+1),
X_k(U,V)=2u_kv_k-u_(k-1)v_(k+1)-v_(k-1)u_(k+1).
```

Expansion gives the exact identity

```text
Delta_k(J)=Delta_k(U)+Delta_k(V)+X_k(U,V).           (3)
```

Thus the following aggregate component condition is **necessary and
sufficient** for the first part of the route:

```text
LC:  Delta_k(U)+Delta_k(V)+X_k(U,V)>=0 for every k. (4)
```

In particular, log-concavity of `U` and `V` separately is not enough.  The
mixed term may need payment from their positive Turan margins.  The stronger
condition `X_k>=0`, and the still stronger two-sided synchronization

```text
u_kv_k>=u_(k-1)v_(k+1),
u_kv_k>=v_(k-1)u_(k+1),                              (5)
```

are convenient sufficient tests, but are not necessary and fail very early
for literal tree products.

The second part has an equally explicit component form.  Put `s=1/3` and,
for any nonzero polynomial `Q`, define

```text
mu_Q=s Q'(s)/Q(s),
nu_Q=s d(mu_Q)/ds.                                   (6)
```

These are the mean and variance of the tilted coefficient law.  Define

```text
rho_i=E_i(s)/B_i(s),         rho=product_i rho_i,
w=rho/(4/3+rho).                                     (7)
```

The two product components and their mixture then have the exact moments

```text
mu_U=1/4+sum_i mu_(B_i),
nu_U=3/16+sum_i nu_(B_i),

mu_V=sum_i mu_(E_i),
nu_V=sum_i nu_(E_i),

mu=(1-w)mu_U+w mu_V,
nu=(1-w)nu_U+w nu_V+w(1-w)(mu_V-mu_U)^2.             (8)
```

This is the arbitrary-rooted-product version of the `T_m` mixture
calculation.  No approximation or bounded-order assumption enters (3)-(8).

## 3. CONDITIONAL ALL-ORDER THEOREM

Suppose the rooted branch product satisfies (4), has no internal zero in
`J`, and its exact moments satisfy

```text
mu<a+1,
(a+1-mu)^2>3(nu+1/12).                              (9)
```

Then

```text
                         j_(a+1)<=3j_a.              (10)
```

### Proof

Set `b_k=j_k/3^k`.  Geometric tilting preserves (4), so `(b_k)` is
log-concave and hence unimodal.  If (10) failed, then
`b_(a+1)>b_a`, so every mode `M` would satisfy `M>=a+1`.

Normalize `(b_k)` to a lattice probability law.  The lattice mean/mode lemma
used in the `T_m` theorem gives

```text
|M-mu|<=sqrt(3(nu+1/12)).                            (11)
```

But (9) and `M>=a+1` give the strict reverse inequality.  This contradiction
proves (10), hence the unsplit Boundary-SM3 margin (1) is nonnegative.

Condition (9) is the sharp input obtained from this mean/mode lemma.  The
`T_m` proof used the stronger but simpler tail condition
`(a-mu)^2>=3(nu+1/12)` with `a>=mu`.

## 4. The hypotheses are not universal

### 4.1 The moment certificate already fails on `K_(1,3)`

Take `T=K_(1,2)` with `p` at its center and add the final leaf.  The final
tree is `K_(1,3)`, and

```text
beta=2,             a=1,
J=1+3x+4x^2+x^3,
3j_1-j_2=5>0.
```

The row is log-concave, but its exact tilted moments give

```text
mu=54/67,
nu=2712/4489,
(a+1-mu)^2-3(nu+1/12)=-11433/17956<0.               (12)
```

Thus even aggregate log-concavity does not make the mean/mode certificate
automatic.  The certificate is sufficient, not necessary for the crossing.

This same example already refutes the simple mixed-term conditions.  Here

```text
U=(1+x)^3,          V=x^2,
X_1(U,V)=-1,
```

while the positive individual Turan margins make `Delta_1(J)=5`.

### 4.2 Literal order-26 failures of aggregate log-concavity

Take either of the two known order-26 non-log-concave trees and choose the
displayed leaf/support pair from the exact public certificate.  Deleting the
leaf gives exactly the required exceptional pendant setup with

```text
beta=13,            a=5.
```

For the first tree, the first three reciprocal coefficients are

```text
U: 1,47,1791,...       V: 0,4,1188,...
J: 1,51,2979,...
```

Both `U` and `V` are log-concave, but at rank one

```text
Delta_1(U)=418,      Delta_1(V)=16,
X_1(U,V)=-812,
Delta_1(J)=-378.                                     (13)
```

The second tree similarly gives

```text
Delta_1(U)=154,      Delta_1(V)=25,
X_1(U,V)=-247,
Delta_1(J)=-68.                                      (14)
```

Their actual Boundary-SM3 margins are nevertheless

```text
179056,              157664,                         (15)
```

and their sharp moment gaps in (9) are also negative.  These are literal
tree no-gos to the combined log-concavity/mean-mode mechanism, not
Boundary-SM3 counterexamples.

### 4.3 A rooted component itself need not be log-concave

Root the first order-26 witness at leaf `12` and use it as a single branch.
It is critical, has `alpha_i=14`, and its reciprocal component polynomial
`B_i` begins

```text
1,51,2979,...,
```

so `Delta_1(B_i)=-378`.  Hence the basic local hypothesis “every `B_i` and
`E_i` is log-concave” is false even before products or mixtures are formed.

These examples answer the component question exactly: rooted tree states do
not universally satisfy component log-concavity, synchronization, mixed
nonnegativity, aggregate log-concavity, or the mean/variance reserve.

## 5. Minimal surviving obligation

The general mean/mode route closes every tensor satisfying the two explicit
checks (4) and (9).  What remains cannot be reduced to either check alone.
At minimum one needs a replacement for the following **exceptional tensor
inequality**:

```text
[x^(a+1)] {(1+x) product_i(E_i+Z_i)+product_i E_i}
 <=3[x^a] {(1+x) product_i(E_i+Z_i)+product_i E_i},   (16)
```

restricted to tensors for which (4) or (9) fails.  Equations (13)-(15) show
that any such replacement must permit negative mixed curvature and negative
global Turan margins far before the boundary rank.  A boundary-local ratio
or injection can still work; a global log-concavity proof cannot.

The exact append-one-branch recurrence

```text
J_k=E_k J_(k-1)+(1+x)Z_k P_(k-1)                    (17)
```

remains the cleanest possible induction interface, but no invariant proving
(16) through the changes of `a=ceil(beta/3)` is established here.

## 6. Exact replay

Run

```text
python verify_boundary_sm3_mean_mode_general.py \
  --max-order 14 --catalog-max-order 9 --product-samples 20000 \
  --output boundary_sm3_mean_mode_general_exact_20260813.json
```

It checks the moment mixture, the exact curvature decomposition (3), the
conditional certificate, the order-26 literal no-gos, and the rooted
component no-go.  The bounded audit reports

```text
unlabelled trees through order 14                         5,446
vertex setups                                            72,144
eligible exceptional setups                              26,994
Boundary-SM3 failures                                         0
aggregate-J log-concavity failures                            0
synchronization failures                                  11,416
mixed-nonnegativity failures                              10,032
mean/mode certificate failures                            22,881

random rooted products requested                         20,000
eligible exceptional products                            12,111
Boundary-SM3 failures                                         0
aggregate-J log-concavity failures                            0
synchronization failures                                  10,668
mixed-nonnegativity failures                              10,313
mean/mode certificate failures                             4,148
```

The zero Boundary-SM3 failures are bounded evidence only.  The two order-26
failures are separately loaded and replayed as exact negative certificates
for the hypotheses.

SHA-256:

```text
A1932113425897F197AB3770204FE55CFEBC6052A225F60B055591AE38CFB943
  verify_boundary_sm3_mean_mode_general.py
4541D4A5CEAF552B21BAC0B5F83338E6630D069673B0B5DF6D7774B112FE287E
  boundary_sm3_mean_mode_general_exact_20260813.json
```
