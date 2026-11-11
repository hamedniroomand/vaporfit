export async function check(page, side) {
  const root = page.locator('#' + side)
  const before = Number(await root.locator('.clicks').textContent())
  await page.locator('h2').first().click()
  await page.waitForTimeout(100)
  const after = Number(await root.locator('.clicks').textContent())
  await root.locator('.toggle').click()
  await root.locator('.model').fill('hello')
  await root.locator('.save').click()
  await page.waitForTimeout(300)
  return {
    echo: await root.locator('.echo').textContent(),
    on: await root.locator('.on').textContent(),
    outside: after - before,
    size: await root.locator('.size').textContent(),
    stored: await root.locator('.stored').textContent(),
  }
}

export const expected = 'works'
