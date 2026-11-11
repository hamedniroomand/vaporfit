export async function check(page, side) {
  const target = page.locator(`#${side} .target`)
  const before = await target.evaluate(el => el.__qripple != null)
  await target.click()
  await page.waitForTimeout(80)
  return {
    bound: before,
    ripples: await page.locator(`#${side} .q-ripple`).count(),
  }
}

export const expected = 'breaks'
