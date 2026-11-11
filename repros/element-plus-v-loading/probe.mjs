export async function check(page, side) {
  return { loadingMasks: await page.locator(`#${side} .el-loading-mask`).count() }
}

export const expected = 'breaks'
