import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  async login(username: string, password: string): Promise<void> {
    await this.goto('/login');
    await this.page.getByTestId('login-username').fill(username);
    await this.page.getByTestId('login-password').fill(password);
    await this.page.getByTestId('login-submit').click();
    await this.page.getByTestId('pms-titlebar').waitFor({ state: 'visible', timeout: 30_000 });
  }
}
