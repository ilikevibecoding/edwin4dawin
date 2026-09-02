// Exact connected alpha=11 boundary census for rank seven, orders 21 and 22.
//
// The generator, independence-polynomial recursion, independence-number
// recursion, and V7 arithmetic are imported verbatim from the independently
// checked medium-order all-tree verifier.  This small driver restricts the
// audit to the only two connected orders not recorded explicitly in the
// earlier alpha=11 boundary certificate.

mod engine {
    include!("verify_forest_v7_medium_trees.rs");

    pub fn verify_alpha11_order(
        order: usize,
        expected_trees: u64,
        expected_alpha11: u64,
        expected_minimum: i128,
    ) {
        let mut layout: Option<Vec<usize>> = Some(
            (0..=(order / 2)).chain(1..((order + 1) / 2)).collect(),
        );
        let mut tree_count = 0u64;
        let mut alpha11_count = 0u64;
        let mut negative_count = 0u64;
        let mut minimum: Option<i128> = None;
        let mut witness_layout = Vec::new();
        let mut witness_polynomial = [0i128; 8];

        while let Some(candidate) = layout {
            layout = next_tree(&candidate);
            if let Some(valid_layout) = layout.clone() {
                let item = item_from_layout(&valid_layout);
                tree_count += 1;
                if item.alpha == 11 {
                    alpha11_count += 1;
                    let value = v7(item.polynomial);
                    if value < 0 {
                        negative_count += 1;
                    }
                    if minimum.is_none() || value < minimum.unwrap() {
                        minimum = Some(value);
                        witness_layout = valid_layout.clone();
                        witness_polynomial = item.polynomial;
                    }
                }
                layout = next_rooted_tree_clean(&valid_layout, None);
            }
        }

        assert_eq!(tree_count, expected_trees);
        assert_eq!(alpha11_count, expected_alpha11);
        assert_eq!(negative_count, 0);
        assert_eq!(minimum.unwrap(), expected_minimum);
        println!(
            "order={order} trees={tree_count} alpha11={alpha11_count} \
             negative={negative_count} minimum={expected_minimum} \
             witness_layout={witness_layout:?} \
             witness_polynomial={witness_polynomial:?}"
        );
    }
}

fn main() {
    // Every order-21 or order-22 tree has alpha at least 11 by bipartiteness.
    // The alpha=11 counts also equal total_trees - alpha_at_least_12 from the
    // independent medium-order verifier: 136882 and 54564 respectively.
    engine::verify_alpha11_order(21, 2_144_505, 136_882, 9_837_828);
    engine::verify_alpha11_order(22, 5_623_756, 54_564, 218_312_640);
    println!("PASS_EXACT_CONNECTED_ALPHA11_V7_ORDERS21_22");
}
