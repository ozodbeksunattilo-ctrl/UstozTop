import { describe, expect, it } from 'vitest'
import { clampScore, rankStudents, shortName } from '../src/lib/ranking.js'

const base = { firstName: 'A', lastName: 'A', createdAt: new Date('2026-01-01'), presentCount: 0 }

describe('reyting qoidalari', () => {
  it('ball bo‘yicha kamayish tartibida tartiblaydi', () => {
    const ranked = rankStudents([
      { ...base, id: 'a', points: 10 },
      { ...base, id: 'b', points: 30 },
      { ...base, id: 'c', points: 20 },
    ])
    expect(ranked.map((item) => item.id)).toEqual(['b', 'c', 'a'])
    expect(ranked.map((item) => item.rank)).toEqual([1, 2, 3])
  })

  it('teng ballda kelgan darslar soni ko‘proq bo‘lgan yuqorida', () => {
    const ranked = rankStudents([
      { ...base, id: 'a', points: 20, presentCount: 2 },
      { ...base, id: 'b', points: 20, presentCount: 5 },
    ])
    expect(ranked[0].id).toBe('b')
  })

  it('yana teng bo‘lsa oldin ro‘yxatdan o‘tgan yuqorida, keyin alifbo', () => {
    const ranked = rankStudents([
      { ...base, id: 'late', points: 5, createdAt: new Date('2026-03-01') },
      { ...base, id: 'early', points: 5, createdAt: new Date('2026-02-01') },
    ])
    expect(ranked[0].id).toBe('early')
    const alpha = rankStudents([
      { ...base, id: 'z', lastName: 'Zokirov', points: 5 },
      { ...base, id: 'a', lastName: 'Aliyev', points: 5 },
    ])
    expect(alpha[0].id).toBe('a')
  })

  it('natija har safar bir xil (deterministik)', () => {
    const input = [
      { ...base, id: 'a', points: 5 },
      { ...base, id: 'b', points: 5 },
    ]
    expect(rankStudents(input).map((item) => item.id)).toEqual(rankStudents([...input].reverse()).map((item) => item.id))
  })
})

describe('yordamchi funksiyalar', () => {
  it('ball chegaradan chiqmaydi', () => {
    expect(clampScore(15, 10)).toBe(10)
    expect(clampScore(-3, 10)).toBe(0)
    expect(clampScore(7.4, 10)).toBe(7)
  })
  it('o‘quvchi ismi qisqartiriladi', () => {
    expect(shortName('Ali', 'Valiyev')).toBe('Ali V.')
  })
})
