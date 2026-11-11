export async function check(page, side) {
  const root = page.locator('#' + side)
  await root.locator('.btn').click()
  return { clicks: await root.locator('.clicks').textContent() }
}

export const expected = 'works'
