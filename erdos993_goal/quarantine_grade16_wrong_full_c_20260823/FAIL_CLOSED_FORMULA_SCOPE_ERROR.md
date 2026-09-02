# Fail-closed formula-scope error: curvature grade 16

These artifacts are excluded from every proof registry.

The quarantined producer and its independently transcribed auditor both used
the full convolution `c` in the polynomial `c8^2-c7*c9`.  The canonical
curvature definition instead uses the oriented left-tail convolution

```
tail = [0,0,0] + left[3:]
v_r = binomial_convolution(tail,right,r)
curvature_top = v8^2-v7*v9.
```

Thus agreement between the two quarantined runs checked the wrong polynomial.
The invalid registry SHA256
`95996F3F88E6C20489EA28FCA1865362B5737A9A3F0BBCB1BAFA0BC5EF444A82`
and invalid registry-audit SHA256
`D5572A85FCB3CB8C2E4F57E29A95BA1BC6DE6543A96C9DD4578553E4D247A1E9`
receive zero proof credit.  The last valid registry boundary is 52 audited,
0 producer-only, 72 missing, pending its restored rehash.
