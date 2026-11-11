export async function check(page, side) {
  await page.locator(`#${side} .target`).hover()
  await page.waitForTimeout(700)
  const shown = await page.locator('.p-tooltip').count()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(500)
  return { tooltipsShownOnHover: shown }
}

export const expected = 'breaks'
