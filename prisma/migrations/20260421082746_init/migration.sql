-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "customerName" TEXT,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quote_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuoteForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "formData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteForm_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuoteResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "moduleCosts" TEXT NOT NULL,
    "implMgmtCost" REAL NOT NULL,
    "businessExpense" REAL NOT NULL,
    "otherAmortization" REAL NOT NULL,
    "financeCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "profitRate" REAL NOT NULL,
    "taxRate" REAL NOT NULL,
    "procurementRate" REAL NOT NULL,
    "targetPreTaxRevenue" REAL NOT NULL,
    "finalQuote" REAL NOT NULL,
    "procurementAmount" REAL NOT NULL,
    "taxAmount" REAL NOT NULL,
    "implNaturalDays" REAL NOT NULL,
    "weightedPaymentArrival" REAL NOT NULL,
    "calcContext" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteResult_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuoteResultSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "resultData" TEXT NOT NULL,
    "formData" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteResultSnapshot_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingDirectRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleKey" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "conditions" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PricingStepRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleKey" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "stepSize" INTEGER NOT NULL,
    "freeSteps" INTEGER NOT NULL DEFAULT 0,
    "stepPrice" REAL NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PricingComboRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleKey" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "outputType" TEXT NOT NULL,
    "outputValue" REAL NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SystemParameter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paramKey" TEXT NOT NULL,
    "paramName" TEXT NOT NULL,
    "paramValue" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FormFieldRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "fieldOptions" TEXT,
    "visibleWhen" TEXT,
    "requiredWhen" TEXT,
    "validationRule" TEXT,
    "editableRoles" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "orderNo" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteForm_quoteId_key" ON "QuoteForm"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteResult_quoteId_key" ON "QuoteResult"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingDirectRule_ruleKey_key" ON "PricingDirectRule"("ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "PricingStepRule_ruleKey_key" ON "PricingStepRule"("ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "PricingComboRule_ruleKey_key" ON "PricingComboRule"("ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "SystemParameter_paramKey_key" ON "SystemParameter"("paramKey");

-- CreateIndex
CREATE UNIQUE INDEX "FormFieldRule_fieldKey_key" ON "FormFieldRule"("fieldKey");
