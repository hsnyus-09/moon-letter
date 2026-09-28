import { expect, test } from '@playwright/test';

test('compose, preserve unsaved form, generate Unicode link, reveal, and read', async ({ page }) => {
  await page.goto('/');
  await expectNoHorizontalOverflow(page);

  await page.locator('#recipient-input').fill('달님에게 🌕');
  await page.locator('#sender-input').fill('윤슬');
  await page.locator('#create-letter').click();
  await expect(page.locator('#recipient-input')).toHaveValue('달님에게 🌕');
  await expect(page.locator('#sender-input')).toHaveValue('윤슬');

  await page.locator('#message-input').fill('추석 밤의 마음을 한 글자씩 전해요. 안전한 링크는 아니지만 조용한 keepsake예요.');
  await page.locator('#create-letter').click();
  const link = await page.locator('#letter-link').inputValue();
  expect(link).toContain('#ml1.');

  await page.goto('about:blank');
  await page.goto(link);
  await expect(page.locator('#reveal-letter')).toBeVisible();
  await page.locator('#reveal-letter').click();
  await expect(page.locator('#letter-content')).toContainText('달님에게 🌕');
  await expect(page.locator('#letter-content')).toContainText('추석 밤의 마음');
  await expectNoHorizontalOverflow(page);
});

test('editing after link generation clears stale link', async ({ page }) => {
  await page.goto('/');
  await page.locator('#recipient-input').fill('친구');
  await page.locator('#sender-input').fill('나');
  await page.locator('#message-input').fill('첫 편지');
  await page.locator('#create-letter').click();
  await expect(page.locator('#letter-link')).toHaveValue(/#ml1\./);
  await expect
    .poll(async () => page.evaluate(() => window.location.hash))
    .toMatch(/^#ml1\./);

  await page.locator('#message-input').fill('새 편지');
  await expect(page.locator('#letter-link')).toHaveValue('');
  await expect.poll(async () => page.evaluate(() => window.location.hash)).toBe('');
});

test('opt-in persisted edited draft survives reload after stale hash invalidation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#recipient-input').fill('저장 친구');
  await page.locator('#sender-input').fill('저장한 나');
  await page.locator('#message-input').fill('처음 저장한 편지');
  await page.getByLabel('이 기기에 초안 저장').check();
  await page.locator('#create-letter').click();
  await expect(page.locator('#letter-link')).toHaveValue(/#ml1\./);

  await page.locator('#message-input').fill('수정해서 저장한 편지');
  await expect(page.locator('#letter-link')).toHaveValue('');
  await expect.poll(async () => page.evaluate(() => window.location.hash)).toBe('');

  await page.reload();
  await expect(page.locator('#recipient-input')).toHaveValue('저장 친구');
  await expect(page.locator('#sender-input')).toHaveValue('저장한 나');
  await expect(page.locator('#message-input')).toHaveValue('수정해서 저장한 편지');
});

test('corrupt link shows recovery state', async ({ page }) => {
  await page.goto('/#ml1.corrupt-payload');
  await expect(page.locator('#invalid-link')).toBeVisible();
  await expect(page.locator('#invalid-link')).toContainText('새 편지');
  await expectNoHorizontalOverflow(page);
});

test('same-tab hash navigation refreshes letters and recovers through history', async ({ page }) => {
  await page.goto('/');
  const first = await createLink(page, '첫 달', '나', '첫 번째 편지입니다.');
  const second = await createLink(page, '둘째 달', '나', '두 번째 편지입니다.');

  await page.goto('about:blank');
  await page.goto(first);
  await page.locator('#reveal-letter').click();
  await expect(page.locator('#letter-content')).toContainText('첫 번째 편지입니다.');

  await page.evaluate((url) => {
    window.location.hash = new URL(url).hash;
  }, second);
  await expect(page.locator('#reveal-letter')).toBeVisible();
  await page.locator('#reveal-letter').click();
  await expect(page.locator('#letter-content')).toContainText('두 번째 편지입니다.');

  await page.evaluate(() => {
    window.location.hash = '#ml1.corrupt-payload';
  });
  await expect(page.locator('#invalid-link')).toBeVisible();

  await page.goBack();
  await expect(page.locator('#reveal-letter')).toBeVisible();
  await page.locator('#reveal-letter').click();
  await expect(page.locator('#letter-content')).toContainText('두 번째 편지입니다.');
});

async function expectNoHorizontalOverflow(page: { evaluate: <T>(fn: () => T) => Promise<T> }): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function createLink(
  page: {
    locator: (selector: string) => {
      fill: (value: string) => Promise<void>;
      click: () => Promise<void>;
      inputValue: () => Promise<string>;
    };
  },
  recipient: string,
  sender: string,
  message: string
): Promise<string> {
  await page.locator('#recipient-input').fill(recipient);
  await page.locator('#sender-input').fill(sender);
  await page.locator('#message-input').fill(message);
  await page.locator('#create-letter').click();
  return page.locator('#letter-link').inputValue();
}
