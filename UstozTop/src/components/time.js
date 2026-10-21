import { useEffect, useState } from 'react'

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const UZ_WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba']
const UZ_WEEKDAYS_SHORT = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan']

const LOCALES = { ru: 'ru-RU', en: 'en-US', 'uz-Cyrl': 'uz-Cyrl-UZ' }

export const localeFor = (language) => LOCALES[language] || 'uz-UZ'

// Brauzerning "uz-UZ" sana formati ba'zi qurilmalarda noto'g'ri chiqadi, shuning uchun o'zbek lotin tilida qo'lda yig'iladi.
export function formatToday(language, date = new Date()) {
  if (language !== 'uz') {
    return new Intl.DateTimeFormat(localeFor(language), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  }
  return `${date.getFullYear()}-yil ${date.getDate()}-${UZ_MONTHS[date.getMonth()]}, ${UZ_WEEKDAYS[date.getDay()]}`
}

export function formatShortDate(value, language) {
  const date = new Date(value)
  if (language !== 'uz') return new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date)
  return `${date.getUTCDate()}-${UZ_MONTHS[date.getUTCMonth()]}`
}

export function weekdayShort(language, day) {
  if (language !== 'uz') return new Intl.DateTimeFormat(localeFor(language), { weekday: 'short' }).format(new Date(2024, 0, 7 + day))
  return UZ_WEEKDAYS_SHORT[day]
}

export function weekdayLong(language, day) {
  if (language !== 'uz') return new Intl.DateTimeFormat(localeFor(language), { weekday: 'long' }).format(new Date(2024, 0, 7 + day))
  return UZ_WEEKDAYS[day][0].toUpperCase() + UZ_WEEKDAYS[day].slice(1)
}

// Kun vaqtiga qarab salom (kalit — i18n lug'atidagi matn).
export function greetingKey(hour = new Date().getHours()) {
  if (hour < 5) return 'Xayrli tun,'
  if (hour < 11) return 'Xayrli tong,'
  if (hour < 17) return 'Xayrli kun,'
  if (hour < 22) return 'Xayrli kech,'
  return 'Xayrli tun,'
}

// Joriy vaqtni har daqiqada yangilaydi: salom va sana sahifa ochiq turganda ham to'g'ri qoladi.
export function useNow(interval = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), interval)
    return () => window.clearInterval(timer)
  }, [interval])
  return now
}

export function formatClock(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
