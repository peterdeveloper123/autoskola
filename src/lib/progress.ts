export type Attempt = { answers: Record<number, number>; cursor: number; elapsedMs: number; finished: 'answered' | 'timeout' | null }
export type Retry = { ids: number[]; answers: Record<number, number>; cursor: number; merged: boolean }
export type Progress = { version: 1; tests: Record<number, Attempt>; bank: Record<number, number>; bankCursor: number; retry: Retry | null }
export const STORAGE_KEY = 'autoskola.progress.v1'
export const emptyAttempt = (): Attempt => ({ answers: {}, cursor: 0, elapsedMs: 0, finished: null })
export const emptyProgress = (): Progress => ({ version: 1, tests: {}, bank: {}, bankCursor: 0, retry: null })
export function tickAttempt(a: Attempt, delta: number, limit: number): Attempt {
 if (a.finished) return a
 const elapsedMs = Math.min(limit, a.elapsedMs + Math.max(0, delta))
 return { ...a, elapsedMs, finished: elapsedMs >= limit ? 'timeout' : null }
}
export function answerAttempt(a: Attempt, position: number, answer: number, count: number): Attempt {
 if (a.finished || a.answers[position] !== undefined) return a
 const answers = { ...a.answers, [position]: answer }
 return { ...a, answers, finished: Object.keys(answers).length === count ? 'answered' : null }
}
export function readProgress(): Progress {
 const raw = localStorage.getItem(STORAGE_KEY)
 if (!raw) return emptyProgress()
 const p = JSON.parse(raw) as Progress
 const validAnswers = (value: unknown) => !!value && typeof value === 'object' && !Array.isArray(value)
  && Object.entries(value).every(([id, answer]) => /^\d+$/.test(id) && Number.isInteger(answer) && Number(answer) >= 0 && Number(answer) <= 2)
 if (!p || p.version !== 1 || !p.tests || typeof p.tests !== 'object' || Array.isArray(p.tests)
  || !validAnswers(p.bank) || !Number.isInteger(p.bankCursor) || p.bankCursor < 0) throw Error('Invalid progress')
 for (const [id, attempt] of Object.entries(p.tests)) {
  if (!/^\d+$/.test(id) || Number(id) < 1 || Number(id) > 100 || !attempt
   || !validAnswers(attempt.answers) || Object.keys(attempt.answers).some(position => Number(position) > 39)
   || !Number.isInteger(attempt.cursor) || attempt.cursor < 0 || attempt.cursor > 39
   || !Number.isFinite(attempt.elapsedMs) || attempt.elapsedMs < 0
   || ![null, 'answered', 'timeout'].includes(attempt.finished)) throw Error('Invalid saved test')
 }
 if (p.retry && (!Array.isArray(p.retry.ids) || !p.retry.ids.length || !p.retry.ids.every(Number.isInteger)
  || new Set(p.retry.ids).size !== p.retry.ids.length || !validAnswers(p.retry.answers)
  || !Number.isInteger(p.retry.cursor) || p.retry.cursor < 0 || typeof p.retry.merged !== 'boolean')) throw Error('Invalid retry')
 return p
}
