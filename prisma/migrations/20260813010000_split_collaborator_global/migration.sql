-- CreateTable
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collaborator_name_key" ON "Collaborator"("name");

-- Migrar datos existentes: un Collaborator por cada nombre distinto ya
-- usado en ExternalCollaborator (agrupa por nombre, ya que Collaborator.name
-- es único — mismo criterio que Client.name). No se pierde ningún dato:
-- el perfil (nombre/empresa/contacto) pasa a Collaborator, el resto queda
-- igual en ExternalCollaborator.
INSERT INTO "Collaborator" ("id", "name", "company", "contact", "createdAt")
SELECT DISTINCT ON (name)
  gen_random_uuid()::text, name, company, contact, "createdAt"
FROM "ExternalCollaborator"
ORDER BY name, "createdAt" ASC;

-- AlterTable: agregar la FK, resolverla desde los datos ya migrados, y
-- recién ahí eliminar las columnas viejas (nunca se borra info sin antes
-- tener el reemplazo poblado).
ALTER TABLE "ExternalCollaborator" ADD COLUMN "collaboratorId" TEXT;

UPDATE "ExternalCollaborator" ec
SET "collaboratorId" = c."id"
FROM "Collaborator" c
WHERE c."name" = ec."name";

ALTER TABLE "ExternalCollaborator" ALTER COLUMN "collaboratorId" SET NOT NULL;

ALTER TABLE "ExternalCollaborator" DROP COLUMN "name";
ALTER TABLE "ExternalCollaborator" DROP COLUMN "company";
ALTER TABLE "ExternalCollaborator" DROP COLUMN "contact";

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCollaborator_collaboratorId_projectId_key" ON "ExternalCollaborator"("collaboratorId", "projectId");

-- AddForeignKey
ALTER TABLE "ExternalCollaborator" ADD CONSTRAINT "ExternalCollaborator_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
