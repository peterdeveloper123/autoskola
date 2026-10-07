import questionData from './questions.sk.json'
import testData from './tests.compact.json'
import categoryData from './categories.sk.json'
import metadata from './metadata.json'

export const questions = questionData
const questionById = new Map(questionData.map(question => [question.id, question]))
// Reconstruct original test answer order without bundling the same texts repeatedly.
export const tests = testData.map(test => ({
  ...test,
  questions: test.questions.map(reference => {
    const question = questionById.get(reference.questionId)
    if (!question) throw new Error(`Missing question ${reference.questionId}`)
    return {
      ...question,
      position: reference.position,
      answers: reference.answerOrder.map(index => question.answers[index]),
      correctAnswerIndex: reference.correctAnswerIndex,
    }
  }),
}))
export const categories = categoryData
export { metadata }

export type Question = (typeof questions)[number]
export type Test = (typeof tests)[number]

// Vite must see image imports at build time; JSON paths alone are not asset imports.
const imageUrls = import.meta.glob<string>('./images/**/*.{jpg,jpeg,png,gif}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export function getQuestionImageUrl(question: Pick<Question, 'image'>): string | null {
  if (!question.image) return null
  const url = imageUrls[`./${question.image}`]
  if (!url) throw new Error(`Missing MINV question image: ${question.image}`)
  return url
}
