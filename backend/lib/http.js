export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

export function cleanName(value, max) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max)
}

export function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export function roomIdOk(id) {
  return /^[A-Za-z0-9_-]{12,24}$/.test(id)
}
