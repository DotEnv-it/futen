export function cleanPath(path: string) {
  if (process.env['DISABLE_CLEAN_PATH'] === 'true') return path
  if (path === '/') return '/'
  if (path[path.length - 1] === '/') return path.slice(0, -1)
  path = path.replace(/\/{2,}/g, '/')
  return path
}

export function wildcardMatchRegExp(str: string, rule: string) {
  const escapeRegex = (str: string) =>
    // eslint-disable-next-line no-useless-escape -- This is a regex escape function
    str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1')
  return new RegExp(`^${rule.split('*').map(escapeRegex).join('.*')}$`).test(
    str
  )
}
