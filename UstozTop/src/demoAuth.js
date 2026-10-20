const USERS_KEY = 'ustoztop-demo-users'
export const SESSION_KEY = 'ustoztop-demo-session'
const ADMIN_EMAIL = 'admin@ustoztop.uz'
const ADMIN_PASSWORD = 'UstozTopAdmin26!'
const ROLES = ['admin', 'teacher', 'student']

function readUsers() {
  const storedUsers = localStorage.getItem(USERS_KEY)
  if (!storedUsers) return []

  const users = JSON.parse(storedUsers)
  if (!Array.isArray(users)) {
    throw new Error('Demo akkauntlar ro‘yxati noto‘g‘ri formatda saqlangan.')
  }
  return users
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(bits)
}

function createSalt() {
  return crypto.getRandomValues(new Uint8Array(16))
}

function saltFromHex(value) {
  const bytes = new Uint8Array(value.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)))
  return bytes
}

async function createUser({ fullName, email, password, role }) {
  if (!crypto?.subtle) throw new Error('Brauzer xavfsiz parol saqlashni qo‘llab-quvvatlamaydi.')
  const salt = createSalt()
  return {
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    role,
    salt: toHex(salt),
    passwordHash: await hashPassword(password, salt),
  }
}

export async function initializeDemoUsers() {
  const users = readUsers()
  const admin = users.find((user) => user.email === ADMIN_EMAIL)
  if (admin) {
    if (admin.role !== 'admin') throw new Error('Demo admin email manzili boshqa rol bilan band.')
    return
  }

  users.push(await createUser({
    fullName: 'UstozTop Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
  }))
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export async function registerDemoUser({ fullName, email, password, role }) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!['teacher', 'student'].includes(role)) {
    throw new Error('Ochiq ro‘yxatdan o‘tishda faqat ustoz yoki o‘quvchi rolini tanlash mumkin.')
  }
  const users = readUsers()
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error('Bu email bilan akkaunt mavjud. Kirish bo‘limidan foydalaning.')
  }

  const user = await createUser({ fullName, email: normalizedEmail, password, role })
  users.push(user)
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  return { fullName: user.fullName, email: user.email, role: user.role }
}

export async function authenticateDemoUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = readUsers().find((account) => account.email === normalizedEmail)
  if (!user || !ROLES.includes(user.role) || !user.salt || !user.passwordHash) return null

  const passwordHash = await hashPassword(password, saltFromHex(user.salt))
  if (passwordHash !== user.passwordHash) return null
  return { fullName: user.fullName, email: user.email, role: user.role }
}

export function updateDemoUserProfile(email, profile) {
  const normalizedEmail = email.trim().toLowerCase()
  const fullName = profile.fullName.trim().replace(/\s+/g, ' ')
  if (fullName.length < 2) throw new Error('Ism kamida 2 ta belgidan iborat bo‘lsin.')

  const users = readUsers()
  const user = users.find((account) => account.email === normalizedEmail)
  if (!user) throw new Error('Akkaunt topilmadi.')
  user.fullName = fullName
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  return { fullName: user.fullName }
}
