export async function check(page, side) {
  const root = page.locator('#' + side)
  await root.locator('.home').click()
  await page.waitForTimeout(100)
  await root.locator('.go').click()
  await page.waitForTimeout(100)
  const view = root.locator('.view')
  const viewText = async () => ((await view.count()) ? view.first().textContent() : null)
  const afterPush = {
    path: await root.locator('.path').textContent(),
    view: await viewText(),
  }
  await root.locator('.link').click()
  await page.waitForTimeout(100)
  return {
    pathAfterPush: afterPush.path,
    viewAfterPush: afterPush.view,
    pathAfterLink: await root.locator('.path').textContent(),
    viewAfterLink: await viewText(),
  }
}

export const expected = 'works'
