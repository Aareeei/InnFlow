import { BasePage } from './BasePage.js';

export class WakeUpCallPage extends BasePage {
  async scheduleCall(input: {
    roomNumber: string;
    callTime: string;
    receiptId?: string;
  }): Promise<string> {
    await this.goto('/wake-up-calls');
    await this.page.getByTestId('wake-up-call-room-number').fill(input.roomNumber);
    await this.page.getByTestId('wake-up-call-time').fill(input.callTime);

    if (input.receiptId) {
      await this.page.getByTestId('wake-up-call-receipt-id').fill(input.receiptId);
    }

    await this.page.getByTestId('wake-up-call-create-submit').click();
    return this.waitForSuccessMessage();
  }

  async verifyCallVisible(roomNumber: string, callTime: string): Promise<boolean> {
    await this.goto('/wake-up-calls');
    const row = this.page.locator('[data-testid^="wake-up-call-row-"]').filter({ hasText: roomNumber }).filter({ hasText: callTime });
    return (await row.count()) > 0;
  }
}
