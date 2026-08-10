-- حد أدنى للمخزون لكل مادة (0 = بلا تنبيه)

ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "minQuantity" INTEGER NOT NULL DEFAULT 0;
