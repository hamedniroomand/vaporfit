export async function check(page, side) {
  const locator = page.locator(`#${side} .target`)
  if ((await locator.count()) === 0) return { text: null }
  return { text: await locator.first().textContent() }
}

export const expected = 'breaks'
