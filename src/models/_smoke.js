/** Smoke test for the brick kit + preview harness. */
import { brick, plate, tile, slope, cyl, cone, sphere, wedge, prism, at, rot, group, C, BRICK, PLATE } from '../lego/bricks.js';

export function stack() {
  const g = group();
  g.add(at(brick(6, 4, BRICK, { color: C.red }), 0, 0, 0));
  g.add(at(brick(4, 2, BRICK, { color: C.yellow }), 0, BRICK, 0));
  g.add(at(plate(8, 6, { color: C.blue }), 0, BRICK * 2, 0));
  g.add(at(tile(2, 2, PLATE, { color: C.white }), -2, BRICK * 2 + PLATE, 0));
  g.add(at(slope(2, 2, BRICK, 0, { color: C.green }), 2, BRICK * 2 + PLATE, 0));
  g.add(at(cyl(0.9, BRICK, { color: C.orange, studs: true }), 0, BRICK * 2 + PLATE, -2));
  g.add(at(cone(0.9, 0.2, BRICK * 1.5, { color: C.tan }), 0, BRICK * 2 + PLATE, 2));
  g.add(at(sphere(0.7, { color: C.azure }), 3, BRICK * 2 + PLATE, 2));
  g.add(at(wedge(4, 4, PLATE, { color: C.black }), -4, BRICK * 2 + PLATE, 0));
  g.add(at(prism([[-1, -3], [1, -3], [2, 3], [-2, 3]], BRICK, { color: C.purple }), 5, 0, 0));
  return g;
}
