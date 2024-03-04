export function wildcardMatchRegExp(str: string, rule: string) {
  const escapeRegex = (str: string) =>
    // eslint-disable-next-line no-useless-escape -- This is a regex escape function
    str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1')
  return new RegExp(`^${rule.split('*').map(escapeRegex).join('.*')}$`).test(
    str
  )
}
