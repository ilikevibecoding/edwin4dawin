// Root-side extension of the checked cubic e=3 engine from Delta0/Delta1
// to all four still-live connected residual ranks Delta0..Delta3.
//
// The included agent core owns the literal tree DP and checked signed-i256
// residual arithmetic.  This wrapper deliberately leaves that implementation
// untouched and adds only the two further forward differences in the sibling
// parameter.

include!("rank8_delta01_e3_cubic_exact_i256_core_agent.rs");

fn deltas03(c: &V, h: &V) -> [Z; 4] {
    let r1 = residual(c, h, 1);
    let r2 = residual(c, h, 2);
    let r3 = residual(c, h, 3);
    let r4 = residual(c, h, 4);
    [
        r1,
        r2.sub(r1),
        r3.sub(r2).sub(r2).add(r1),
        r4.sub(r3).sub(r3).sub(r3).add(r2).add(r2).add(r2).sub(r1),
    ]
}

pub fn evaluate03(root: &str, values: &[i32]) -> [Z; 4] {
    let r = parse_root(root);
    let mut l = match r {
        Root::OuterBranch | Root::OuterLeaf => L {
            a1: values[0], a2: values[1], m: values[2], b1: values[3],
            b2: values[4], u: values[5], v: values[6], ..Default::default()
        },
        Root::MiddleBranch | Root::MiddleLeaf => L {
            m: values[0], a1: values[1], a2: values[2], b1: values[3],
            b2: values[4], u: values[5], v: values[6], ..Default::default()
        },
        Root::OuterPendant => L {
            near: values[0], tail: values[1], a2: values[2], m: values[3],
            b1: values[4], b2: values[5], u: values[6], v: values[7],
            ..Default::default()
        },
        Root::MiddlePendant => L {
            near: values[0], tail: values[1], a1: values[2], a2: values[3],
            b1: values[4], b2: values[5], u: values[6], v: values[7],
            ..Default::default()
        },
        Root::Spine => L {
            near: values[0], tail: values[1], a1: values[2], a2: values[3],
            m: values[4], b1: values[5], b2: values[6], v: values[7],
            ..Default::default()
        },
    };
    let h = match r {
        Root::OuterBranch => deleted_outer_branch(&l),
        Root::MiddleBranch => deleted_middle_branch(&l),
        Root::OuterLeaf => deleted_outer_leaf(&l),
        Root::MiddleLeaf => deleted_middle_leaf(&l),
        Root::OuterPendant => {
            l.a1 = l.near + l.tail + 1;
            deleted_outer_pendant_internal(&l)
        },
        Root::MiddlePendant => {
            l.m = l.near + l.tail + 1;
            deleted_middle_pendant_internal(&l)
        },
        Root::Spine => {
            l.u = l.near + l.tail + 2;
            deleted_spine_internal(&l)
        },
    };
    deltas03(&core(&l), &h)
}
