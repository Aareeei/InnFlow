-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "control";
CREATE SCHEMA IF NOT EXISTS "pms";

-- CreateTable
CREATE TABLE "control"."tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."guest_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "external_request_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "normalized_text" TEXT,
    "request_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "guest_name" TEXT,
    "room_number" TEXT,
    "reservation_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."workflow_executions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "guest_request_id" UUID NOT NULL,
    "temporal_workflow_id" TEXT NOT NULL,
    "temporal_run_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "total_duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."workflow_steps" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workflow_execution_id" UUID NOT NULL,
    "step_type" TEXT NOT NULL,
    "step_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "input_json" JSONB,
    "output_json" JSONB,
    "error_json" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."agent_runs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "guest_request_id" UUID NOT NULL,
    "agent_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_json" JSONB NOT NULL,
    "output_json" JSONB,
    "prompt_version" TEXT NOT NULL,
    "token_input" INTEGER NOT NULL DEFAULT 0,
    "token_output" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."tool_calls" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_run_id" UUID NOT NULL,
    "tool_name" TEXT NOT NULL,
    "input_json" JSONB NOT NULL,
    "output_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."human_approvals" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "guest_request_id" UUID NOT NULL,
    "workflow_execution_id" UUID NOT NULL,
    "action_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution_note" TEXT,

    CONSTRAINT "human_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."audit_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "metadata_json" JSONB,
    "trace_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."execution_artifacts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workflow_execution_id" UUID NOT NULL,
    "step_id" UUID,
    "artifact_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."failure_queue_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "guest_request_id" UUID NOT NULL,
    "workflow_execution_id" UUID NOT NULL,
    "failure_type" TEXT NOT NULL,
    "error_code" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "payload_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "first_failed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_failed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "failure_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."idempotency_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_status" INTEGER NOT NULL,
    "response_json" JSONB NOT NULL,
    "resource_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."system_configurations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "key" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms"."hotels" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms"."pms_users" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',

    CONSTRAINT "pms_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms"."guests" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms"."rooms" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "room_number" TEXT NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "room_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms"."reservations" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "room_id" UUID,
    "confirmation_code" TEXT NOT NULL,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3) NOT NULL,
    "guest_count" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "contact_pref" TEXT,
    "notes" TEXT,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms"."housekeeping_requests" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "room_number" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "receipt_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "housekeeping_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms"."maintenance_tickets" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "room_number" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "receipt_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms"."wake_up_calls" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "room_number" TEXT NOT NULL,
    "call_time" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "receipt_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wake_up_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms"."restaurant_bookings" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "guest_name" TEXT NOT NULL,
    "party_size" INTEGER NOT NULL,
    "booking_time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "special_requests" TEXT,
    "receipt_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms"."failure_configurations" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "config_json" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failure_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms"."browser_action_receipts" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "browser_action_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "control"."tenants"("slug");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "control"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "control"."users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "guest_requests_tenant_id_status_idx" ON "control"."guest_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "guest_requests_tenant_id_created_at_idx" ON "control"."guest_requests"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "guest_requests_tenant_id_idempotency_key_key" ON "control"."guest_requests"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "guest_requests_tenant_id_external_request_id_key" ON "control"."guest_requests"("tenant_id", "external_request_id");

-- CreateIndex
CREATE INDEX "workflow_executions_tenant_id_status_idx" ON "control"."workflow_executions"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_executions_temporal_workflow_id_key" ON "control"."workflow_executions"("temporal_workflow_id");

-- CreateIndex
CREATE INDEX "workflow_steps_workflow_execution_id_idx" ON "control"."workflow_steps"("workflow_execution_id");

-- CreateIndex
CREATE INDEX "workflow_steps_tenant_id_idx" ON "control"."workflow_steps"("tenant_id");

-- CreateIndex
CREATE INDEX "agent_runs_tenant_id_guest_request_id_idx" ON "control"."agent_runs"("tenant_id", "guest_request_id");

-- CreateIndex
CREATE INDEX "tool_calls_agent_run_id_idx" ON "control"."tool_calls"("agent_run_id");

-- CreateIndex
CREATE INDEX "human_approvals_tenant_id_status_idx" ON "control"."human_approvals"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_created_at_idx" ON "control"."audit_events"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_resource_type_resource_id_idx" ON "control"."audit_events"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "execution_artifacts_workflow_execution_id_idx" ON "control"."execution_artifacts"("workflow_execution_id");

-- CreateIndex
CREATE INDEX "failure_queue_items_tenant_id_status_idx" ON "control"."failure_queue_items"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idempotency_records_expires_at_idx" ON "control"."idempotency_records"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_tenant_id_idempotency_key_key" ON "control"."idempotency_records"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "system_configurations_tenant_id_key_key" ON "control"."system_configurations"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_tenant_id_key" ON "pms"."hotels"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "pms_users_hotel_id_username_key" ON "pms"."pms_users"("hotel_id", "username");

-- CreateIndex
CREATE INDEX "guests_hotel_id_idx" ON "pms"."guests"("hotel_id");

-- CreateIndex
CREATE INDEX "rooms_hotel_id_idx" ON "pms"."rooms"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_hotel_id_room_number_key" ON "pms"."rooms"("hotel_id", "room_number");

-- CreateIndex
CREATE INDEX "reservations_hotel_id_status_idx" ON "pms"."reservations"("hotel_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_hotel_id_confirmation_code_key" ON "pms"."reservations"("hotel_id", "confirmation_code");

-- CreateIndex
CREATE INDEX "housekeeping_requests_hotel_id_room_number_idx" ON "pms"."housekeeping_requests"("hotel_id", "room_number");

-- CreateIndex
CREATE UNIQUE INDEX "housekeeping_requests_hotel_id_receipt_id_key" ON "pms"."housekeeping_requests"("hotel_id", "receipt_id");

-- CreateIndex
CREATE INDEX "maintenance_tickets_hotel_id_idx" ON "pms"."maintenance_tickets"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_tickets_hotel_id_receipt_id_key" ON "pms"."maintenance_tickets"("hotel_id", "receipt_id");

-- CreateIndex
CREATE INDEX "wake_up_calls_hotel_id_room_number_idx" ON "pms"."wake_up_calls"("hotel_id", "room_number");

-- CreateIndex
CREATE UNIQUE INDEX "wake_up_calls_hotel_id_receipt_id_key" ON "pms"."wake_up_calls"("hotel_id", "receipt_id");

-- CreateIndex
CREATE INDEX "restaurant_bookings_hotel_id_idx" ON "pms"."restaurant_bookings"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_bookings_hotel_id_receipt_id_key" ON "pms"."restaurant_bookings"("hotel_id", "receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "failure_configurations_hotel_id_key" ON "pms"."failure_configurations"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "browser_action_receipts_hotel_id_receipt_id_key" ON "pms"."browser_action_receipts"("hotel_id", "receipt_id");

-- AddForeignKey
ALTER TABLE "control"."users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "control"."tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."guest_requests" ADD CONSTRAINT "guest_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "control"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."workflow_executions" ADD CONSTRAINT "workflow_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "control"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."workflow_executions" ADD CONSTRAINT "workflow_executions_guest_request_id_fkey" FOREIGN KEY ("guest_request_id") REFERENCES "control"."guest_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "control"."workflow_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."agent_runs" ADD CONSTRAINT "agent_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "control"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."agent_runs" ADD CONSTRAINT "agent_runs_guest_request_id_fkey" FOREIGN KEY ("guest_request_id") REFERENCES "control"."guest_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."tool_calls" ADD CONSTRAINT "tool_calls_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "control"."agent_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."human_approvals" ADD CONSTRAINT "human_approvals_guest_request_id_fkey" FOREIGN KEY ("guest_request_id") REFERENCES "control"."guest_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."human_approvals" ADD CONSTRAINT "human_approvals_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "control"."workflow_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."audit_events" ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "control"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."execution_artifacts" ADD CONSTRAINT "execution_artifacts_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "control"."workflow_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."execution_artifacts" ADD CONSTRAINT "execution_artifacts_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "control"."workflow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."failure_queue_items" ADD CONSTRAINT "failure_queue_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "control"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."failure_queue_items" ADD CONSTRAINT "failure_queue_items_guest_request_id_fkey" FOREIGN KEY ("guest_request_id") REFERENCES "control"."guest_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."failure_queue_items" ADD CONSTRAINT "failure_queue_items_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "control"."workflow_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."idempotency_records" ADD CONSTRAINT "idempotency_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "control"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."system_configurations" ADD CONSTRAINT "system_configurations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "control"."tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pms_users" ADD CONSTRAINT "pms_users_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "pms"."hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."guests" ADD CONSTRAINT "guests_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "pms"."hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."rooms" ADD CONSTRAINT "rooms_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "pms"."hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."reservations" ADD CONSTRAINT "reservations_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "pms"."hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."reservations" ADD CONSTRAINT "reservations_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "pms"."guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."reservations" ADD CONSTRAINT "reservations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "pms"."rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
