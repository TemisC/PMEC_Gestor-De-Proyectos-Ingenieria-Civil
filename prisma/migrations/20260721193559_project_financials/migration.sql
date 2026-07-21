-- CreateEnum
CREATE TYPE "InvoiceSource" AS ENUM ('AGREEMENT', 'ADDITIONAL');

-- AlterTable
ALTER TABLE "ProjectMember" ADD COLUMN     "hourlyRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultHourlyRate" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ProjectAgreement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "offerUrl" TEXT,
    "contractUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAdditional" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAdditional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedInvoice" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" "InvoiceSource" NOT NULL DEFAULT 'AGREEMENT',
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pdfUrl" TEXT,
    "source" "InvoiceSource" NOT NULL DEFAULT 'AGREEMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAgreement_projectId_key" ON "ProjectAgreement"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectAgreement" ADD CONSTRAINT "ProjectAgreement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAdditional" ADD CONSTRAINT "ProjectAdditional_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedInvoice" ADD CONSTRAINT "PlannedInvoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
