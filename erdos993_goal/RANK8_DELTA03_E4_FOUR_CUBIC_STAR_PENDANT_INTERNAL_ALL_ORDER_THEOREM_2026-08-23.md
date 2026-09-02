# Rank-eight terminal Delta0--Delta3: four-cubic-star pendant-internal root

## Theorem

For every subdivision of the four-cubic-star degree-surplus-four skeleton, of
every order `n>=27`, rooted at a vertex internal to a pendant path,

`Delta^j R_1(A,q)>0` for `j=0,1,2,3`.

## Exact quotient and all-order lift

The exact symmetry quotient has 79,027,200 keys, partitioned without a gap as:

- 19,188,792 all-short keys, of which 18,693,172 have order at least 27;
- 59,838,407 mixed all-order rays;
- one all-long ray.

The transfer/Newton reduction proves degree bounds `28,28,27,26` for
`Delta0,...,Delta3`. The primary scan checked all 18,693,172 finite cells and
29 points on every rank-ray, totaling 6,941,255,328 rank-ray samples. Every
Newton constant and first difference is positive, all higher coefficients
through the exact degree are nonnegative, and every coefficient above the
degree vanishes.

## Independent literal audit

A separately compiled checked-`i256` engine used independently transcribed
root-tail propagation and generic adjacency-list forest DP. It rebuilt
198,208,396 literal trees, matched the complete primary finite-value and
Newton-coefficient streams, and checked an unseen `S=29` value for each rank
and ray (239,353,632 checks).

## Immutable evidence

- reduction source/report:  
  `F4C58DC5B46CFE389785B3F1FCA544E72100DAD07D7FF1AE4EC12B9555182D88`  
  `D14EE51513F771A9B218896FE6B4438456D6A823303C5950FF7703AEFB031DF0`
- primary source/executable/raw result:  
  `67AFF9B1C8A046C7B175BD1468B4D19A6F89D8E965AC9D1122FEE9ACFC19B1FB`  
  `93AB2ADA4118A48C754F7CC50FCECC1B3EC606D37F1062C0E01B1E213F49E57D`  
  `9262755FADBD7338BC4EC5BE9C78381CBC4E52B62E9B30281DB3E9F5E0D31964`
- sealed primary source/report:  
  `26493461E3A440DE48A26868D8F09DEC81E23D3C5B361BC1B12B4D88DD6C4002`  
  `ED42CAEC59BD0B41A7033C57124DC8D360A5F67B0DAA29E61740B147B2C3FEE5`
- literal-audit source/executable/raw result:  
  `78080BCE3317A53B8DD54BD08CD62D0BB4953B2FB9D3F4B8BF5BED261637A06B`  
  `D04E7DBA9D4C179E0C3B8EEBEFF449E32561EE7146C53FC94C6B59E911A8CE36`  
  `1B563FB339DE869ABAB1A8AFDBC85DDF9AC3A5EC4A1DFD36A99BFA580CD7EA0E`
- sealed independent-audit source/report:  
  `AE02E913B8F91D5BAE53CADBFBAD0C93E55F91676FD7AB31A83BF9B052325E8F`  
  `6C8221CFD139699154E955C89E57F966E0A51DD6BA7776B278E21B19FA8B1C04`

This theorem credits exactly `four_cubic_star:pendant_internal`; all other
root orbits remain separate.
