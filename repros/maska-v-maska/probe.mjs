export async function check(page, side) {
  const root = page.locator('#' + side)
  const byValue = root.locator('.by-value')
  const byData = root.locator('.by-data')
  await byValue.click()
  await byValue.pressSequentially('12')
  await byData.click()
  await byData.pressSequentially('12')
  return {
    value: await byValue.inputValue(),
    data: await byData.inputValue(),
  }
}

export const expected = 'breaks'
