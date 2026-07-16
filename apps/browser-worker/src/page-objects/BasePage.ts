import type { Page } from 'playwright';

export class BasePage {
  constructor(
    protected readonly page: Page,
    protected readonly baseUrl: string,
  ) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(`${this.baseUrl}${path}`, { waitUntil: 'networkidle' });
  }

  async waitForSuccessMessage(): Promise<string> {
    const banner = this.page.getByTestId('success-message');
    await banner.waitFor({ state: 'visible', timeout: 30_000 });
    return (await banner.textContent())?.trim() ?? 'Action completed successfully';
  }
}
