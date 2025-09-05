CREATE TABLE "file_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"content_type" text NOT NULL,
	"file_size" bigint NOT NULL,
	"storage_path" text NOT NULL,
	"content_hash" text,
	"uploaded_by" uuid NOT NULL,
	"message_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_attachment" ADD CONSTRAINT "file_attachment_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_attachment_uploaded_by_idx" ON "file_attachment" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "file_attachment_content_hash_idx" ON "file_attachment" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "file_attachment_message_id_idx" ON "file_attachment" USING btree ("message_id");