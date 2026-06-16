CREATE TYPE "public"."model_status" AS ENUM('not_downloaded', 'downloading', 'ready');--> statement-breakpoint
CREATE TABLE "llm_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" "model_status" DEFAULT 'not_downloaded' NOT NULL,
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "llm_models_name_unique" UNIQUE("name")
);
