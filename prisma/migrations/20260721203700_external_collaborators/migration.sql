-- CreateTable
CREATE TABLE "ExternalCollaborator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "contact" TEXT,
    "projectId" TEXT NOT NULL,
    "agreementAmount" DOUBLE PRECISION,
    "agreementUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCollaboratorAdditional" (
    "id" TEXT NOT NULL,
    "externalCollaboratorId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCollaboratorAdditional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCollaboratorPayment" (
    "id" TEXT NOT NULL,
    "externalCollaboratorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCollaboratorPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExternalCollaborator" ADD CONSTRAINT "ExternalCollaborator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCollaboratorAdditional" ADD CONSTRAINT "ExternalCollaboratorAdditional_externalCollaboratorId_fkey" FOREIGN KEY ("externalCollaboratorId") REFERENCES "ExternalCollaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCollaboratorPayment" ADD CONSTRAINT "ExternalCollaboratorPayment_externalCollaboratorId_fkey" FOREIGN KEY ("externalCollaboratorId") REFERENCES "ExternalCollaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
