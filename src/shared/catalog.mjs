import { PARTS, SITES, fitsMachine, partById, siteOpenTo } from './parts.mjs';
import { grantsOf, switchMachine } from './machine.mjs';
import { digCoins } from './rewards.mjs';
import { jobMultiplier } from './jobs.mjs';
import { siteLevel, siteUnlocked } from './growth.mjs';

export const buyable = (part) => part.price != null && !part.workOnly;

/** A read-only candidate using the same loadout rules as actual equipment changes. */
export function previewEquipment(state, id) {
  const part = partById(id);
  if (!part || !fitsMachine(part, state.equipped.machine)) return null;
  if (state.equipped[part.slot] === id) return { ...state.equipped };
  if (part.slot !== 'machine') return { ...state.equipped, [part.slot]: id };
  const owned = [...new Set([...state.owned, id, ...grantsOf(id)])];
  return switchMachine({ ...state, owned }, id).equipped;
}

export function equipmentStats(equipped, durability = 100) {
  return { dig: digCoins(equipped), job: jobMultiplier(equipped),
    speed: (partById(equipped.tracks)?.stats?.speed ?? 1) * (durability < 30 ? 0.6 : 1) };
}

/** Sources derive from live rule tables, including whole-machine drops and bundled parts. */
export function partSources(part, machineId, state = { xp: 0, legacySites: [] }) {
  const sources = [];
  if (part.price === 0) sources.push({ kind: 'initial', id: part.id, name: '初始收藏', available: true, note: '建立存檔即擁有' });
  else if (buyable(part)) sources.push({ kind: 'shop', id: part.id, name: '車庫商店', available: fitsMachine(part, machineId), note: `${part.price} 金幣，購買後立即裝備` });
  if (part.slot !== 'machine') for (const machine of PARTS.filter((p) => p.machine)) {
    if (Object.values(machine.machine.defaults).includes(part.id)) {
      sources.push({ kind: 'machine', id: machine.id, name: machine.name, available: true, note: '取得此機型時附送（無需另購）' });
    }
  }
  for (const site of SITES) {
    const inPool = part.slot === 'machine' ? site.machineDrop?.pool.some(([id]) => id === part.id) : site.loot.some(([id]) => id === part.id);
    if (!inPool) continue;
    const usable = site.loot.filter(([id]) => fitsMachine(partById(id), machineId));
    const lootFits = part.slot === 'machine' || (usable.length ? usable : site.loot).some(([id]) => id === part.id);
    const open = siteOpenTo(site, machineId);
    const unlocked = siteUnlocked(state, site.id);
    sources.push({ kind: 'site', id: site.id, name: site.name, available: unlocked && open && lootFits,
      note: `${site.minutes} 分鐘 · ${!unlocked ? `Lv.${siteLevel(site.id)} 解鎖 · ` : ''}${!open ? '目前機型不能進入' : !lootFits ? '需改用適配機型才有機會掉落此零件' : part.slot === 'machine' ? '有機會帶回未擁有機型' : '有機會掉落，非保證獲得'}` });
  }
  return sources;
}

export function catalogParts(state, { slot, query = '', filter = 'all', compatibleOnly = false }) {
  const text = query.trim().toLocaleLowerCase();
  return PARTS.filter((p) => p.slot === slot && (!text || `${p.name} ${p.desc ?? ''}`.toLocaleLowerCase().includes(text)) &&
    (!compatibleOnly || fitsMachine(p, state.equipped.machine)) &&
    (filter === 'all' || filter === 'owned' && state.owned.includes(p.id) || filter === 'missing' && !state.owned.includes(p.id) ||
      filter === 'shop' && buyable(p) && !state.owned.includes(p.id) || filter === 'work' && !buyable(p)));
}
