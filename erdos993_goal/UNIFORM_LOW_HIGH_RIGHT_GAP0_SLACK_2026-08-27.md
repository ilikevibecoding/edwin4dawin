# Uniform low/high strong auxiliary with arbitrary right first-gap slack

## Theorem

For every integer `k>=8` and every real `x,y,s>=0`, take

```text
L  =(x+k+1,  x+k-1,x+k-2,...,x),
R_s=(y+k+1+s,y+k-1,y+k-2,...,y).
```

For their binomial convolution `c` and the oriented left-tail convolution `v`,

```text
(x+k-2) M(c) + B(c,v) > 0.
```

## Exact payment lift

Normalize `q=s/(y+k+1)>=0`.  Scaling every positive-degree coefficient of the
right row gives

```text
c(q)=c+q(c-a),
v(q)=v+q(v-a_tail),
H(q)=H0+q H1+q^2 H2.
```

After the common positive scale `((x+k)(y+k))^2`, split the zero-slack
four-product certificate into its two audited payments `P1` and `P2`, where

```text
H0 = P1 + P2,
P1 >= 0,
P2 > 0.
```

An exact symbolic identity gives

```text
H1 = (y+k+2) P1 + 2 P2,
H2 = (y+k+1) P1 + P2.
```

Both new coefficients are therefore strictly positive for `k>=8,y>=0`.
Consequently `H(q)>0` for every `q>=0`.

## Artifacts

```text
prove_uniform_low_high_right_gap0_slack_root.py
  SHA256 9397CA8F529612EE998D21FEC7156EBCB2FAAB03A25D8FC0D5BF0BDE6731EF1A

uniform_low_high_right_gap0_slack_exact_root_20260827.json
  SHA256 FA4227FB18F67D672FF4E1545BD9DC35B311D9E19971E748C14188A78C5F4DA8

audit_uniform_low_high_right_gap0_slack_independent_root.py
  SHA256 121D076F00E05CA37FEBE34532E6BF481B9E2316D7A37936D0909F8D158539D3

uniform_low_high_right_gap0_slack_independent_audit_root_20260827.json
  SHA256 57ACB1006AE195F36710BBD5BB411EF6937AAA157413C464FFE0439784D90F4B
```

The producer and separately implemented independent audit both pass.  This
does not yet cover simultaneous left/right first-gap slacks or other gap
coordinates.
