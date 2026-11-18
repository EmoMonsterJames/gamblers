// 💼 Player jobs: a managed list (admin → 플레이어 관리 → 💼 직업 관리), kept in settings "maps".jobs.
// Until an admin edits it, the list is every job the players already have.
import { Store } from "../core/store.js";
export function jobList() {
    const saved = Store.maps?.jobs;
    if (Array.isArray(saved) && saved.length) return [...saved];
    return [...new Set((Store.allPlayers || []).map(p => (p.job || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
export async function saveJobs(list) {
    const clean = [...new Set(list.map(s => String(s).trim()).filter(Boolean))];
    await Store.saveMaps({ ...(Store.maps || {}), jobs: clean });
    return clean;
}
