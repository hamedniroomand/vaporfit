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

export const expected = 'breaks'
