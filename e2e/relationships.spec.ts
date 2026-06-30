import { expect, test } from "@playwright/test"

test("relationship dashboard route is protected and routable", async ({ page }) => {
  await page.goto("/dashboard/relationships")
  await expect(page).toHaveURL(/\/login$/)
})

test("relationship profile route is protected and routable", async ({ page }) => {
  await page.goto("/dashboard/relationships/00000000-0000-0000-0000-000000000001")
  await expect(page).toHaveURL(/\/login$/)
})
