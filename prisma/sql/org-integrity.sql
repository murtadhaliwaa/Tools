-- سلامة نفس-المؤسسة (منع ربط صفوف عبر مؤسسات مختلفة)
-- التشغيل عبر: npm run db:sql

-- Item.organizationId يجب أن يطابق Category.organizationId
CREATE OR REPLACE FUNCTION public.enforce_item_same_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "Category" c
    WHERE c.id = NEW."categoryId"
      AND c."organizationId" = NEW."organizationId"
  ) THEN
    RAISE EXCEPTION 'التصنيف لا ينتمي لنفس المؤسسة';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_item_same_org ON "Item";
CREATE TRIGGER trg_item_same_org
  BEFORE INSERT OR UPDATE OF "categoryId", "organizationId"
  ON "Item"
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_item_same_org();

-- Transaction: نفس مؤسسة الأداة / المكينة / المنفّذ
CREATE OR REPLACE FUNCTION public.enforce_transaction_same_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "Item" i
    WHERE i.id = NEW."itemId"
      AND i."organizationId" = NEW."organizationId"
  ) THEN
    RAISE EXCEPTION 'الأداة لا تنتمي لنفس المؤسسة';
  END IF;

  IF NEW."machineId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "Machine" m
    WHERE m.id = NEW."machineId"
      AND m."organizationId" = NEW."organizationId"
  ) THEN
    RAISE EXCEPTION 'المكينة لا تنتمي لنفس المؤسسة';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "Profile" p
    WHERE p.id = NEW."performedById"
      AND p."organizationId" = NEW."organizationId"
  ) THEN
    RAISE EXCEPTION 'المنفّذ لا ينتمي لنفس المؤسسة';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transaction_same_org ON "Transaction";
CREATE TRIGGER trg_transaction_same_org
  BEFORE INSERT OR UPDATE OF "organizationId", "itemId", "machineId", "performedById"
  ON "Transaction"
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_transaction_same_org();
