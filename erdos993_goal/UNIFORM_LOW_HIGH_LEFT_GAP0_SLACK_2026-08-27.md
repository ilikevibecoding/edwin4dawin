# Uniform low/high strong auxiliary with arbitrary left first-gap slack

## Theorem

For every integer `k>=8` and every real `x,y,s>=0`, take

```text
L_s=(x+k+1+s,x+k-1,x+k-2,...,x),
R  =(y+k+1,  y+k-1,y+k-2,...,y).
```

Let `c` be their binomial convolution and let `v` be the convolution after
deleting the first three entries of the left coefficient row.  Then

```text
(x+k-2) M(c) + B(c,v) > 0.
```

This is the first complete positive gap-slack direction proved uniformly in
rank.  It extends the independently audited two-parameter zero-slack theorem,
but does not cover the other gap coordinates or simultaneous slacks.

## Quadratic reduction

Write `N=x+k`, `M=y+k`, and normalize the new slack by

```text
q=s/(N+1) >= 0.
```

Changing the first left gap multiplies every positive-degree coefficient of
the left row by `1+q`.  If `b` is the right coefficient row, `c` and `v` denote
the zero-slack convolution and tail convolution, and `d=c-b`, then

```text
c(q)=c+q d,
v(q)=(1+q)v.
```

By the polarization identity for `M`, the strong auxiliary is exactly

```text
H(q)=H0+q H1+q^2 H2.
```

The coefficient `H0` is strictly positive by the independently audited
two-parameter zero-slack theorem.

## Four-product payments for H1 and H2

With

```text
T=product(x+y+k+j,j=2..k),
L=product(x+j,j=2..k),
R=product(y+j,j=2..k),
```

each of the two new coefficients, after removing the positive scale
`((x+k)(y+k))^2`, has exactly four product terms:

```text
T L alpha + T R beta - L R gamma - R^2 delta.
```

Regroup this as

```text
L R (alpha T/R-gamma) + R^2 (beta T/R-delta).
```

For both `H1` and `H2`, exact shifted sparse expansions prove `alpha>0` and
`beta>0`.  The two payments use

```text
T/R >= (1+(x+k)/(y+k))^(k-1)
    >= 1+(k-1)z+C(k-1,2)z^2+C(k-1,3)z^3,
T/R >= 1.
```

After substituting `k=t+8`, the cleared numerators have only strictly positive
integer coefficients:

| coefficient | alpha | beta | cubic payment | unit payment |
|---|---:|---:|---:|---:|
| `H1` | 64 | 189 | 280 | 189 |
| `H2` | 64 | 195 | 270 | 195 |

The minimum coefficient in every sparse certificate is `1`.  Hence `H1>0`
and `H2>0`, so `H(q)>0` for every `q>=0`.

## Exact replay

The producer also reconstructs the original ratio rows and checks the symbolic
quadratic against direct integer convolutions at five points through rank 20.

```text
prove_uniform_low_high_left_gap0_slack_root.py
  SHA256 66096D1C7BFEC978D9BD2F77117C6B57C0DDBEDB459FF845D9FFCE738BCECA6A

uniform_low_high_left_gap0_slack_exact_root_20260827.json
  SHA256 B176B7C457214574448A2D9E2DD724F906CAC7A70FE0A4F154B66093687FD601

audit_uniform_low_high_left_gap0_slack_independent_root.py
  SHA256 9F1C6C5529C517A9671024462E9D9AC478B8F20CAB048D2BB22D064829FC7F25

uniform_low_high_left_gap0_slack_independent_audit_root_20260827.json
  SHA256 4B7A2DD54ED055E6C05889E41FC1690D4897C1DDC2FB7BBA7293E1BB73C3F9ED
```

The exact producer and the separately implemented independent audit both pass.
