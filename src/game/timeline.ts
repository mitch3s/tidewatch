import { BIOMES } from '../data/biomes';
import { type MomentDef } from '../data/moments';
import { BIOME_RULES } from '../data/progression';
import type { BiomeId, Species } from '../data/types';
import type { SaveState } from '../save/schema';

export type TimelineKind = 'start' | 'tank' | 'arrived' | 'caught' | 'sighted' | 'moment';

/** One thing that happened, for the codex's timeline (spec v1.4 §4). */
export interface TimelineEntry {
  /** ISO timestamp. */
  at: string;
  kind: TimelineKind;
  title: string;
  /** Where, or with whom. */
  detail: string;
}

/**
 * Everything that happened, newest first, rebuilt from the save: when each
 * fish was collected, when rare visitors were missed (saved from v1.4 on),
 * when moments were witnessed. A tank's discovery is when its starter fish
 * arrived.
 */
export function buildTimeline(state: SaveState, roster: readonly Species[], moments: readonly MomentDef[]): TimelineEntry[] {
  const out: TimelineEntry[] = [];
  const name = (id: string) => roster.find((s) => s.id === id)?.commonName ?? id;
  const tankName = (b: BiomeId) => BIOMES[b].name;
  const starters = new Set<string>();

  for (const rule of BIOME_RULES) {
    if (!state.unlockedBiomes.includes(rule.biome)) continue;
    rule.starters.forEach((id) => starters.add(id));
    const dates = rule.starters.map((id) => state.species[id]?.collectedAt).filter((d): d is string => !!d);
    if (!dates.length) continue;
    const with_ = rule.starters.map(name).join(' and ');
    out.push({
      at: dates.sort()[0]!,
      kind: rule.requires === null ? 'start' : 'tank',
      title: rule.requires === null ? `Your first tank: ${tankName(rule.biome)}` : `New tank discovered: ${tankName(rule.biome)}`,
      detail: `With the ${with_}`,
    });
  }

  for (const s of roster) {
    const p = state.species[s.id];
    if (!p) continue;
    if (p.sightedAt) out.push({ at: p.sightedAt, kind: 'sighted', title: `${article(s.commonName)} ${s.commonName} swam by`, detail: tankName(s.biome) });
    if (p.state !== 'collected' || !p.collectedAt || starters.has(s.id)) continue;
    out.push(
      s.rarity === 'rare'
        ? { at: p.collectedAt, kind: 'caught', title: `Caught ${lower(article(s.commonName))} ${s.commonName}`, detail: tankName(s.biome) }
        : { at: p.collectedAt, kind: 'arrived', title: `${article(s.commonName)} ${s.commonName} settled in`, detail: tankName(s.biome) },
    );
  }

  for (const m of moments) {
    const w = state.moments[m.id];
    if (!w) continue;
    out.push({ at: w.witnessedAt, kind: 'moment', title: `Saw: ${m.name}`, detail: m.speciesId ? `${name(m.speciesId)} · ${tankName(m.biome)}` : tankName(m.biome) });
  }

  // Newest first; at the same moment, keep a sensible order (a tank before its fish).
  const order: TimelineKind[] = ['moment', 'caught', 'arrived', 'sighted', 'tank', 'start'];
  return out.sort((a, b) => (a.at === b.at ? order.indexOf(a.kind) - order.indexOf(b.kind) : a.at < b.at ? 1 : -1));
}

function article(name: string): string {
  return /^[aeiou]/i.test(name) ? 'An' : 'A';
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
