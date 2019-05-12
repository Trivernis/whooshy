CREATE TABLE IF NOT EXISTS "user_sessions" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL,
	PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
)
WITH (OIDS=FALSE);
