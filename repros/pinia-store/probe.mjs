export async function check(page, side) {
  const root = page.locator('#' + side)
  await root.locator('.reset').click()
  await root.locator('.inc').click()
  await page.waitForTimeout(50)
  return {
    count: await root.locator('.count').textContent(),
    ref: await root.locator('.ref').textContent(),
    label: await root.locator('.label').textContent(),
  }
}

export const expected = 'works'
