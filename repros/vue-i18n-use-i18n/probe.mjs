export async function check(page, side) {
  const root = page.locator('#' + side)
  await root.locator('.en').click()
  await root.locator('.fr').click()
  await page.waitForTimeout(50)
  return {
    text: await root.locator('.text').textContent(),
    locale: await root.locator('.locale').textContent(),
  }
}

export const expected = 'works'
