// =============================================================================
//  @tmcut/core — history
//  Command-pattern undo/redo over plain timeline snapshots (docs §19).
//  Commands are serializable data ({ name, label, before, after }), so the
//  same log can drive UI undo, AI rollback and crash recovery (docs §50).
// =============================================================================

function clone(value) {
  return structuredClone(value)
}

/**
 * Create a bounded undo/redo stack.
 * `commit(command)` records a completed mutation; `undo()` / `redo()`
 * return the timeline state to restore (or null when the stack is empty).
 */
export function createHistory(limit = 50) {
  const past = []
  const future = []
  const cap = Math.max(1, Math.floor(limit) || 50)

  return {
    get canUndo() {
      return past.length > 0
    },
    get canRedo() {
      return future.length > 0
    },
    get depth() {
      return past.length
    },
    commit(command) {
      if (!command || !command.before || !command.after) {
        throw new Error('history.commit requires { name, before, after }')
      }
      past.push({
        name: command.name ?? 'custom',
        label: command.label ?? command.name ?? 'custom',
        before: clone(command.before),
        after: clone(command.after),
        createdAt: new Date().toISOString()
      })
      if (past.length > cap) past.shift()
      future.length = 0
    },
    undo() {
      if (past.length === 0) return null
      const command = past.pop()
      future.push(command)
      return clone(command.before)
    },
    redo() {
      if (future.length === 0) return null
      const command = future.pop()
      past.push(command)
      return clone(command.after)
    },
    clear() {
      past.length = 0
      future.length = 0
    }
  }
}
