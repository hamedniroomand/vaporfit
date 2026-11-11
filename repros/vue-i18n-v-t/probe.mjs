export async function check(page, side) {
  return { text: await page.locator(`#${side} .target`).textContent() }
}

export const expected = 'breaks'
