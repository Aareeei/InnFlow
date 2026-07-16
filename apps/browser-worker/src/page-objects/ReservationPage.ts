import { BasePage } from './BasePage.js';

export class ReservationPage extends BasePage {
  async modifyReservation(input: {
    reservationId: string;
    notes: string;
    receiptId?: string;
  }): Promise<string> {
    await this.goto(`/reservations/${input.reservationId}`);
    await this.page.getByTestId('reservation-notes-input').fill(input.notes);
    await this.page.getByTestId('reservation-modify-submit').click();
    return this.waitForSuccessMessage();
  }

  async cancelReservation(reservationId: string): Promise<string> {
    await this.goto(`/reservations/${reservationId}`);
    await this.page.getByTestId('reservation-cancel-submit').click();
    return this.waitForSuccessMessage();
  }

  async verifyReservationStatus(reservationId: string, expectedStatus: string): Promise<boolean> {
    await this.goto(`/reservations/${reservationId}`);
    const detail = this.page.getByTestId('reservation-detail');
    const text = (await detail.textContent()) ?? '';
    return text.includes(expectedStatus);
  }
}
