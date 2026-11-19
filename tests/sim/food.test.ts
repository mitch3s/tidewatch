import { describe, expect, it } from 'vitest';
import { speciesIn } from '../../src/data/species';
import { FEED_COOLDOWN_S, Food, FLAKE_REST_S } from '../../src/sim/food';
import { Tank } from '../../src/sim/tank';
import { createRng } from '../../src/util/rng';

const env = {
  bounds: { left: 60, right: 1860, top: 90, bottom: 875 },
  home: { x: 1150, y: 830 },
};

function step(tank: Tank, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) tank.update(1 / 60);
}

describe('Food', () => {
  it('drops flakes that sink to the floor and then fade away', () => {
    const food = new Food(800, createRng(1));
    expect(food.drop(500)).toBe(true);
    expect(food.flakes.length).toBeGreaterThan(5);
    for (let i = 0; i < 60 * 40; i++) food.update(1 / 60);
    expect(food.flakes.every((f) => f.landed && f.y === 800)).toBe(true);
    for (let i = 0; i < 60 * (FLAKE_REST_S + 1); i++) food.update(1 / 60);
    expect(food.flakes).toHaveLength(0);
  });

  it('ignores drops during the cooldown', () => {
    const food = new Food(800, createRng(1));
    food.drop(500);
    const n = food.flakes.length;
    expect(food.drop(900)).toBe(false);
    expect(food.flakes).toHaveLength(n);
    for (let i = 0; i < 60 * (FEED_COOLDOWN_S + 0.1); i++) food.update(1 / 60);
    expect(food.drop(900)).toBe(true);
  });
});

describe('feeding the tank', () => {
  it('fish go for the food and eat most of it', () => {
    const tank = new Tank(env, speciesIn('reef'), 7);
    step(tank, 3);
    tank.feed(960);
    const dropped = tank.food.flakes.length;
    step(tank, 4);
    expect(tank.agents.some((a) => a.feeding)).toBe(true);
    step(tank, 30);
    const left = tank.food.flakes.filter((f) => !f.landed).length;
    expect(left).toBeLessThan(dropped / 2);
  });

  it('every fish stays inside the tank while feeding', () => {
    const tank = new Tank(env, speciesIn('amazon'), 3);
    tank.feed(300);
    for (let i = 0; i < 60 * 20; i++) {
      tank.update(1 / 60);
      for (const a of tank.agents) {
        expect(a.pos.x).toBeGreaterThan(env.bounds.left - 200);
        expect(a.pos.x).toBeLessThan(env.bounds.right + 200);
        expect(a.pos.y).toBeGreaterThan(env.bounds.top - 120);
        expect(a.pos.y).toBeLessThan(env.bounds.bottom + 120);
      }
    }
  });
});

describe('night rest', () => {
  const avgSpeed = (activity: number) => {
    const tank = new Tank(env, speciesIn('reef'), 11);
    tank.activity = activity;
    step(tank, 10);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < 60 * 20; i++) {
      tank.update(1 / 60);
      for (const a of tank.agents) {
        sum += Math.hypot(a.vel.x, a.vel.y) / a.length;
        n++;
      }
    }
    return sum / n;
  };

  it('fish swim more slowly at night', () => {
    expect(avgSpeed(0.35)).toBeLessThan(avgSpeed(1) * 0.8);
  });
});

describe('fish that stay home', () => {
  it('clownfish stay near the anemone when food falls far away', () => {
    const tank = new Tank(env, speciesIn('reef'), 5);
    const clowns = () => tank.agents.filter((a) => a.species.id === 'ocellaris-clownfish');
    expect(clowns().length).toBeGreaterThan(0);
    tank.feed(300);
    for (let i = 0; i < 60 * 15; i++) {
      tank.update(1 / 60);
      for (const c of clowns()) expect(Math.hypot(c.pos.x - env.home.x, c.pos.y - env.home.y)).toBeLessThan(600);
    }
  });
});
