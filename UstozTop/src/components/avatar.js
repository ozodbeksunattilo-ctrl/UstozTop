export const AVATAR_COLORS = ['#8b6cff', '#28c7d9', '#e3ad58', '#47c995', '#ea8398', '#4c9cf4']

export function avatarStyle(user) {
  return user.avatarColor ? { background: `linear-gradient(145deg, ${user.avatarColor}, color-mix(in srgb, ${user.avatarColor} 45%, #12142a))` } : undefined
}
