# Uniform low/high strong auxiliary on the complete zero-slack face

## Theorem

For every integer `k>=8` and every real `x,y>=0`, use the translated
minimal-gap ratio rows

```text
L=(x+k+1,x+k-1,x+k-2,...,x),
R=(y+k+1,y+k-1,y+k-2,...,y).
```

Let `c` be their binomial convolution and let `v` be the same convolution
after deleting the first three entries of the left row.  With

```text
M(c)=c_k^2-c_(k-1)c_(k+1)-c_(k-1)c_k,
```

the full strong auxiliary satisfies

```text
(x+k-2)M(c)+B(c,v)>0.
```

Thus the entire two-parameter zero-slack face is closed uniformly in rank.
This does not yet cover positive gap slacks and therefore is not, by itself,
a proof of Erdos Problem 993.

## Four-product reduction

Put

```text
N=x+k, M=y+k,
f(s)=product(s+j,j=2..k),
T=f(x+y+k), L0=f(x), R0=f(y).
```

The factorially de-scaled generating function for a translated minimal row
is

```text
P_N(z)=((N+1)(1+z)^N-1)/N.
```

The three required convolution coefficients therefore have the form

```text
c_(k-1) = ((N+1)(M+1)T-(N+1)L0-(M+1)R0)/(NM),
```

with `c_k,c_(k+1)` obtained by multiplying the three product terms by their
successive ratios.  The deleted head is computed from

```text
u_r=b_r+r(N+1)b_(r-1)+C(r,2)(N^2-1)b_(r-2).
```

Since `B(c,c)=2M(c)`, the target equals `N M(c)-B(c,u)`.  Exact expansion,
while retaining `T,L0,R0` as independent symbols, gives a positive common
scale times

```text
G=T L0 alpha + T R0 beta - L0 R0 gamma - R0^2 delta.
```

Regroup it as

```text
G=L0 R0 (alpha T/R0-gamma)
  +R0^2 (beta T/R0-delta).
```

The proof is therefore two separate pairwise payments.

## Payment 2

Because every factor of `T/R0` is greater than one, `T/R0>=1`.  Exact
factorization gives

```text
beta-delta=N(M+1)W(k,x,y),
```

where `W` is quadratic in `y`, with leading coefficient

```text
2(k+x-2)>0.
```

Its discriminant is `-4S(k,x)`.  After the substitution `k=t+8`, all 25
nonzero coefficients of `S(t+8,x)` are strictly positive.  Hence the
discriminant is negative, `W>0`, and

```text
beta T/R0-delta >= beta-delta >0.
```

The independent audit checks the equivalent completed-square identity

```text
4aW=(2ay+b)^2+(4ac-b^2)
```

and independently reconstructs the same 25-coefficient positive reserve.

## Payment 1

The product ratio is

```text
T/R0=product(1+(x+k)/(y+j),j=2..k).
```

Since `y+j<=y+k`, every factor is at least

```text
1+z,  z=(x+k)/(y+k).
```

Therefore

```text
T/R0 >= (1+z)^(k-1)
     >= 1+(k-1)z+C(k-1,2)z^2+C(k-1,3)z^3.
```

Substitute this cubic lower bound into `alpha T/R0-gamma` and clear the
positive denominator `3(k+y)`.  After `k=t+8`, the numerator has 120 nonzero
monomials in `t,x,y`, and every coefficient is a strictly positive integer.
Consequently the first payment is nonnegative.  The complete sparse
coefficient dictionary is stored in both exact reports.

The second payment is strictly positive, so the full auxiliary is strictly
positive.

## Independent exact spot checks

The independent auditor also reconstructs the original ratio rows and their
binomial convolutions directly, without using the four-product formulas, at

```text
(k,x,y)=(8,0,0),(8,3,11),(9,1,100),
        (13,0,47),(13,29,2),(20,7,31).
```

Every direct integer value is positive and agrees with the theorem's sign.

## Artifacts

```text
prove_uniform_low_high_zero_slack_two_parameter_strong_boundary_root.py
  SHA256 3AF989ED0E4D38215E6702117C659827161E784C8382FA5A614F518438A19415

uniform_low_high_zero_slack_two_parameter_strong_boundary_exact_root_20260826.json
  SHA256 DC71A44F38291A444927B1B98351B8A30640379EF190AC2CBC21CDBE87D0DEB8

audit_uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_root.py
  SHA256 8B9494C7E28D2A750869E722F139512D8CD6C03FFF563B2D4B5F809DA32D6150

uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json
  SHA256 507C9BC153F158A1D956676808FA09EA9C9B3DC3A4ECC2E9D4894A2A243AD8F2
```
