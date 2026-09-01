DROP INDEX `users_email_unique`;--> statement-breakpoint
UPDATE `users` SET `email` = lower(trim(`email`)) WHERE `email` <> lower(trim(`email`));--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` ("email" COLLATE NOCASE);
