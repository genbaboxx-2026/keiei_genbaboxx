-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "JobCategory" AS ENUM ('manager', 'operator', 'fieldWorker', 'driver', 'gasCutter', 'other');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('vehicle', 'heavy_machine', 'attachment');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('owned', 'leased', 'rental');

-- CreateEnum
CREATE TYPE "DataType" AS ENUM ('annual', 'monthly');

-- CreateEnum
CREATE TYPE "CostOwnership" AS ENUM ('self', 'external');

-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('labor', 'heavy_machine', 'attachment', 'transport');

-- CreateEnum
CREATE TYPE "SimulationTargetType" AS ENUM ('revenue', 'profit_margin', 'what_if');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('insight', 'market', 'chat');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "industry_sub_type" VARCHAR(100),
    "fiscal_year_start_month" INTEGER NOT NULL DEFAULT 4,
    "annual_working_days" INTEGER NOT NULL DEFAULT 278,
    "bonus_count" INTEGER NOT NULL DEFAULT 0,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "employee_no" INTEGER NOT NULL,
    "name_or_title" VARCHAR(100) NOT NULL,
    "job_category" "JobCategory" NOT NULL,
    "monthly_gross_salary" INTEGER NOT NULL,
    "monthly_health_insurance" INTEGER NOT NULL,
    "monthly_pension" INTEGER NOT NULL,
    "monthly_dc_pension" INTEGER NOT NULL DEFAULT 0,
    "monthly_safety_fund" INTEGER NOT NULL DEFAULT 0,
    "monthly_other" INTEGER NOT NULL DEFAULT 0,
    "monthly_subtotal" INTEGER NOT NULL,
    "annual_total" INTEGER NOT NULL,
    "daily_cost" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "equipment_type" "EquipmentType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "spec" VARCHAR(255),
    "size_category" VARCHAR(20),
    "attachment_type" VARCHAR(50),
    "insurance_liability" INTEGER DEFAULT 0,
    "insurance_property" INTEGER DEFAULT 0,
    "insurance_vehicle" INTEGER DEFAULT 0,
    "insurance_compulsory" INTEGER DEFAULT 0,
    "vehicle_tax" INTEGER DEFAULT 0,
    "annual_inspection" INTEGER DEFAULT 0,
    "repair_maintenance" INTEGER DEFAULT 0,
    "depreciation_amount" INTEGER DEFAULT 0,
    "lease_amount" INTEGER DEFAULT 0,
    "is_leased" BOOLEAN NOT NULL DEFAULT false,
    "is_fixed_asset" BOOLEAN NOT NULL DEFAULT false,
    "ownership_type" "OwnershipType" NOT NULL DEFAULT 'owned',
    "annual_total_cost" INTEGER NOT NULL,
    "daily_cost" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_statements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "data_type" "DataType" NOT NULL DEFAULT 'annual',
    "period_month" INTEGER,
    "revenue" BIGINT NOT NULL DEFAULT 0,
    "cogs_salary" BIGINT NOT NULL DEFAULT 0,
    "cogs_bonus" BIGINT NOT NULL DEFAULT 0,
    "cogs_statutory_welfare" BIGINT NOT NULL DEFAULT 0,
    "cogs_subcontract" BIGINT NOT NULL DEFAULT 0,
    "cogs_waste_disposal" BIGINT NOT NULL DEFAULT 0,
    "cogs_power" BIGINT NOT NULL DEFAULT 0,
    "cogs_shipping" BIGINT NOT NULL DEFAULT 0,
    "cogs_travel" BIGINT NOT NULL DEFAULT 0,
    "cogs_consumables" BIGINT NOT NULL DEFAULT 0,
    "cogs_office_supplies" BIGINT NOT NULL DEFAULT 0,
    "cogs_repair" BIGINT NOT NULL DEFAULT 0,
    "cogs_utilities" BIGINT NOT NULL DEFAULT 0,
    "cogs_membership" BIGINT NOT NULL DEFAULT 0,
    "cogs_depreciation" BIGINT NOT NULL DEFAULT 0,
    "cogs_tax" BIGINT NOT NULL DEFAULT 0,
    "cogs_insurance" BIGINT NOT NULL DEFAULT 0,
    "cogs_professional_fee" BIGINT NOT NULL DEFAULT 0,
    "cogs_lease" BIGINT NOT NULL DEFAULT 0,
    "cogs_misc" BIGINT NOT NULL DEFAULT 0,
    "wip_ending" BIGINT NOT NULL DEFAULT 0,
    "sga_executive_compensation" BIGINT NOT NULL DEFAULT 0,
    "sga_salary" BIGINT NOT NULL DEFAULT 0,
    "sga_bonus" BIGINT NOT NULL DEFAULT 0,
    "sga_statutory_welfare" BIGINT NOT NULL DEFAULT 0,
    "sga_welfare" BIGINT NOT NULL DEFAULT 0,
    "sga_subcontract" BIGINT NOT NULL DEFAULT 0,
    "sga_advertising" BIGINT NOT NULL DEFAULT 0,
    "sga_entertainment" BIGINT NOT NULL DEFAULT 0,
    "sga_meeting" BIGINT NOT NULL DEFAULT 0,
    "sga_travel" BIGINT NOT NULL DEFAULT 0,
    "sga_communication" BIGINT NOT NULL DEFAULT 0,
    "sga_consumables" BIGINT NOT NULL DEFAULT 0,
    "sga_office_consumables" BIGINT NOT NULL DEFAULT 0,
    "sga_repair" BIGINT NOT NULL DEFAULT 0,
    "sga_utilities" BIGINT NOT NULL DEFAULT 0,
    "sga_membership" BIGINT NOT NULL DEFAULT 0,
    "sga_commission" BIGINT NOT NULL DEFAULT 0,
    "sga_rent" BIGINT NOT NULL DEFAULT 0,
    "sga_lease" BIGINT NOT NULL DEFAULT 0,
    "sga_insurance" BIGINT NOT NULL DEFAULT 0,
    "sga_tax" BIGINT NOT NULL DEFAULT 0,
    "sga_professional_fee" BIGINT NOT NULL DEFAULT 0,
    "sga_depreciation" BIGINT NOT NULL DEFAULT 0,
    "sga_bad_debt" BIGINT NOT NULL DEFAULT 0,
    "sga_management" BIGINT NOT NULL DEFAULT 0,
    "sga_misc" BIGINT NOT NULL DEFAULT 0,
    "cashout_capex" BIGINT NOT NULL DEFAULT 0,
    "cashout_loan_repayment" BIGINT NOT NULL DEFAULT 0,
    "cashout_other" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_classifications" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "item_key" VARCHAR(100) NOT NULL,
    "is_gb_cost" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_masters" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "ownership" "CostOwnership" NOT NULL,
    "category" "CostCategory" NOT NULL,
    "sub_category" VARCHAR(50) NOT NULL,
    "avg_daily_cost" INTEGER NOT NULL,
    "item_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "target_type" "SimulationTargetType" NOT NULL,
    "target_revenue" BIGINT,
    "target_profit_margin" DECIMAL(5,2),
    "target_operating_profit" BIGINT,
    "target_gross_margin" DECIMAL(5,2),
    "labor_cost_growth_rate" DECIMAL(5,2),
    "fuel_cost_growth_rate" DECIMAL(5,2),
    "waste_cost_growth_rate" DECIMAL(5,2),
    "subcontract_growth_rate" DECIMAL(5,2),
    "cpi_growth_rate" DECIMAL(5,2),
    "simulation_years" INTEGER NOT NULL,
    "what_if_params" JSONB,
    "result_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_analyses" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "analysis_type" "AnalysisType" NOT NULL,
    "input_context" JSONB,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "data_sources" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "birth_date" DATE,
    "hire_date" DATE,
    "department" VARCHAR(50),
    "position" VARCHAR(50),
    "retirement_age" INTEGER NOT NULL DEFAULT 65,
    "planned_retirement_date" DATE,
    "performance_override" DECIMAL(3,2),
    "notes" TEXT,
    "company_id" TEXT NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_attributions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "employee_id" TEXT NOT NULL,
    "attributed_revenue" BIGINT NOT NULL,
    "attributed_gross_profit" BIGINT NOT NULL,
    "project_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "revenue_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_simulations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "base_fiscal_year" INTEGER NOT NULL,
    "simulation_years" INTEGER NOT NULL,
    "target_revenues" JSONB NOT NULL,
    "subcontract_ratio" DECIMAL(5,2),
    "capacity_limits" JSONB,
    "salary_growth_rate" DECIMAL(5,2),
    "hiring_cost_params" JSONB,
    "result_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workforce_simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_curves" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "position" VARCHAR(50) NOT NULL,
    "age_from" INTEGER NOT NULL,
    "age_to" INTEGER NOT NULL,
    "coefficient" DECIMAL(3,2) NOT NULL,

    CONSTRAINT "performance_curves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT,
    "table_name" VARCHAR(100) NOT NULL,
    "record_id" VARCHAR(100) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "field_name" VARCHAR(100),
    "old_value" TEXT,
    "new_value" TEXT,
    "source" VARCHAR(20) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_records" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(20) NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "raw_response" JSONB,
    "extracted_data" JSONB,
    "user_corrections" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "target_table" VARCHAR(100),
    "target_record_id" VARCHAR(100),
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_sheets" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "cash_and_deposits" BIGINT NOT NULL DEFAULT 0,
    "notes_receivable" BIGINT NOT NULL DEFAULT 0,
    "accounts_receivable" BIGINT NOT NULL DEFAULT 0,
    "inventory" BIGINT NOT NULL DEFAULT 0,
    "prepaid_expenses" BIGINT NOT NULL DEFAULT 0,
    "current_assets_other" BIGINT NOT NULL DEFAULT 0,
    "buildings" BIGINT NOT NULL DEFAULT 0,
    "machinery" BIGINT NOT NULL DEFAULT 0,
    "vehicles" BIGINT NOT NULL DEFAULT 0,
    "tools_and_equipment" BIGINT NOT NULL DEFAULT 0,
    "land" BIGINT NOT NULL DEFAULT 0,
    "intangible_assets" BIGINT NOT NULL DEFAULT 0,
    "investments_and_other" BIGINT NOT NULL DEFAULT 0,
    "notes_payable" BIGINT NOT NULL DEFAULT 0,
    "accounts_payable" BIGINT NOT NULL DEFAULT 0,
    "short_term_loans" BIGINT NOT NULL DEFAULT 0,
    "accrued_expenses" BIGINT NOT NULL DEFAULT 0,
    "income_tax_payable" BIGINT NOT NULL DEFAULT 0,
    "current_liabilities_other" BIGINT NOT NULL DEFAULT 0,
    "long_term_loans" BIGINT NOT NULL DEFAULT 0,
    "lease_obligations" BIGINT NOT NULL DEFAULT 0,
    "fixed_liabilities_other" BIGINT NOT NULL DEFAULT 0,
    "capital_stock" BIGINT NOT NULL DEFAULT 0,
    "capital_surplus" BIGINT NOT NULL DEFAULT 0,
    "retained_earnings" BIGINT NOT NULL DEFAULT 0,
    "net_assets_other" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_targets" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "target_revenue" BIGINT,
    "target_gross_margin_rate" DECIMAL(5,2),
    "target_operating_margin_rate" DECIMAL(5,2),
    "target_subcontract_rate" DECIMAL(5,2),
    "target_waste_rate" DECIMAL(5,2),
    "target_labor_rate" DECIMAL(5,2),
    "target_equity_ratio" DECIMAL(5,2),
    "target_current_ratio" DECIMAL(5,2),
    "target_roe" DECIMAL(5,2),
    "target_debt_repayment_years" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_employees_company_year" ON "employees"("company_id", "fiscal_year");

-- CreateIndex
CREATE INDEX "idx_equipment_company_year" ON "equipment"("company_id", "fiscal_year");

-- CreateIndex
CREATE INDEX "idx_equipment_type" ON "equipment"("company_id", "fiscal_year", "equipment_type");

-- CreateIndex
CREATE INDEX "idx_financial_company_year" ON "financial_statements"("company_id", "fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "cost_classifications_company_id_fiscal_year_item_key_key" ON "cost_classifications"("company_id", "fiscal_year", "item_key");

-- CreateIndex
CREATE INDEX "idx_cost_master_company" ON "cost_masters"("company_id", "fiscal_year", "category");

-- CreateIndex
CREATE INDEX "idx_simulations_company" ON "simulations"("company_id", "fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_employee_id_key" ON "employee_profiles"("employee_id");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_table_name_record_id_idx" ON "audit_logs"("company_id", "table_name", "record_id");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "ocr_records_company_id_status_idx" ON "ocr_records"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "balance_sheets_company_id_fiscal_year_key" ON "balance_sheets"("company_id", "fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "company_targets_company_id_fiscal_year_key" ON "company_targets"("company_id", "fiscal_year");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_statements" ADD CONSTRAINT "financial_statements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_classifications" ADD CONSTRAINT "cost_classifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_masters" ADD CONSTRAINT "cost_masters_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_analyses" ADD CONSTRAINT "llm_analyses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_attributions" ADD CONSTRAINT "revenue_attributions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_simulations" ADD CONSTRAINT "workforce_simulations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_curves" ADD CONSTRAINT "performance_curves_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_sheets" ADD CONSTRAINT "balance_sheets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_targets" ADD CONSTRAINT "company_targets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
