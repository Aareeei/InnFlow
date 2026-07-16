import { BasePage } from './BasePage.js';

export class MaintenancePage extends BasePage {
  async createTicket(input: {
    roomNumber: string;
    issue: string;
    priority?: string;
    receiptId?: string;
  }): Promise<string> {
    await this.goto('/maintenance');
    await this.page.getByTestId('maintenance-room-number').fill(input.roomNumber);
    await this.page.getByTestId('maintenance-issue').fill(input.issue);

    if (input.priority) {
      await this.page.getByTestId('maintenance-priority').fill(input.priority);
    }

    if (input.receiptId) {
      await this.page.getByTestId('maintenance-receipt-id').fill(input.receiptId);
    }

    await this.page.getByTestId('maintenance-create-submit').click();
    return this.waitForSuccessMessage();
  }

  async verifyTicketVisible(roomNumber: string, issue: string): Promise<boolean> {
    await this.goto('/maintenance');
    const row = this.page.locator('[data-testid^="maintenance-row-"]').filter({ hasText: roomNumber }).filter({ hasText: issue });
    return (await row.count()) > 0;
  }
}
