import test, { expect } from "@playwright/test";

test.afterEach(async ({ page }) => {
  await page.goto("/__tests/delete-user?email=test@example.com");
});

test("redirects actor to login if they are not logged in", async ({ page }) => {
  await page.goto("/app/pantry");
  await expect(page.getByRole("button", { name: /log in/i })).toBeVisible();
});

test("lets a user do a typical flow", async ({ page }) => {
  await page.goto(
    "/__tests/login?email=test@remix.com&firstName=Test&lastName=Remix"
  );
  await page.goto("/app/pantry");

  await page.getByRole("button", { name: /create shelf/i }).click();

  const shelfNameInput = page.getByRole("textbox", { name: /shelf name/i }); // name es el aria-label que hemos añadido al <input>
  await shelfNameInput.fill("Dairy");

  const newItemInput = page.getByPlaceholder(/new item/i);

  await newItemInput.fill("Milk");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(50);

  await newItemInput.fill("Cheese");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(50);

  await newItemInput.fill("Yogurt");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(50);

  await page.goto("/app/recipes");
  await page.goto("/app/pantry"); // Recargamos la página para comprobar que los datos persisten

  expect(await shelfNameInput.inputValue()).toBe("Dairy");
  expect(page.getByText("Milk")).toBeVisible();
  expect(page.getByText("Cheese")).toBeVisible();
  expect(page.getByText("Yogurt")).toBeVisible();

  await page.getByRole("button", { name: /delete cheese/i }).click();
  await page.waitForTimeout(50);
  expect(page.getByText("Cheese")).not.toBeVisible();

  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /delete shelf/i }).click();
  await page.waitForTimeout(50);
  expect(page.getByText("Dairy")).not.toBeVisible();
});
