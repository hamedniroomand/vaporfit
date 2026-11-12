export async function check(page, side) {
  const trigger = page.locator('#' + side + ' .trigger')
  const before = await page.locator('[role=alertdialog]').count()
  const aria = await trigger.getAttribute('aria-haspopup')
  await trigger.click()
  await page.waitForTimeout(300)
  const opened = (await page.locator('[role=alertdialog]').count()) - before
  const dialog = page.locator('[role=alertdialog]')
  if (await dialog.count()) {
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await page.waitForTimeout(300)
  }
  return { aria, opened }
}

// Vue 3.6.0-rc.15 fixes as-child in a Vapor component. With Vue 3.6.0-rc.14 the result is 'breaks'.
export const expected = 'works'
