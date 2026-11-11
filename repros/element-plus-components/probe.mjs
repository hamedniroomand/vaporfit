export async function check(page, side) {
  const root = page.locator('#' + side)
  await root.locator('.btn').click()
  await root.locator('input').fill('hi')
  await page.waitForTimeout(50)
  return {
    clicks: await root.locator('.clicks').textContent(),
    text: await root.locator('.text').textContent(),
  }
}

export const expected = 'works'
