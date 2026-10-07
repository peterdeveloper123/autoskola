import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const tests = JSON.parse(readFileSync('src/assets/minv/tests.sk.json', 'utf8'))
const questions = JSON.parse(readFileSync('src/assets/minv/questions.sk.json', 'utf8'))
const key = 'autoskola.progress.v1'
const saved = (page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)

test('100 tests, answers, cursor persistence, independent paused timers', async ({ page }) => {
 await page.goto('/')
 await expect(page.locator('.test-tile')).toHaveCount(100)
 await page.getByRole('button', { name: 'Test 1, nezačatý', exact: true }).click()
 await expect(page.locator('.question-overview')).toBeVisible()
 await page.locator('.answer').nth(tests[0].questions[0].correctAnswerIndex).click()
 await expect(page.locator('.feedback')).toContainText('Správna odpoveď')
 await page.getByRole('button', { name: 'Ďalšia →', exact: true }).click()
 await expect(page.locator('.question-overview')).toBeVisible()
 await page.waitForTimeout(1200)
 await page.getByRole('button', { name: '← Späť', exact: true }).click()
 const first = (await saved(page)).tests[1]
 expect(first.cursor).toBe(1); expect(first.elapsedMs).toBeGreaterThan(1000)
 await page.waitForTimeout(500)
 expect((await saved(page)).tests[1].elapsedMs).toBe(first.elapsedMs)
 await page.getByRole('button', { name: 'Test 2, nezačatý', exact: true }).click()
 await page.locator('.answer').nth(0).click()
 await page.getByRole('button', { name: '← Späť', exact: true }).click()
 await page.reload()
 await page.getByRole('button', { name: 'Test 1, rozpracovaný', exact: true }).click()
 await expect(page.locator('.question-toolbar')).toContainText('2 / 40')
 await page.waitForTimeout(400)
 expect((await saved(page)).tests[1].elapsedMs).toBeGreaterThan(first.elapsedMs)
 expect(Object.keys((await saved(page)).tests[2].answers)).toHaveLength(1)
})

test('timeout counts unanswered as wrong and prevents further answers', async ({ page }) => {
 await page.goto('/')
 await page.evaluate(({ key }) => localStorage.setItem(key, JSON.stringify({ version:1, tests: { 1: { answers:{}, cursor:0, elapsedMs:1799800, finished:null } }, bank:{}, bankCursor:0, retry:null })), {key})
 await page.reload(); await page.getByRole('button', { name: 'Test 1, rozpracovaný', exact:true }).click()
 await expect(page.locator('.result-card')).toContainText('Čas vypršal')
 await expect(page.locator('.result-card')).toContainText('0 %')
 await expect(page.locator('.question-grid .incorrect')).toHaveCount(40)
 await expect(page.locator('.answer').first()).toBeDisabled()
})

test('all answers finish test immediately and reset affects only that test', async ({ page }) => {
 await page.goto('/')
 const answers = Object.fromEntries(tests[0].questions.slice(0,39).map((q,i) => [i,q.correctAnswerIndex]))
 await page.evaluate(({ key, answers }) => localStorage.setItem(key, JSON.stringify({version:1, tests:{1:{answers,cursor:39,elapsedMs:3000,finished:null},2:{answers:{0:1},cursor:0,elapsedMs:1000,finished:null}},bank:{},bankCursor:0,retry:null})), { key, answers })
 await page.reload(); await page.getByRole('button', {name:'Test 1, rozpracovaný',exact:true}).click()
 await page.locator('.answer').nth(tests[0].questions[39].correctAnswerIndex).click()
 await expect(page.locator('.result-card')).toContainText('100 %')
 expect((await saved(page)).tests[1].finished).toBe('answered')
 await page.getByRole('button',{name:'Zopakovať test',exact:true}).click()
 await page.getByRole('button',{name:'Áno, resetovať',exact:true}).click()
 await expect(page.locator('.result-card')).toHaveCount(0)
 expect(Object.keys((await saved(page)).tests[1].answers)).toHaveLength(0)
 expect((await saved(page)).tests[2].elapsedMs).toBe(1000)
})

test('956 unique questions, wrong review, blind retry and explicit transfer', async ({ page }) => {
 await page.goto('/'); await page.getByRole('tab',{name:'Otázky',exact:true}).click()
 await expect(page.locator('.question-grid button')).toHaveCount(956)
 await page.locator('.answer').nth((questions[0].correctAnswerIndex+1)%3).click()
 await page.getByRole('button',{name:'Nesprávne 1',exact:true}).click()
 await expect(page.locator('.answer.right')).toHaveCount(1)
 await page.getByRole('button',{name:'Otestovať sa',exact:true}).click()
 await expect(page.locator('.answer.right')).toHaveCount(0)
 await page.locator('.answer').nth(questions[0].correctAnswerIndex).click()
 await expect(page.locator('.result-card')).toContainText('100 %')
 expect((await saved(page)).bank[questions[0].id]).not.toBe(questions[0].correctAnswerIndex)
 // A completed retry remains accessible after leaving and refreshing.
 await page.getByRole('button',{name:'← Späť',exact:true}).click()
 await page.reload(); await page.getByRole('tab',{name:'Otázky',exact:true}).click()
 await page.getByRole('button',{name:/Pokračovať v opakovaní/}).click()
 await page.getByRole('button',{name:'Presunúť 1 medzi správne',exact:true}).click()
 expect((await saved(page)).bank[questions[0].id]).toBe(questions[0].correctAnswerIndex)
 await page.getByRole('button',{name:'← Späť',exact:true}).click()
 await page.getByRole('button',{name:'Správne 1',exact:true}).click()
 await expect(page.locator('.answer.right')).toHaveCount(1)
})

test('responsive at 360px, 390px, tablet and desktop; images load', async ({ page }) => {
 await page.goto('/')
 for (const width of [360,390,768,1440]) {
  await page.setViewportSize({width,height:900})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
 }
 await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'e2e/screenshots/mobile-home.png',fullPage:true})
 await page.getByRole('button',{name:'Test 1, nezačatý',exact:true}).click()
 await expect(page.locator('.question-overview')).toBeVisible()
 await page.getByRole('button',{name:'Otázka 11: nezodpovedaná',exact:true}).click()
 await expect(page.locator('.question-image img')).toBeVisible()
 expect(await page.locator('.question-image img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy()
 for (const width of [360,390,768,1440]) {
  await page.setViewportSize({width,height:900})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
 }
 await page.screenshot({path:'e2e/screenshots/desktop-question.png',fullPage:true})
 await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'e2e/screenshots/mobile-question.png',fullPage:true})
})



test('correct answer advances after a delay, wrong stays, manual navigation cancels', async ({ page }) => {
 await page.goto('/')
 await page.getByRole('button', {name:'Test 1, nezačatý',exact:true}).click()
 await page.locator('.answer').nth(tests[0].questions[0].correctAnswerIndex).click()
 await expect(page.locator('.question-toolbar')).toContainText('1 / 40')
 await expect(page.locator('.feedback')).toContainText('Správna odpoveď')
 await expect(page.locator('.question-toolbar')).toContainText('2 / 40', {timeout:3000})
 expect((await saved(page)).tests[1].cursor).toBe(1)
 await page.locator('.answer').nth((tests[0].questions[1].correctAnswerIndex+1)%3).click()
 await page.waitForTimeout(1500)
 await expect(page.locator('.question-toolbar')).toContainText('2 / 40')
 await page.getByRole('button',{name:'Ďalšia →',exact:true}).click()
 await page.locator('.answer').nth(tests[0].questions[2].correctAnswerIndex).click()
 await page.getByRole('button',{name:'Otázka 8: nezodpovedaná',exact:true}).click()
 await page.waitForTimeout(1500)
 await expect(page.locator('.question-toolbar')).toContainText('8 / 40')
})
