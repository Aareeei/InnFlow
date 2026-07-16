import { randomUUID } from 'node:crypto';
import { Context } from '@temporalio/activity';
import { prisma } from '@innflow/database';
import {
  BrowserAutomationError,
  BrowserVerificationError,
  type BrowserEvidence,
  type ExecutionResult,
  type PlannedTask,
  type TaskType,
  type VerificationResult,
} from '@innflow/domain';
import type { ExecuteBrowserTaskInput, VerifyBrowserTaskInput } from '@innflow/workflows';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import {
  HousekeepingPage,
  LoginPage,
  MaintenancePage,
  ReservationPage,
  RestaurantBookingPage,
  WakeUpCallPage,
} from '../page-objects/index.js';
import { getPmsCircuitBreaker } from '../lib/circuit-breaker.js';
import {
  applyBrowserFailureInjection,
  crashAfterActionIfConfigured,
  getBrowserFailureConfig,
  shouldInjectVerificationMismatch,
} from '../lib/failure-injection.js';
import { resolvePmsContext, resolveReservationId } from '../lib/pms-context.js';
import { buildDeterministicReceiptId } from '../lib/receipt-id.js';
import { uploadScreenshot } from '../lib/screenshots.js';

type TaskExecutionOutput = {
  confirmationMessage: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

function asJson(value: Record<string, unknown>): never {
  return value as never;
}

async function withBrowserSession<T>(
  input: ExecuteBrowserTaskInput,
  run: (page: Page, context: BrowserContext, browser: Browser) => Promise<T>,
): Promise<T> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    return await run(page, context, browser);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function findExistingReceipt(hotelId: string, receiptId: string) {
  return prisma.browserActionReceipt.findUnique({
    where: {
      hotelId_receiptId: {
        hotelId,
        receiptId,
      },
    },
  });
}

function heartbeat(detail: string): void {
  Context.current().heartbeat({ detail, at: new Date().toISOString() });
}

async function captureScreenshot(
  page: Page,
  input: ExecuteBrowserTaskInput,
  phase: 'before' | 'after' | 'verify',
): Promise<string> {
  const buffer = await page.screenshot({ fullPage: true });
  return uploadScreenshot({
    workflowExecutionId: input.workflowExecutionId,
    taskId: input.task.taskId,
    phase,
    buffer,
  });
}

async function executeTaskAction(
  task: PlannedTask,
  page: Page,
  pmsBaseUrl: string,
  hotelId: string,
  receiptId: string,
): Promise<TaskExecutionOutput> {
  const params = task.parameters;

  switch (task.taskType as TaskType) {
    case 'CREATE_HOUSEKEEPING_REQUEST': {
      const housekeeping = new HousekeepingPage(page, pmsBaseUrl);
      const confirmationMessage = await housekeeping.createRequest({
        roomNumber: String(params.roomNumber ?? '000'),
        item: String(params.item ?? 'supplies'),
        quantity: Number(params.quantity ?? 1),
        notes: params.notes ? String(params.notes) : undefined,
        receiptId,
      });

      const record = await prisma.housekeepingRequest.findFirst({
        where: { hotelId, receiptId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        confirmationMessage,
        resourceId: record?.id,
        metadata: { roomNumber: params.roomNumber, item: params.item },
      };
    }

    case 'CREATE_MAINTENANCE_TICKET': {
      const maintenance = new MaintenancePage(page, pmsBaseUrl);
      const confirmationMessage = await maintenance.createTicket({
        roomNumber: String(params.roomNumber ?? '000'),
        issue: String(params.issue ?? 'Maintenance issue'),
        priority: params.priority ? String(params.priority) : undefined,
        receiptId,
      });

      const record = await prisma.maintenanceTicket.findFirst({
        where: { hotelId, receiptId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        confirmationMessage,
        resourceId: record?.id,
        metadata: { roomNumber: params.roomNumber, issue: params.issue },
      };
    }

    case 'CREATE_WAKE_UP_CALL': {
      const wakeUp = new WakeUpCallPage(page, pmsBaseUrl);
      const callTime = String(params.callTime ?? params.time ?? '06:30');
      const confirmationMessage = await wakeUp.scheduleCall({
        roomNumber: String(params.roomNumber ?? '000'),
        callTime,
        receiptId,
      });

      const record = await prisma.wakeUpCall.findFirst({
        where: { hotelId, receiptId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        confirmationMessage,
        resourceId: record?.id,
        metadata: { roomNumber: params.roomNumber, callTime },
      };
    }

    case 'CREATE_RESTAURANT_BOOKING': {
      const restaurant = new RestaurantBookingPage(page, pmsBaseUrl);
      const confirmationMessage = await restaurant.createBooking({
        guestName: String(params.guestName ?? 'Guest'),
        partySize: Number(params.partySize ?? 2),
        bookingTime: String(params.bookingTime ?? new Date().toISOString()),
        specialRequests: params.specialRequests ? String(params.specialRequests) : undefined,
        receiptId,
      });

      const record = await prisma.restaurantBooking.findFirst({
        where: { hotelId, receiptId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        confirmationMessage,
        resourceId: record?.id,
        metadata: { guestName: params.guestName, partySize: params.partySize },
      };
    }

    case 'MODIFY_RESERVATION': {
      const reservationRef = String(params.reservationId ?? '');
      const reservationId = await resolveReservationId(hotelId, reservationRef);
      const reservationPage = new ReservationPage(page, pmsBaseUrl);
      const confirmationMessage = await reservationPage.modifyReservation({
        reservationId,
        notes: String(params.notes ?? 'Modified via InnFlow automation'),
        receiptId,
      });

      await prisma.browserActionReceipt.upsert({
        where: {
          hotelId_receiptId: { hotelId, receiptId },
        },
        create: {
          hotelId,
          receiptId,
          actionType: task.taskType,
          resourceId: reservationId,
          metadata: asJson({ notes: params.notes }),
        },
        update: {
          resourceId: reservationId,
          metadata: asJson({ notes: params.notes }),
        },
      });

      return {
        confirmationMessage,
        resourceId: reservationId,
        metadata: { notes: params.notes },
      };
    }

    case 'CANCEL_RESERVATION': {
      const reservationRef = String(params.reservationId ?? '');
      const reservationId = await resolveReservationId(hotelId, reservationRef);
      const reservationPage = new ReservationPage(page, pmsBaseUrl);
      const confirmationMessage = await reservationPage.cancelReservation(reservationId);

      await prisma.browserActionReceipt.upsert({
        where: {
          hotelId_receiptId: { hotelId, receiptId },
        },
        create: {
          hotelId,
          receiptId,
          actionType: task.taskType,
          resourceId: reservationId,
        },
        update: {
          resourceId: reservationId,
        },
      });

      return {
        confirmationMessage,
        resourceId: reservationId,
        metadata: { reason: params.reason },
      };
    }

    default:
      throw new BrowserAutomationError(`Unsupported browser task type: ${task.taskType}`, {
        taskType: task.taskType,
      });
  }
}

async function verifyTaskAction(
  task: PlannedTask,
  page: Page,
  pmsBaseUrl: string,
  hotelId: string,
): Promise<{ verified: boolean; observed: Record<string, unknown> }> {
  const params = task.parameters;

  switch (task.taskType as TaskType) {
    case 'CREATE_HOUSEKEEPING_REQUEST': {
      const housekeeping = new HousekeepingPage(page, pmsBaseUrl);
      const verified = await housekeeping.verifyRequestVisible(
        String(params.roomNumber ?? '000'),
        String(params.item ?? 'supplies'),
      );
      return { verified, observed: { roomNumber: params.roomNumber, item: params.item } };
    }

    case 'CREATE_MAINTENANCE_TICKET': {
      const maintenance = new MaintenancePage(page, pmsBaseUrl);
      const verified = await maintenance.verifyTicketVisible(
        String(params.roomNumber ?? '000'),
        String(params.issue ?? 'Maintenance issue'),
      );
      return { verified, observed: { roomNumber: params.roomNumber, issue: params.issue } };
    }

    case 'CREATE_WAKE_UP_CALL': {
      const wakeUp = new WakeUpCallPage(page, pmsBaseUrl);
      const callTime = String(params.callTime ?? params.time ?? '06:30');
      const verified = await wakeUp.verifyCallVisible(String(params.roomNumber ?? '000'), callTime);
      return { verified, observed: { roomNumber: params.roomNumber, callTime } };
    }

    case 'CREATE_RESTAURANT_BOOKING': {
      const restaurant = new RestaurantBookingPage(page, pmsBaseUrl);
      const verified = await restaurant.verifyBookingVisible(
        String(params.guestName ?? 'Guest'),
        Number(params.partySize ?? 2),
      );
      return { verified, observed: { guestName: params.guestName, partySize: params.partySize } };
    }

    case 'MODIFY_RESERVATION': {
      const reservationRef = String(params.reservationId ?? '');
      const reservationId = await resolveReservationId(hotelId, reservationRef);
      const reservationPage = new ReservationPage(page, pmsBaseUrl);
      const verified = await reservationPage.verifyReservationStatus(reservationId, 'CONFIRMED');
      return { verified, observed: { reservationId, status: 'CONFIRMED' } };
    }

    case 'CANCEL_RESERVATION': {
      const reservationRef = String(params.reservationId ?? '');
      const reservationId = await resolveReservationId(hotelId, reservationRef);
      const reservationPage = new ReservationPage(page, pmsBaseUrl);
      const verified = await reservationPage.verifyReservationStatus(reservationId, 'CANCELLED');
      return { verified, observed: { reservationId, status: 'CANCELLED' } };
    }

    default:
      throw new BrowserVerificationError(`Unsupported verification task type: ${task.taskType}`);
  }
}

export async function executeBrowserTask(input: ExecuteBrowserTaskInput): Promise<ExecutionResult> {
  const startedAt = Date.now();
  heartbeat('starting executeBrowserTask');

  try {
    const pmsContext = await resolvePmsContext(input.tenantId);
    const failureConfig = await getBrowserFailureConfig(pmsContext.hotelId);
    const receiptId = buildDeterministicReceiptId(input);

    heartbeat('resolved PMS context');

    const existingReceipt = await findExistingReceipt(pmsContext.hotelId, receiptId);
    if (existingReceipt?.resourceId) {
      const evidence: BrowserEvidence = {
        taskId: input.task.taskId,
        actionType: input.task.taskType,
        receiptId,
        screenshotAfterKey: `receipt/${receiptId}/cached`,
        confirmationMessage: 'Action already recorded (idempotent receipt)',
        metadata: {
          idempotent: true,
          resourceId: existingReceipt.resourceId,
        },
      };

      return {
        taskId: input.task.taskId,
        success: true,
        receiptId,
        evidence,
        durationMs: Date.now() - startedAt,
      };
    }

    await applyBrowserFailureInjection(failureConfig);

    if (failureConfig.browserSelectorTimeout) {
      throw new BrowserAutomationError('Injected browser selector timeout');
    }

    const circuitBreaker = getPmsCircuitBreaker();

    const result = await circuitBreaker.execute(async () =>
      withBrowserSession(input, async (page) => {
        heartbeat('browser session started');

        const loginPage = new LoginPage(page, pmsContext.pmsBaseUrl);
        await loginPage.login(pmsContext.username, pmsContext.password);
        heartbeat('logged into PMS');

        const screenshotBeforeKey = await captureScreenshot(page, input, 'before');
        heartbeat('captured before screenshot');

        const actionResult = await executeTaskAction(
          input.task,
          page,
          pmsContext.pmsBaseUrl,
          pmsContext.hotelId,
          receiptId,
        );

        const screenshotAfterKey = await captureScreenshot(page, input, 'after');
        heartbeat('captured after screenshot');

        await crashAfterActionIfConfigured(failureConfig);

        if (actionResult.resourceId) {
          await prisma.browserActionReceipt.upsert({
            where: {
              hotelId_receiptId: {
                hotelId: pmsContext.hotelId,
                receiptId,
              },
            },
            create: {
              hotelId: pmsContext.hotelId,
              receiptId,
              actionType: input.task.taskType,
              resourceId: actionResult.resourceId,
              metadata: asJson(actionResult.metadata ?? {}),
            },
            update: {
              resourceId: actionResult.resourceId,
              metadata: asJson(actionResult.metadata ?? {}),
            },
          });
        }

        const evidence: BrowserEvidence = {
          taskId: input.task.taskId,
          actionType: input.task.taskType,
          receiptId,
          screenshotBeforeKey,
          screenshotAfterKey,
          confirmationMessage: actionResult.confirmationMessage,
          metadata: {
            ...(actionResult.metadata ?? {}),
            resourceId: actionResult.resourceId,
            hotelId: pmsContext.hotelId,
          },
        };

        return evidence;
      }),
    );

    return {
      taskId: input.task.taskId,
      success: true,
      receiptId,
      evidence: result,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Browser task failed';
    return {
      taskId: input.task.taskId,
      success: false,
      errorMessage: message,
      durationMs: Date.now() - startedAt,
    };
  }
}

export async function verifyBrowserTask(input: VerifyBrowserTaskInput): Promise<VerificationResult> {
  heartbeat('starting verifyBrowserTask');

  try {
    const pmsContext = await resolvePmsContext(input.tenantId);
    const failureConfig = await getBrowserFailureConfig(pmsContext.hotelId);
    const receiptId =
      input.executionResult.receiptId ?? buildDeterministicReceiptId(input);

    if (shouldInjectVerificationMismatch(failureConfig)) {
      return {
        taskId: input.task.taskId,
        verified: false,
        expected: input.task.parameters,
        observed: { injected: true },
        receiptId,
        failureReason: 'Injected verification mismatch',
      };
    }

    const circuitBreaker = getPmsCircuitBreaker();

    const verification = await circuitBreaker.execute(async () =>
      withBrowserSession(input, async (page) => {
        heartbeat('verification browser session started');

        const loginPage = new LoginPage(page, pmsContext.pmsBaseUrl);
        await loginPage.login(pmsContext.username, pmsContext.password);

        const screenshotKey = await captureScreenshot(page, input, 'verify');
        heartbeat('captured verification screenshot');

        const outcome = await verifyTaskAction(
          input.task,
          page,
          pmsContext.pmsBaseUrl,
          pmsContext.hotelId,
        );

        return {
          ...outcome,
          screenshotKey,
        };
      }),
    );

    return {
      taskId: input.task.taskId,
      verified: verification.verified,
      expected: input.task.parameters,
      observed: verification.observed,
      screenshotKey: verification.screenshotKey,
      receiptId,
      failureReason: verification.verified ? undefined : 'Verification did not observe expected PMS state',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    return {
      taskId: input.task.taskId,
      verified: false,
      expected: input.task.parameters,
      observed: {},
      receiptId: input.executionResult.receiptId,
      failureReason: message,
    };
  }
}

export function buildReceiptId(taskId: string): string {
  return `receipt-${taskId}-${randomUUID()}`;
}
