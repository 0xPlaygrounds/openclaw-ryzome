import { describe, it, expect } from 'vitest';
import {
  computeLayout,
  estimateNodeHeight,
  NODE_WIDTH,
  BASE_NODE_HEIGHT,
  type LayoutNode,
} from '../layout.js';

const NODE_GAP_X = 80;
const NODE_GAP_Y = 60;

describe('computeLayout', () => {
  it('should center a single node horizontally at x = -NODE_WIDTH/2', () => {
    const nodes: LayoutNode[] = [{ id: 'a', depth: 0 }];
    const positions = computeLayout(nodes);

    const pos = positions.get('a');
    expect(pos).toBeDefined();
    // 1 node: totalWidth = NODE_WIDTH, startX = -NODE_WIDTH/2
    expect(pos!.x).toBe(-NODE_WIDTH / 2);
    expect(pos!.y).toBe(0);
  });

  it('should spread two nodes at the same depth horizontally, centered around x=0', () => {
    const nodes: LayoutNode[] = [
      { id: 'a', depth: 0 },
      { id: 'b', depth: 0 },
    ];
    const positions = computeLayout(nodes);

    const a = positions.get('a')!;
    const b = positions.get('b')!;

    expect(a.y).toBe(0);
    expect(b.y).toBe(0);
    // 2 nodes: totalWidth = 2*NODE_WIDTH + NODE_GAP_X, startX = -totalWidth/2
    const totalWidth = 2 * NODE_WIDTH + NODE_GAP_X;
    expect(a.x).toBe(-totalWidth / 2);
    expect(b.x).toBe(-totalWidth / 2 + NODE_WIDTH + NODE_GAP_X);
    // Verify they're symmetric around center
    expect(a.x + b.x + NODE_WIDTH).toBe(0);
  });

  it('should stack depth levels vertically by BASE_NODE_HEIGHT + NODE_GAP_Y', () => {
    const nodes: LayoutNode[] = [
      { id: 'a', depth: 0 },
      { id: 'b', depth: 1 },
      { id: 'c', depth: 2 },
    ];
    const positions = computeLayout(nodes);

    const yStep = BASE_NODE_HEIGHT + NODE_GAP_Y;
    expect(positions.get('a')!.y).toBe(0);
    expect(positions.get('b')!.y).toBe(yStep);
    expect(positions.get('c')!.y).toBe(2 * yStep);
  });

  it('should handle gaps in depth levels', () => {
    // depth 0 has a node, depth 1 is empty, depth 2 has a node
    const nodes: LayoutNode[] = [
      { id: 'a', depth: 0 },
      { id: 'b', depth: 2 },
    ];
    const positions = computeLayout(nodes);

    const yStep = BASE_NODE_HEIGHT + NODE_GAP_Y;
    expect(positions.get('a')!.y).toBe(0);
    // depth 1 is empty but still occupies vertical space
    expect(positions.get('b')!.y).toBe(2 * yStep);
  });

  it('should return a position for every input node', () => {
    const nodes: LayoutNode[] = [
      { id: 'a', depth: 0 },
      { id: 'b', depth: 0 },
      { id: 'c', depth: 1 },
      { id: 'd', depth: 2 },
    ];
    const positions = computeLayout(nodes);

    expect(positions.size).toBe(4);
    for (const node of nodes) {
      expect(positions.has(node.id)).toBe(true);
    }
  });
});

describe('estimateNodeHeight', () => {
  it('should return at least BASE_NODE_HEIGHT for short descriptions', () => {
    expect(estimateNodeHeight('Hi')).toBeGreaterThanOrEqual(BASE_NODE_HEIGHT);
    expect(estimateNodeHeight('')).toBeGreaterThanOrEqual(BASE_NODE_HEIGHT);
  });

  it('should return exactly BASE_NODE_HEIGHT for empty or very short text', () => {
    // With 0 chars, lineCount = ceil(0/40) = 0, height = max(180, 180 + 0) = 180
    expect(estimateNodeHeight('')).toBe(BASE_NODE_HEIGHT);
  });

  it('should scale height with description length', () => {
    const short = estimateNodeHeight('Hello');
    const long = estimateNodeHeight('A'.repeat(500));

    expect(long).toBeGreaterThan(short);
  });

  it('should always return a positive number', () => {
    expect(estimateNodeHeight('test')).toBeGreaterThan(0);
    expect(estimateNodeHeight('A'.repeat(10000))).toBeGreaterThan(0);
  });
});
