import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Collapse, CssBaseline, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, MenuItem, Paper, Select, Stack, Tab, Tabs, ThemeProvider, Typography } from '@mui/material'
import { getQuestionImageUrl, questions, tests } from './assets/minv'
import type { Question } from './assets/minv'
import { answerAttempt, emptyAttempt, emptyProgress, readProgress, STORAGE_KEY, tickAttempt } from './lib/progress'
import type { Progress } from './lib/progress'
import { theme } from './theme'
import './App.css'

type View = 'tests' | 'test' | 'questions' | 'retry'
type Filter = 'all' | 'unanswered' | 'correct' | 'wrong'
const byId = new Map(questions.map(q => [q.id, q]))
const percent = (n: number, total: number) => total ? Math.round(n / total * 100) : 0
const clock = (ms: number) => { const s = Math.ceil(Math.max(0, ms) / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }

function QuestionCard({ q, selected, reveal, answer }: { q: Question; selected?: number; reveal: boolean; answer?: (i: number) => void }) {
  const image = getQuestionImageUrl(q)
  return <Paper component="article" variant="outlined" className="question-card">
    <Typography component="h2" variant="h2">{q.text}</Typography>
    {image && <Box className="question-image"><img src={image} alt="Dopravná značka alebo situácia k otázke" /></Box>}
    <Stack spacing={2} className="answers">
      {q.answers.map((text, i) => {
        const right = reveal && i === q.correctAnswerIndex
        const wrong = reveal && selected === i && !right
        return <Button variant="outlined" key={i} className={`answer ${right ? 'right' : ''} ${wrong ? 'wrong' : ''}`}
          disabled={!answer || selected !== undefined} onClick={() => answer?.(i)}>
          <span className="answer-letter">{'ABC'[i]}</span>
          <span className="answer-text">{text}</span>
          {right && <span className="answer-mark" aria-label="Správna odpoveď">✓</span>}
          {wrong && <span className="answer-mark" aria-label="Nesprávna odpoveď">×</span>}
        </Button>
      })}
    </Stack>
    {reveal && selected !== undefined && <Alert icon={false} className="feedback" severity={selected === q.correctAnswerIndex ? 'success' : 'error'} role="status">
      {selected === q.correctAnswerIndex ? 'Správna odpoveď.' : `Nesprávne. Správna odpoveď: ${'ABC'[q.correctAnswerIndex]}.`}
    </Alert>}
  </Paper>
}
function App() {
 const [loaded] = useState(() => {
  try { return { progress: readProgress(), error: '' } }
  catch { return { progress: emptyProgress(), error: 'Uložený pokrok sa nepodarilo načítať. Úložisko môže byť nedostupné alebo obsahovať poškodené dáta.' } }
 })
 const [storageError, setStorageError] = useState(loaded.error)
 const [progress, setProgress] = useState<Progress>(loaded.progress)
 const stateRef = useRef(progress)
 const [view, setView] = useState<View>('tests'), [testId, setTestId] = useState(1)
 const [filter, setFilter] = useState<Filter>('all'), [reviewCursor, setReviewCursor] = useState(0)
 const [testFilter, setTestFilter] = useState('all'), [gridOpen, setGridOpen] = useState(false)
 const [confirm, setConfirm] = useState<'bank' | 'test' | 'retry' | null>(null), [notice, setNotice] = useState('')
 const timer = useRef<{ id: number; last: number } | null>(null)
 const advanceTimer = useRef<number | null>(null)
 const [transitioning, setTransitioning] = useState(false)
 function cancelAdvance() {
  if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
  advanceTimer.current = null
  setTransitioning(false)
 }
 useEffect(() => {
  const pauseAdvance = () => { if (document.visibilityState === 'hidden') cancelAdvance() }
  document.addEventListener('visibilitychange', pauseAdvance)
  return () => {
   document.removeEventListener('visibilitychange', pauseAdvance)
   if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
  }
 }, [])
 function commit(update: (p: Progress) => Progress) {
 const next = update(stateRef.current); stateRef.current = next; setProgress(next)
 try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStorageError('') } catch { setStorageError('Ukladanie nie je dostupné. Pokrok zostáva iba v tejto otvorenej stránke. Skontroluj nastavenia alebo miesto v prehliadači.') }
 }
 function flush() {
 const t = timer.current; if (!t) return
 const now = performance.now(), delta = now - t.last; t.last = now
 const source = tests.find(x => x.id === t.id)!
 if (stateRef.current.tests[t.id]?.finished) return
 commit(p => ({ ...p, tests: { ...p.tests, [t.id]: tickAttempt(p.tests[t.id] ?? emptyAttempt(), delta, source.timeLimitSeconds * 1000) } }))
 }
 useEffect(() => {
 if (view !== 'test') return
 const start = () => { if (document.visibilityState === 'visible') timer.current = { id: testId, last: performance.now() } }
 const pause = () => { flush(); timer.current = null }
 const visibility = () => { if (document.visibilityState === 'hidden') pause(); else start() }
 start(); const interval = window.setInterval(flush, 250)
 document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', pause); window.addEventListener('pageshow', start)
 return () => { pause(); clearInterval(interval); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pause); window.removeEventListener('pageshow', start) }
 }, [view, testId])
 function navigate(next: View) { cancelAdvance(); flush(); timer.current = null; setView(next); setGridOpen(false); setNotice('') }
 function openTest(id: number) { cancelAdvance(); flush(); timer.current = null; commit(p => ({ ...p, tests: { ...p.tests, [id]: p.tests[id] ?? emptyAttempt() } })); setTestId(id); setView('test'); setGridOpen(false) }
 const test = tests.find(t => t.id === testId)!, attempt = progress.tests[testId] ?? emptyAttempt()
 const correct = questions.filter(q => progress.bank[q.id] === q.correctAnswerIndex)
 const wrong = questions.filter(q => progress.bank[q.id] !== undefined && progress.bank[q.id] !== q.correctAnswerIndex)
 const answeredCount = correct.length + wrong.length
 const filtered = filter === 'correct' ? correct : filter === 'wrong' ? wrong : filter === 'unanswered' ? questions.filter(q => progress.bank[q.id] === undefined) : questions
 const retry = progress.retry, retryQs = (retry?.ids ?? []).map(id => byId.get(id)).filter((q): q is Question => !!q)
 const retryDone = !!retry && !!retryQs.length && retryQs.every(q => retry.answers[q.id] !== undefined)
 const retryCorrect = retryQs.filter(q => retry?.answers[q.id] === q.correctAnswerIndex)
 const active = view === 'test' ? test.questions : view === 'retry' ? retryQs : filtered
 const cursor = view === 'test' ? attempt.cursor : view === 'retry' ? retry?.cursor ?? 0 : filter === 'all' ? progress.bankCursor : reviewCursor
 const index = Math.min(cursor, Math.max(0, active.length - 1)), q = active[index]
 const selection = (question: Question, i: number) => view === 'test' ? attempt.answers[i] : view === 'retry' ? retry?.answers[question.id] : progress.bank[question.id]
 const selected = q ? selection(q, index) : undefined
 const finished = view === 'test' ? !!attempt.finished : view === 'retry' ? retryDone : false
 const answered = view === 'test' ? Object.keys(attempt.answers).length : view === 'retry' ? retryQs.filter(q => retry?.answers[q.id] !== undefined).length : answeredCount
 const points = test.questions.reduce((sum, q, i) => sum + (attempt.answers[i] === q.correctAnswerIndex ? q.points : 0), 0)
 const testCorrect = test.questions.filter((q, i) => attempt.answers[i] === q.correctAnswerIndex).length
 function move(i: number) { cancelAdvance(); setGridOpen(false); if (view === 'test') commit(p => ({ ...p, tests: { ...p.tests, [testId]: { ...p.tests[testId], cursor: i } } })); else if (view === 'retry') commit(p => ({ ...p, retry: p.retry ? { ...p.retry, cursor: i } : null })); else if (filter === 'all') commit(p => ({ ...p, bankCursor: i })); else setReviewCursor(i) }
 function answer(i: number) {
 if (!q) return
 if (view === 'test') { flush(); commit(p => ({ ...p, tests: { ...p.tests, [testId]: answerAttempt(p.tests[testId], index, i, test.questionCount) } })) }
 else if (view === 'retry') commit(p => ({ ...p, retry: p.retry && p.retry.answers[q.id] === undefined ? { ...p.retry, answers: { ...p.retry.answers, [q.id]: i } } : p.retry }))
 else commit(p => ({ ...p, bank: p.bank[q.id] === undefined ? { ...p.bank, [q.id]: i } : p.bank }))
 // Schedule only from a fresh answer, never from a restored or reviewed answer.
 const nowFinished = view === 'test' ? !!stateRef.current.tests[testId].finished
  : view === 'retry' ? retryQs.every(question => stateRef.current.retry?.answers[question.id] !== undefined) : false
 if (i !== q.correctAnswerIndex || selected !== undefined || nowFinished || index >= active.length - 1
  || (view === 'questions' && filter !== 'all')) return
 cancelAdvance()
 advanceTimer.current = window.setTimeout(() => {
  if (view === 'test' && stateRef.current.tests[testId].finished) { cancelAdvance(); return }
  setTransitioning(true)
  advanceTimer.current = window.setTimeout(() => {
   if (view === 'test' && stateRef.current.tests[testId].finished) { cancelAdvance(); return }
   move(index + 1)
  }, 180)
 }, 1000)
 }
 function createRetry() { commit(p => ({ ...p, retry: { ids: filtered.map(q => q.id), answers: {}, cursor: 0, merged: false } })); navigate('retry') }
 function startRetry() { if (!filtered.length) return; if (retry && !retryDone) setConfirm('retry'); else createRetry() }
 function resetConfirmed() {
 cancelAdvance()
 if (confirm === 'test') { flush(); commit(p => ({ ...p, tests: { ...p.tests, [testId]: emptyAttempt() } })) }
 else if (confirm === 'bank') { commit(p => ({ ...p, bank: {}, bankCursor: 0, retry: null })); setFilter('all'); setReviewCursor(0); navigate('questions') }
 else createRetry(); setConfirm(null)
 }
 function mergeRetry() { commit(p => { const bank = { ...p.bank }; for (const q of retryCorrect) bank[q.id] = q.correctAnswerIndex; return { ...p, bank, retry: p.retry ? { ...p.retry, merged: true } : null } }); setNotice('Otázky boli presunuté medzi správne.') }
 function nextUnanswered() { for (let n = 1; n <= active.length; n++) { const i = (index + n) % active.length; if (selection(active[i], i) === undefined) { move(i); return } } }
 const visibleTests = tests.filter(t => testFilter === 'all' || (testFilter === 'started' ? progress.tests[t.id] && !progress.tests[t.id].finished : testFilter === 'done' ? progress.tests[t.id]?.finished : !progress.tests[t.id]))
 const reviewing = view === 'questions' && (filter === 'correct' || filter === 'wrong')
 return <ThemeProvider theme={theme}><CssBaseline />
  <Box className="simple-app">
   <header className="app-header"><Typography component="span" sx={{ fontWeight: 700, fontSize: 22 }}>Autoškola</Typography></header>
   <Box component="nav" aria-label="Režim učenia" className="main-nav">
    <Tabs value={view === 'tests' || view === 'test' ? 'tests' : 'questions'} onChange={(_, next: 'tests' | 'questions') => navigate(next)} variant="fullWidth" aria-label="Režim učenia">
     <Tab value="tests" label="Testy" id="tab-tests" aria-controls="learning-panel" />
     <Tab value="questions" label="Otázky" id="tab-questions" aria-controls="learning-panel" />
    </Tabs>
   </Box>
   <main id="learning-panel" role="tabpanel" aria-labelledby={view === 'tests' || view === 'test' ? 'tab-tests' : 'tab-questions'}>
    {storageError && <Alert severity="warning" sx={{ mb: 2 }}>{storageError}</Alert>}
    {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
    {view === 'tests' ? <>
     <Box className="list-heading"><Typography component="h1" variant="h1">Vyber test</Typography>
      <Select value={testFilter} onChange={e => setTestFilter(e.target.value)} size="small" inputProps={{ 'aria-label': 'Filtrovať testy' }}>
       <MenuItem value="all">Všetky</MenuItem><MenuItem value="started">Rozpracované</MenuItem><MenuItem value="done">Dokončené</MenuItem><MenuItem value="new">Nezačaté</MenuItem>
      </Select>
     </Box>
     <Box className="test-grid">{visibleTests.map(t => {
      const a = progress.tests[t.id], count = Object.keys(a?.answers ?? {}).length
      const correctCount = t.questions.filter((q, i) => a?.answers[i] === q.correctAnswerIndex).length
      return <Button variant="outlined" key={t.id} className={`test-tile ${a?.finished ? 'completed' : a ? 'started' : ''}`}
       aria-label={`Test ${t.id}, ${a?.finished ? 'dokončený' : a ? 'rozpracovaný' : 'nezačatý'}`} onClick={() => openTest(t.id)}>
       <span className="test-number">{t.id}</span><span className="test-status">{a?.finished ? `✓ ${percent(correctCount, 40)} %` : a ? `${count}/40` : '\u00a0'}</span>
      </Button>
     })}</Box>
     {!visibleTests.length && <Typography color="text.secondary" sx={{ py: 4 }}>Žiadne testy.</Typography>}
    </> : <>
     <Box className="study-header">
      {view !== 'questions' && <Button variant="text" className="back" onClick={() => navigate(view === 'test' ? 'tests' : 'questions')}>← Späť</Button>}
      <Typography component="h1" variant="h1">{view === 'test' ? `Test ${testId}` : view === 'retry' ? 'Opakovanie' : 'Otázky'}</Typography>
      {view === 'test' && <Typography className="timer" aria-label="Zostávajúci čas" color={test.timeLimitSeconds * 1000 - attempt.elapsedMs < 60000 ? 'error' : 'text.primary'}>{clock(test.timeLimitSeconds * 1000 - attempt.elapsedMs)}</Typography>}
      <Button className="reset" color="inherit" onClick={() => { cancelAdvance(); setConfirm(view === 'test' ? 'test' : 'bank') }}>Reset</Button>
     </Box>
     {view === 'questions' && <Box className="bank-tabs" role="group" aria-label="Filter otázok">{([['all', 'Všetky', questions.length], ['unanswered', 'Nezodpovedané', questions.length - answeredCount], ['correct', 'Správne', correct.length], ['wrong', 'Nesprávne', wrong.length]] as const).map(([key, label, n]) =>
      <Button key={key} variant={filter === key ? 'contained' : 'outlined'} aria-pressed={filter === key} onClick={() => { cancelAdvance(); setFilter(key); setReviewCursor(0); setGridOpen(false) }}>{label} <span className="filter-count">{n}</span></Button>
     )}</Box>}
     {view === 'questions' && retry && !retry.merged && <Button variant="outlined" sx={{ mb: 2 }} onClick={() => navigate('retry')}>Pokračovať v opakovaní ({Object.keys(retry.answers).length}/{retry.ids.length})</Button>}
     {reviewing && filtered.length > 0 && <Button variant="contained" onClick={startRetry} sx={{ mb: 2 }}>Otestovať sa</Button>}
     {finished && <Paper component="section" variant="outlined" className="result-card" aria-live="polite">
      <Typography variant="h1" component="h2">{view === 'test' ? percent(testCorrect, test.questionCount) : percent(retryCorrect.length, retryQs.length)} % správnych odpovedí</Typography>
      <Typography>{view === 'test' ? `${testCorrect}/40 správne · ${points}/100 bodov` : `${retryCorrect.length}/${retryQs.length} správne`}</Typography>
      {view === 'test' && <Typography color={points >= test.passingPoints ? 'success.main' : 'error.main'}>{attempt.finished === 'timeout' ? 'Čas vypršal. ' : ''}{points >= test.passingPoints ? 'Úspešný test' : 'Neúspešný test'}</Typography>}
      {view === 'test' ? <Button variant="outlined" onClick={() => setConfirm('test')}>Zopakovať test</Button> : <Button variant="contained" disabled={retry?.merged || !retryCorrect.length} onClick={mergeRetry}>{retry?.merged ? 'Presunuté ✓' : `Presunúť ${retryCorrect.length} medzi správne`}</Button>}
     </Paper>}
     {view === 'questions' && filter === 'all' && answeredCount === questions.length && <Alert icon={false} severity="success" sx={{ mb: 2 }}>Dokončené · {percent(correct.length, questions.length)} % správne</Alert>}
     <Box className="question-toolbar"><Typography>Otázka <strong>{q ? index + 1 : 0}</strong> / {active.length}</Typography>{view === 'test' ? <Typography variant="body2" color="text.secondary">{answered}/{active.length} zodpovedaných</Typography> : <Button variant="outlined" onClick={() => setGridOpen(!gridOpen)} aria-expanded={gridOpen} aria-controls="question-overview">Prehľad otázok</Button>}</Box>
     <Collapse in={view === 'test' || gridOpen} timeout={0}>
      <Paper variant="outlined" id="question-overview" className="question-overview">
       <Typography variant="body2">{answered}/{view === 'questions' ? questions.length : active.length} zodpovedaných</Typography>
       <LinearProgress variant="determinate" value={percent(answered, view === 'questions' ? questions.length : active.length)} sx={{ my: 2 }} />
       <Box className="legend"><span>✓ Správne</span><span>× Nesprávne</span><span>○ Bez odpovede</span></Box>
       <Box className="question-grid">{active.map((q, i) => {
        const a = selection(q, i), status = a === undefined ? finished ? 'incorrect unanswered-failed' : '' : a === q.correctAnswerIndex ? 'correct' : 'incorrect'
        return <Button variant="outlined" key={`${q.id}-${i}`} aria-label={`Otázka ${i + 1}: ${a === undefined ? finished ? 'nezodpovedaná, neúspešná' : 'nezodpovedaná' : a === q.correctAnswerIndex ? 'správne' : 'nesprávne'}`} aria-current={i === index ? 'step' : undefined} className={`${status} ${i === index ? 'current' : ''}`} onClick={() => move(i)}><span>{i + 1}</span>{a !== undefined && <span className="grid-mark">{a === q.correctAnswerIndex ? '✓' : '×'}</span>}{a === undefined && finished && <span className="grid-mark">×</span>}</Button>
       })}</Box>
      </Paper>
     </Collapse>
     {q ? <>
      <Box key={`${view}-${testId}-${q.id}-${index}`} className={`question-stage ${transitioning ? 'leaving' : ''}`}>
       <QuestionCard q={q} selected={selected} reveal={selected !== undefined || finished || reviewing} answer={finished || reviewing ? undefined : answer} />
      </Box>
      {finished && selected === undefined && <Alert severity="error" icon={false} sx={{ mt: 2 }}>Bez odpovede · 0 bodov</Alert>}
      <Box className="question-navigation"><Button variant="outlined" disabled={index === 0} onClick={() => move(index - 1)}>← Predchádzajúca</Button><Button variant="contained" disabled={index >= active.length - 1} onClick={() => move(index + 1)}>Ďalšia →</Button></Box>
      {!finished && !reviewing && <Button className="skip" onClick={nextUnanswered} disabled={active.every((q, i) => selection(q, i) !== undefined)}>Ďalšia nezodpovedaná</Button>}
     </> : <Paper variant="outlined" className="empty-state"><Typography>Žiadne otázky.</Typography><Button onClick={() => setFilter('all')}>Zobraziť všetky</Button></Paper>}
    </>}
   </main>
   <footer><a href="https://www.minv.sk/egovinet02/PCPZobrazFile?fileName=test2.html" target="_blank" rel="noreferrer">Podklady: MV SR · verejný príklad skúšky</a></footer>
  </Box>
  <Dialog open={confirm !== null} onClose={() => setConfirm(null)} aria-labelledby="confirm-title" fullWidth maxWidth="xs">
   <DialogTitle id="confirm-title">{confirm === 'retry' ? 'Nové opakovanie?' : 'Vymazať pokrok?'}</DialogTitle>
   <DialogContent><DialogContentText>{confirm === 'test' ? `Vymažú sa odpovede a čas testu ${testId}.` : confirm === 'bank' ? 'Vymažú sa odpovede v otázkach. Testy zostanú.' : 'Nahradí sa rozpracované opakovanie.'}</DialogContentText></DialogContent>
   <DialogActions sx={{ p: 2 }}><Button autoFocus onClick={() => setConfirm(null)}>Zrušiť</Button><Button variant="contained" onClick={resetConfirmed}>{confirm === 'retry' ? 'Začať' : 'Áno, resetovať'}</Button></DialogActions>
  </Dialog>
 </ThemeProvider>
}
export default App

