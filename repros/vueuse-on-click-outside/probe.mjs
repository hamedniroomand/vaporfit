export async function check(page, side) {
  await page.locator('h2').first().click()
  await page.waitForTimeout(100)
  return { text: await page.locator(`#${side} .target`).textContent() }
}

export const expected = 'breaks'
