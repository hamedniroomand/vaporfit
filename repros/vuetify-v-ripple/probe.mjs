export async function check(page, side) {
  const target = page.locator(`#${side} .target`)
  await target.dispatchEvent('mousedown')
  await page.waitForTimeout(120)
  return { ripples: await page.locator(`#${side} .v-ripple__container`).count() }
}

export const expected = 'breaks'
