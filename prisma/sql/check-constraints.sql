-- قيود إضافية تُطبَّق بعد prisma migrate
-- (Prisma لا يدعم CHECK constraints في الـ schema مباشرة)

-- ISSUE يتطلب machineId؛ باقي الأنواع تمنع machineId
ALTER TABLE "Transaction"
  ADD CONSTRAINT "transaction_machine_by_type_check"
  CHECK (
    ("type" = 'ISSUE' AND "machineId" IS NOT NULL)
    OR
    ("type" <> 'ISSUE' AND "machineId" IS NULL)
  );
