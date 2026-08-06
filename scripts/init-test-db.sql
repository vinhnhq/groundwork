-- Runs once, on first container start (docker-entrypoint-initdb.d).
-- The integration test project needs a database of its own; creating it here
-- means `docker compose up` is the whole setup step.
CREATE DATABASE groundwork_test;
