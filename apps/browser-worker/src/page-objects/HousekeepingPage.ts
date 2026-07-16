import { BasePage } from './BasePage.js';

export class HousekeepingPage extends BasePage {
  async createRequest(input: {
    roomNumber: string;
    item: string;
    quantity: number;
    notes?: string;
    receiptId?: string;
  }): Promise<string> {
    await this.goto('/housekeeping');
    await this.page.getByTestId('housekeeping-room-number').fill(input.roomNumber);
    await this.page.getByTestId('housekeeping-item').fill(input.item);
    await this.page.getByTestId('housekeeping-quantity').fill(String(input.quantity));

    if (input.notes) {
      await this.page.getByTestId('housekeeping-notes').fill(input.notes);
    }

    if (input.receiptId) {
      await this.page.getByTestId('housekeeping-receipt-id').fill(input.receiptId);
    }

    await this.page.getByTestId('housekeeping-create-submit').click();
    return this.waitForSuccessMessage();
  }

  async verifyRequestVisible(roomNumber: string, item: string): Promise<boolean> {
    await this.goto('/housekeeping');
    const row = this.page.locator('[data-testid^="housekeeping-row-"]').filter({ hasText: roomNumber }).filter({ hasText: item });
    return (await row.count()) > 0;
  }
}
