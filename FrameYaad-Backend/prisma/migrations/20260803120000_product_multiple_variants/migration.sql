ALTER TABLE "variants" ADD COLUMN "product_id" UUID;

UPDATE "variants" v
SET "product_id" = p.id
FROM "products" p
WHERE p."variant_id" = v.id;

CREATE INDEX "variants_product_id_idx" ON "variants"("product_id");
ALTER TABLE "variants"
  ADD CONSTRAINT "variants_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
