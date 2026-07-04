-- CreateTable
CREATE TABLE "role" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parent_id" UUID,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "real_name" TEXT,
    "role_id" UUID NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "last_login_at" TIMESTAMPTZ(6),
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seal" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "object_key" TEXT NOT NULL,
    "file_md5" CHAR(32) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "uploader_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "seal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seal_usage" (
    "id" UUID NOT NULL,
    "seal_id" UUID NOT NULL,
    "sign_task_id" UUID,
    "contract_id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "page" INTEGER NOT NULL,
    "pos_x" DOUBLE PRECISION NOT NULL,
    "pos_y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "ip" TEXT,
    "used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seal_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "serial_no" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "file_md5" CHAR(32) NOT NULL,
    "file_sha256" CHAR(64) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "remark" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "uploader_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_task" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_contact" TEXT NOT NULL,
    "link_token" CHAR(64) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMPTZ(6) NOT NULL,
    "revoke_reason" TEXT,
    "archived_object_key" TEXT,
    "archived_sha256" CHAR(64),
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sign_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signer_field" (
    "id" UUID NOT NULL,
    "sign_task_id" UUID NOT NULL,
    "field_type" INTEGER NOT NULL,
    "seal_id" UUID,
    "page" INTEGER NOT NULL,
    "pos_x" DOUBLE PRECISION NOT NULL,
    "pos_y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "filled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "signer_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_record" (
    "id" UUID NOT NULL,
    "sign_task_id" UUID NOT NULL,
    "signer_field_id" UUID NOT NULL,
    "sign_type" INTEGER NOT NULL,
    "object_key" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "device_info" TEXT,
    "signed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sign_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "biz_type" TEXT,
    "biz_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "operator_id" UUID,
    "operator_name" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" UUID,
    "detail" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_code_key" ON "role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE INDEX "user_username_idx" ON "user"("username");

-- CreateIndex
CREATE INDEX "user_role_id_idx" ON "user"("role_id");

-- CreateIndex
CREATE INDEX "seal_status_idx" ON "seal"("status");

-- CreateIndex
CREATE INDEX "seal_file_md5_idx" ON "seal"("file_md5");

-- CreateIndex
CREATE INDEX "seal_usage_seal_id_idx" ON "seal_usage"("seal_id");

-- CreateIndex
CREATE INDEX "seal_usage_sign_task_id_idx" ON "seal_usage"("sign_task_id");

-- CreateIndex
CREATE INDEX "seal_usage_contract_id_idx" ON "seal_usage"("contract_id");

-- CreateIndex
CREATE INDEX "contract_status_created_at_idx" ON "contract"("status", "created_at");

-- CreateIndex
CREATE INDEX "contract_file_md5_idx" ON "contract"("file_md5");

-- CreateIndex
CREATE INDEX "contract_uploader_id_idx" ON "contract"("uploader_id");

-- CreateIndex
CREATE INDEX "contract_serial_no_idx" ON "contract"("serial_no");

-- CreateIndex
CREATE UNIQUE INDEX "sign_task_link_token_key" ON "sign_task"("link_token");

-- CreateIndex
CREATE INDEX "sign_task_contract_id_idx" ON "sign_task"("contract_id");

-- CreateIndex
CREATE INDEX "sign_task_status_deadline_idx" ON "sign_task"("status", "deadline");

-- CreateIndex
CREATE INDEX "sign_task_signer_name_idx" ON "sign_task"("signer_name");

-- CreateIndex
CREATE INDEX "signer_field_sign_task_id_idx" ON "signer_field"("sign_task_id");

-- CreateIndex
CREATE INDEX "sign_record_sign_task_id_idx" ON "sign_record"("sign_task_id");

-- CreateIndex
CREATE INDEX "notification_user_id_is_read_idx" ON "notification"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notification_user_id_created_at_idx" ON "notification"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_operator_id_idx" ON "audit_log"("operator_id");

-- CreateIndex
CREATE INDEX "audit_log_action_created_at_idx" ON "audit_log"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_target_type_target_id_idx" ON "audit_log"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seal" ADD CONSTRAINT "seal_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seal_usage" ADD CONSTRAINT "seal_usage_seal_id_fkey" FOREIGN KEY ("seal_id") REFERENCES "seal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_task" ADD CONSTRAINT "sign_task_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_task" ADD CONSTRAINT "sign_task_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signer_field" ADD CONSTRAINT "signer_field_sign_task_id_fkey" FOREIGN KEY ("sign_task_id") REFERENCES "sign_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_record" ADD CONSTRAINT "sign_record_sign_task_id_fkey" FOREIGN KEY ("sign_task_id") REFERENCES "sign_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_record" ADD CONSTRAINT "sign_record_signer_field_id_fkey" FOREIGN KEY ("signer_field_id") REFERENCES "signer_field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

