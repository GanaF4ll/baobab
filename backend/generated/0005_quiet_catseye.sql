ALTER TABLE "document_versions" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "current_version";