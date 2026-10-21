export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN'
export type UserStatus = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'BLOCKED'
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  passwordHash: string
  role: Role
  status: UserStatus
  avatarColor: string | null
  createdAt: Date
  updatedAt: Date
}
