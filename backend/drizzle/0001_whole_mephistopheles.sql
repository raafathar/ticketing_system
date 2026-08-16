CREATE TABLE IF NOT EXISTS "parent_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "parent_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "parent_categories" ("name")
SELECT "name" FROM "ticket_categories" WHERE "parent_id" IS NULL ORDER BY "id";
--> statement-breakpoint
UPDATE "ticket_categories" AS c
SET "parent_id" = pc."id"
FROM "ticket_categories" AS p
JOIN "parent_categories" AS pc ON pc."name" = p."name"
WHERE c."parent_id" = p."id";
--> statement-breakpoint
ALTER TABLE "ticket_categories" DROP CONSTRAINT "ticket_categories_parent_id_ticket_categories_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_categories" ADD CONSTRAINT "ticket_categories_parent_id_parent_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parent_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
