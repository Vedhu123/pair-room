export async function api(path, options = {}) {
  const res = await fetch(path, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.error || 'Request failed.')
    error.status = res.status
    throw error
  }
  return data
}

export function collabSocketBase() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}
