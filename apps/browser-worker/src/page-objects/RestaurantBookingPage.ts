import { BasePage } from './BasePage.js';

export class RestaurantBookingPage extends BasePage {
  async createBooking(input: {
    guestName: string;
    partySize: number;
    bookingTime: string;
    specialRequests?: string;
    receiptId?: string;
  }): Promise<string> {
    await this.goto('/restaurant-bookings');
    await this.page.getByTestId('restaurant-booking-guest-name').fill(input.guestName);
    await this.page.getByTestId('restaurant-booking-party-size').fill(String(input.partySize));
    await this.page.getByTestId('restaurant-booking-time').fill(input.bookingTime);

    if (input.specialRequests) {
      await this.page.getByTestId('restaurant-booking-special-requests').fill(input.specialRequests);
    }

    if (input.receiptId) {
      await this.page.getByTestId('restaurant-booking-receipt-id').fill(input.receiptId);
    }

    await this.page.getByTestId('restaurant-booking-create-submit').click();
    return this.waitForSuccessMessage();
  }

  async verifyBookingVisible(guestName: string, partySize: number): Promise<boolean> {
    await this.goto('/restaurant-bookings');
    const row = this.page
      .locator('[data-testid^="restaurant-booking-row-"]')
      .filter({ hasText: guestName })
      .filter({ hasText: String(partySize) });
    return (await row.count()) > 0;
  }
}
