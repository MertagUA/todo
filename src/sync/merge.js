/**
 * Merging two devices without a server-side conflict resolver.
 *
 * Every row carries `updatedAt`, every delete leaves a tombstone, so the rule is
 * simply "newest write wins, and a delete counts as a write". Two phones editing
 * different tasks therefore keep both edits; editing the same task keeps the
 * later one.
 */

const COLLECTIONS = ['projects', 'tasks', 'events']

function stamp(entity) {
  return entity?.updatedAt ?? entity?.createdAt ?? 0
}

function mergeTombstones(a = {}, b = {}) {
  const out = { ...a }
  for (const [id, ts] of Object.entries(b)) {
    if (!out[id] || ts > out[id]) out[id] = ts
  }
  return out
}

function mergeCollection(localRows = [], remoteRows = [], tombstones) {
  const byId = new Map()
  for (const row of [...localRows, ...remoteRows]) {
    if (!row?.id) continue
    const kept = byId.get(row.id)
    if (!kept || stamp(row) > stamp(kept)) byId.set(row.id, row)
  }
  return [...byId.values()].filter((row) => {
    const deletedAt = tombstones[row.id]
    return !deletedAt || stamp(row) > deletedAt
  })
}

export function mergeSnapshots(local = {}, remote = {}) {
  const tombstones = mergeTombstones(local.tombstones, remote.tombstones)
  const merged = { tombstones }
  for (const key of COLLECTIONS) {
    merged[key] = mergeCollection(local[key], remote[key], tombstones)
  }
  return merged
}

/** Cheap equality check so we do not upload an unchanged snapshot. */
export function snapshotSignature(snapshot = {}) {
  const parts = []
  for (const key of COLLECTIONS) {
    for (const row of snapshot[key] || []) parts.push(`${row.id}:${stamp(row)}`)
  }
  for (const [id, ts] of Object.entries(snapshot.tombstones || {})) parts.push(`x${id}:${ts}`)
  return parts.sort().join('|')
}
