# Rank-eight terminal Delta0--Delta3: four-cubic-star center root

## Theorem

For every subdivision of the four-cubic-star degree-surplus-four skeleton, of
every order `n>=27`, rooted at its central degree-three branch vertex,

`Delta^j R_1(A,q)>0` for `j=0,1,2,3`.

## Exact quotient and all-order lift

Each of the three outer modules is an unordered pendant-arm pair times its
center-to-outer spine state.  The modules are themselves unordered.  This
gives 1,898,400 exact quotient keys, partitioned without a gap as:

- 540,274 all-short keys, of which 488,801 have order at least 27;
- 1,358,125 mixed all-order rays;
- one all-long ray.

The exact transfer/Newton reduction proves degree bounds `28,28,27,26` for
`Delta0,...,Delta3`.  The primary scan checked all 488,801 finite cells and 29
points on every rank-ray, totaling 157,542,616 rank-ray samples.  Every Newton
constant and first difference is positive, all higher coefficients through the
exact degree are nonnegative, and every coefficient above the degree vanishes.

## Independent literal audit

A separately compiled checked-`i256` engine rebuilt every literal tree and
deleted the center root.  It evaluated 41,232,581 literal trees, matched the
complete primary finite-value and Newton-coefficient streams, and checked an
unseen `S=29` value for each rank-ray (5,432,504 checks).

## Immutable evidence

- reduction source/report:  
  `506896627104396D4B3F32005ACEFB5BB657881D02C23A7D36FDFA6C40473AFA`  
  `C9D3226634BE0292040BBB9A7B69AED1E32B33BA638295FECE04A5671855DAEE`
- primary source/report:  
  `E00FFECD36A97593936AE8F281282C50495212AB55A84BCECE44F3DBD8D43046`  
  `0D9F29ACA9AD714C77841A91111A4542546E18190C6600EEBCA315EA8DC0508C`
- literal-audit Rust source/executable/raw result:  
  `6170C39488AD745EDFD426F7205717731D2CF00A16B5FC9E261E65290298D4E0`  
  `EC9EF44A3D2938DC12EAA1526E963CD24C85978C9882672B2ADFA43FDE1B809E`  
  `0EC1CA17FD4C3C2B6643150E99E1D44BEC2C8EBCEC3D378F7768F6ECAB3D195D`
- sealed independent-audit source/report:  
  `B770430596778F8D4E90E4FBEE42E4B096F303BDA2533D6605046018F4E694E7`  
  `8043EEBCE2D48F340AAC9D99FB9ABCB10004933209F588AFDC407008BC3534C5`

This theorem credits exactly `four_cubic_star:center_branch`; all other root
orbits remain separate.
