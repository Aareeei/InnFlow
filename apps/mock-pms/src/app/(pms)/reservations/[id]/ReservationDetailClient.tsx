'use client';

import { useState } from 'react';
import { SuccessBanner } from '@/components/SuccessBanner';

type ReservationDetailClientProps = {
  reservationId: string;
  confirmationCode: string;
  initialNotes: string;
};

export function ReservationDetailClient({
  reservationId,
  confirmationCode,
  initialNotes,
}: ReservationDetailClientProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'modify' | 'cancel' | null>(null);

  async function modifyReservation() {
    setLoading('modify');
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const body = (await response.json()) as { message?: string; error?: { message: string } };
      if (!response.ok) {
        setError(body.error?.message ?? 'Modification failed');
        return;
      }
      setSuccess(body.message ?? `Reservation ${confirmationCode} updated successfully`);
    } catch {
      setError('Unable to modify reservation');
    } finally {
      setLoading(null);
    }
  }

  async function cancelReservation() {
    setLoading('cancel');
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
      });
      const body = (await response.json()) as { message?: string; error?: { message: string } };
      if (!response.ok) {
        setError(body.error?.message ?? 'Cancellation failed');
        return;
      }
      setSuccess(body.message ?? `Reservation ${confirmationCode} cancelled successfully`);
    } catch {
      setError('Unable to cancel reservation');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3 border border-pms-border bg-pms-panel p-3">
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />
      {error ? (
        <div className="border border-red-700 bg-red-100 px-3 py-2 text-sm" data-testid="error-message">
          {error}
        </div>
      ) : null}

      <label className="block text-sm">
        Notes
        <textarea
          className="pms-input mt-1 w-full"
          data-testid="reservation-notes-input"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          className="pms-button"
          data-testid="reservation-modify-submit"
          disabled={loading !== null}
          onClick={modifyReservation}
        >
          {loading === 'modify' ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          className="pms-button"
          data-testid="reservation-cancel-submit"
          disabled={loading !== null}
          onClick={cancelReservation}
        >
          {loading === 'cancel' ? 'Cancelling…' : 'Cancel Reservation'}
        </button>
      </div>
    </div>
  );
}
