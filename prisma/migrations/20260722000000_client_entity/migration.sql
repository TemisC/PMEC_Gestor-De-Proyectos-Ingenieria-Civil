-- CreateEnum
CREATE TYPE "ClientContactType" AS ENUM ('TECHNICAL', 'ECONOMIC');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "generalContactName" TEXT,
    "generalContactEmail" TEXT,
    "generalContactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "ClientContactType" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- AlterTable (nullable primero, se llena antes de agregar la FK)
ALTER TABLE "Project" ADD COLUMN "clientId" TEXT;

-- Migración de datos: crear un Client real por cada valor distinto de
-- Project.client (string libre hasta ahora), y enlazar los proyectos.
INSERT INTO "Client" ("id", "name")
SELECT gen_random_uuid()::text, t."client"
FROM (SELECT DISTINCT "client" FROM "Project" WHERE "client" IS NOT NULL) t;

UPDATE "Project" p
SET "clientId" = c."id"
FROM "Client" c
WHERE p."client" = c."name";

-- Ya migrados los datos, se saca la columna vieja.
ALTER TABLE "Project" DROP COLUMN "client";

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
