-- IMPORTANT REQUEST
-- INACTIVE USERS
-- SELECT COUNT(*) FROM users WHERE last_login::DATE < (NOW() - '30 days'::INTERVAL)::DATE

--CREATE DATABASE api OWNER passionly;
--CREATE USER passionly WITH ENCRYPTED PASSWORD 'password';

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SET search_path TO public;

CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" varchar UNIQUE NOT NULL,
  "password" varchar NOT NULL,
  "firstname" varchar NOT NULL,
  "lastname" varchar NOT NULL,
  "email" varchar UNIQUE NOT NULL,
  "phone" varchar UNIQUE NOT NULL,
  "birthdate" date NOT NULL,
  "gender" smallint NOT NULL,
  "available" boolean NOT NULL DEFAULT TRUE,
  "survey_complete" boolean DEFAULT FALSE,
  "firebase_token" varchar,
  "fk_address" smallint UNIQUE NOT NULL,
  "ban_date" timestamp,
  "ban_reason_key" varchar,
  "last_login" timestamp NOT NULL,
  "language" char(2)
);

CREATE TABLE "users_tokens" (
  "id" SERIAL PRIMARY KEY,
  "refresh_token" varchar,
  "expiration" timestamp,
  "fk_userid" int NOT NULL,
  "device_uuid" varchar NOT NULL
);

CREATE TABLE "addresses" (
  "id" SERIAL PRIMARY KEY,
  "street_nr" smallint NOT NULL,
  "street" varchar NOT NULL,
  "city" varchar NOT NULL,
  "fk_country" smallint NOT NULL
);

CREATE TABLE "already_match" (
  "id" BIGSERIAL PRIMARY KEY,
  "fk_userid_1" smallint NOT NULL,
  "fk_userid_2" smallint NOT NULL
);

CREATE TABLE "countries" (
  "id" SERIAL PRIMARY KEY,
  "country_name" varchar UNIQUE NOT NULL,
  "iso" varchar UNIQUE NOT NULL
);

CREATE TABLE "questions" (
  "id" SERIAL PRIMARY KEY,
  "quest_key" varchar NOT NULL,
  "type" varchar NOT NULL,
  "fk_category" int NOT NULL,
  "criteria" varchar UNIQUE
);

CREATE TABLE "question_categories" (
  "id" SERIAL PRIMARY KEY,
  "icon" varchar,
  "quest_category_name_key" varchar NOT NULL
);

CREATE TABLE "answers" (
  "id" SERIAL PRIMARY KEY,
  "fk_question" int NOT NULL,
  "answer_key" varchar NOT NULL,
  "src" varchar,
  "min" int,
  "max" int,
  "step" int
);

CREATE TABLE "question_answer_points" (
  "id" SERIAL PRIMARY KEY,
  "fk_questionid" smallint NOT NULL,
  "fk_answerid" smallint UNIQUE NOT NULL,
  "score" smallint NOT NULL DEFAULT 1
);

CREATE TABLE "surveys" (
  "id" BIGSERIAL PRIMARY KEY,
  "fk_userid" int NOT NULL,
  "fk_questionid" int NOT NULL,
  "fk_answerid" int,
  "min" int,
  "max" int
);

CREATE TABLE "meeting" (
  "id" BIGSERIAL PRIMARY KEY,
  "fk_match" int NOT NULL,
  "requested_by" int NOT NULL,
  "fk_partner" int NOT NULL,
  "planned_at" timestamp NOT NULL,
  "user1_accepted" boolean,
  "user2_accepted" boolean
);

CREATE TABLE "partner" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar NOT NULL,
  "mark" numeric(3,2),
  "fk_address" int NOT NULL,
  "fk_partner_hours" int
);

CREATE TABLE "partner_hours" (
  "id" SERIAL PRIMARY KEY,
  "fk_partner_id" int NOT NULL,
  "fk_partner_hour_id" int NOT NULL
);

CREATE TABLE "partner_acc_parts" (
  "fk_partner_acc_id" int NOT NULL,
  "fk_partner_id" int NOT NULL
);

CREATE TABLE "partner_hour" (
  "id" SERIAL PRIMARY KEY,
  "day_id" int NOT NULL,
  "morning_start" time NOT NULL,
  "morning_end" time NOT NULL,
  "afternoon_start" time NOT NULL,
  "afternoon_end" time NOT NULL,
  "full_day" boolean NOT NULL
);

CREATE TABLE "partner_comment" (
  "id" SERIAL PRIMARY KEY,
  "fk_partner_id" int NOT NULL,
  "title" varchar NOT NULL,
  "comment" text NOT NULL,
  "mark" numeric(3,2) NOT NULL
);

CREATE TABLE "partner_event" (
  "id" SERIAL PRIMARY KEY,
  "fk_partner_id" int NOT NULL,
  "name" varchar NOT NULL,
  "description" varchar NOT NULL,
  "event_start" timestamp NOT NULL,
  "event_end" timestamp NOT NULL
);

CREATE TABLE "partner_account" (
  "id" SERIAL PRIMARY KEY,
  "username" varchar UNIQUE NOT NULL,
  "password" varchar NOT NULL,
  "email" varchar UNIQUE NOT NULL,
  "phone" varchar UNIQUE NOT NULL,
  "gender" smallint NOT NULL,
  "last_login" timestamp,
  "language" char(2)
);

CREATE TABLE "subscription" (
  "id" BIGSERIAL PRIMARY KEY,
  "fk_userid" int NOT NULL,
  "gender_desired" smallint NOT NULL,
  "match_left" int NOT NULL
);

CREATE TABLE "match" (
  "id" BIGSERIAL PRIMARY KEY,
  "fk_userid_1" int NOT NULL,
  "fk_userid_2" int NOT NULL,
  "display_at" timestamp NOT NULL,
  "active" boolean NOT NULL DEFAULT TRUE,
  "user1_notified" boolean NOT NULL DEFAULT FALSE,
  "user2_notified" boolean NOT NULL DEFAULT FALSE
);

ALTER TABLE "users" ADD FOREIGN KEY ("fk_address") REFERENCES "addresses" ("id");

ALTER TABLE "users_tokens" ADD FOREIGN KEY ("fk_userid") REFERENCES "users" ("id");

ALTER TABLE "addresses" ADD FOREIGN KEY ("fk_country") REFERENCES "countries" ("id");

ALTER TABLE "answers" ADD FOREIGN KEY ("fk_question") REFERENCES "questions" ("id");

ALTER TABLE "questions" ADD FOREIGN KEY ("fk_category") REFERENCES "question_categories" ("id");

ALTER TABLE "surveys" ADD FOREIGN KEY ("fk_userid") REFERENCES "users" ("id");

ALTER TABLE "surveys" ADD FOREIGN KEY ("fk_questionid") REFERENCES "questions" ("id");

ALTER TABLE "surveys" ADD FOREIGN KEY ("fk_answerid") REFERENCES "answers" ("id");

ALTER TABLE "meeting" ADD FOREIGN KEY ("fk_match") REFERENCES "match" ("id");

ALTER TABLE "meeting" ADD FOREIGN KEY ("requested_by") REFERENCES "users" ("id");

ALTER TABLE "meeting" ADD FOREIGN KEY ("fk_partner") REFERENCES "partner" ("id");

ALTER TABLE "partner" ADD FOREIGN KEY ("fk_address") REFERENCES "addresses" ("id");

ALTER TABLE "partner_hours" ADD FOREIGN KEY ("fk_partner_id") REFERENCES "partner" ("id");

ALTER TABLE "partner_hours" ADD FOREIGN KEY ("fk_partner_hour_id") REFERENCES "partner_hour" ("id");

ALTER TABLE "partner_event" ADD FOREIGN KEY ("fk_partner_id") REFERENCES "partner" ("id");

ALTER TABLE "partner_acc_parts" ADD FOREIGN KEY ("fk_partner_acc_id") REFERENCES "partner_account" ("id");

ALTER TABLE "partner_acc_parts" ADD FOREIGN KEY ("fk_partner_id") REFERENCES "partner" ("id");

ALTER TABLE "partner_comment" ADD FOREIGN KEY ("fk_partner_id") REFERENCES "partner" ("id");

ALTER TABLE "subscription" ADD FOREIGN KEY ("fk_userid") REFERENCES "users" ("id");

ALTER TABLE "match" ADD FOREIGN KEY ("fk_userid_1") REFERENCES "users" ("id");

ALTER TABLE "match" ADD FOREIGN KEY ("fk_userid_2") REFERENCES "users" ("id");

ALTER TABLE "already_match" ADD FOREIGN KEY ("fk_userid_1") REFERENCES "users" ("id");

ALTER TABLE "already_match" ADD FOREIGN KEY ("fk_userid_2") REFERENCES "users" ("id");

ALTER TABLE "question_answer_points" ADD FOREIGN KEY ("fk_questionid") REFERENCES "questions" ("id");

ALTER TABLE "question_answer_points" ADD FOREIGN KEY ("fk_answerid") REFERENCES "answers" ("id");


-- FUNCTIONS AND TRIGGER
CREATE OR REPLACE FUNCTION limitMeeting() RETURNS TRIGGER AS
$$
  BEGIN
    IF (SELECT COUNT(*) FROM meeting WHERE requested_by = NEW.id AND fk_match = NEW.fk_match) >= 3 THEN
      RAISE EXCEPTION 'Max meeting for user and match is exceeded';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER limit_meeting BEFORE INSERT ON meeting FOR EACH ROW EXECUTE PROCEDURE limitMeeting();

CREATE OR REPLACE FUNCTION updateSurveyValidity() RETURNS TRIGGER AS
$$
  BEGIN
    IF (SELECT COUNT(*) FROM questions) = (SELECT COUNT(DISTINCT fk_questionid) FROM surveys WHERE fk_userid = NEW.fk_userid) THEN
      UPDATE users SET survey_complete = TRUE WHERE id = NEW.fk_userid;
    ELSE
      UPDATE users SET survey_complete = FALSE WHERE id = NEW.fk_userid;
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER survey_validity AFTER INSERT OR UPDATE ON surveys FOR EACH ROW EXECUTE PROCEDURE updateSurveyValidity();

CREATE OR REPLACE FUNCTION updateSurveyComplete() RETURNS TRIGGER AS
$$
  BEGIN
    UPDATE users SET survey_complete = FALSE;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER survey_complete_watcher AFTER INSERT ON questions FOR EACH ROW EXECUTE PROCEDURE updateSurveyComplete();

CREATE OR REPLACE FUNCTION checkSubscriptionValidity() RETURNS TRIGGER AS
$$
  BEGIN
    IF (NEW.match_left = 0) THEN
      DELETE FROM subscription WHERE id = NEW.id;
      RETURN NULL;
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_validity AFTER INSERT OR UPDATE ON subscription FOR EACH ROW EXECUTE PROCEDURE checkSubscriptionValidity();


-- For test purpose
-- 1 Company [1]
INSERT INTO countries (country_name, iso) VALUES ('France', 'FR');
INSERT INTO addresses (street_nr, street, city, fk_country) VALUES 
(1, 'Rue Lambda 1', 'Auby', 1),
(2, 'Rue Lambda 2', 'Douai', 1),
(3, 'Rue Lambda 3', 'Marseille', 1),
(4, 'Rue Lambda 4', 'Paris', 1),
(5, 'Rue Lambda 5', 'Toulouse', 1);

-- Partner 'PASSIONLY' Douai
INSERT INTO partner_hour (day_id, morning_start, morning_end, afternoon_start, afternoon_end, full_day) VALUES (0, '8:00:00', '11:30:00', '13:00:00', '20:00:00', false);
INSERT INTO partner (name, mark, fk_address, fk_partner_hours) VALUES ('Passionly', 0.0, 2, null);
INSERT INTO partner_hours (fk_partner_id, fk_partner_hour_id) VALUES (1, 1);

UPDATE partner SET fk_partner_hours = 1 WHERE id = 1;

-- Partner 'PASSIONLY' Marseille
INSERT INTO partner_hour (day_id, morning_start, morning_end, afternoon_start, afternoon_end, full_day) VALUES (0, '8:00:00', '11:30:00', '13:00:00', '20:00:00', false);
INSERT INTO partner (name, mark, fk_address, fk_partner_hours) VALUES ('Passionly', 0.0, 3, null);
INSERT INTO partner_hours (fk_partner_id, fk_partner_hour_id) VALUES (2, 2);

UPDATE partner SET fk_partner_hours = 2 WHERE id = 2;

-- Partner 'PASSIONLY' Paris
INSERT INTO partner_hour (day_id, morning_start, morning_end, afternoon_start, afternoon_end, full_day) VALUES (0, '8:00:00', '11:30:00', '13:00:00', '20:00:00', false);
INSERT INTO partner (name, mark, fk_address, fk_partner_hours) VALUES ('Passionly', 0.0, 4, null);
INSERT INTO partner_hours (fk_partner_id, fk_partner_hour_id) VALUES (3, 3);

UPDATE partner SET fk_partner_hours = 3 WHERE id = 3;

-- Partner 'PASSIONLY' Toulouse
INSERT INTO partner_hour (day_id, morning_start, morning_end, afternoon_start, afternoon_end, full_day) VALUES (0, '8:00:00', '11:30:00', '13:00:00', '20:00:00', false);
INSERT INTO partner (name, mark, fk_address, fk_partner_hours) VALUES ('Passionly', 0.0, 5, null);
INSERT INTO partner_hours (fk_partner_id, fk_partner_hour_id) VALUES (3, 3);

UPDATE partner SET fk_partner_hours = 4 WHERE id = 4;

-- "password": $2a$10$dnDZhS4hqAR1rWnAwiMi/uqQfulrQbP9jO.d4h.v3fyQbyaIZMpGW
-- 1 User [1: "password"]
INSERT INTO users (username, password, firstname, lastname, email, phone, birthdate, gender, fk_address, last_login, language) VALUES
('killax', '$2a$10$dnDZhS4hqAR1rWnAwiMi/uqQfulrQbP9jO.d4h.v3fyQbyaIZMpGW', 'Dylan', 'Donne', 'Dylan@mail.fr', '0123456789', '1999-11-09', 0, 1, (NOW() - '1 days'::interval) ,'FR');
-- 3 Partners comment [1, 2, 3]
INSERT INTO partner_comment (fk_partner_id, title, comment, mark) VALUES
(1, 'Superbe !', 'Lieux de rencontre très intéressant !', 5.0),
(1, 'A revoir !', 'Beaucoup de bug sont encores présent !', 2.0);

-- 2 Questions Category [1, 2]
INSERT INTO question_categories (quest_category_name_key, icon) VALUES
('survey.category.1', 'description'),
('survey.category.2', 'verified_user');

-- 5 Questions {1: [1,2,3], 2: [4,5]}
INSERT INTO questions (quest_key, type, fk_category, criteria) VALUES 
('survey.question.1', 'image', 1, NULL),
('survey.question.2', 'choice', 1, NULL),
('survey.question.3', 'choice', 1, NULL),
('survey.question.4', 'choice', 1, NULL),
('survey.question.5', 'choice', 1, NULL),
('survey.question.6', 'choices', 1, NULL),
('survey.question.7', 'range', 2, 'age'),
('survey.question.8', 'slide', 2, 'distance'),
('survey.question.9', 'restrictive', 2, NULL);

-- 17 Answers
INSERT INTO answers (answer_key, fk_question, src, min, max, step) VALUES
('survey.answer.1', 1, 'https://duneuf.fr/wp-content/uploads/2018/08/bordeaux.jpg', NULL, NULL, NULL),
('survey.answer.2', 1, 'https://cdn.static01.nicematin.com/media/npo/mobile_1440w/2020/03/maxmatinnews004101.jpg', NULL, NULL, NULL),
('survey.answer.3', 1, 'https://www.dahrendorf-forum.eu/wp-content/uploads/2017/10/urban-rural-divide.jpg', NULL, NULL, NULL),
('survey.answer.4', 2, NULL, NULL, NULL, NULL),
('survey.answer.5', 2, NULL, NULL, NULL, NULL),
('survey.answer.no.never', 2, NULL, NULL, NULL, NULL),
('survey.answer.7', 3, NULL, NULL, NULL, NULL),
('survey.answer.8', 3, NULL, NULL, NULL, NULL),
('survey.answer.9', 4, NULL, NULL, NULL, NULL),
('survey.answer.10', 4, NULL, NULL, NULL, NULL),
('survey.answer.11', 4, NULL, NULL, NULL, NULL),
('survey.answer.12', 5, NULL, NULL, NULL, NULL),
('survey.answer.13', 5, NULL, NULL, NULL, NULL),
('survey.answer.14', 5, NULL, NULL, NULL, NULL),
('survey.answer.no.boring', 5, NULL, NULL, NULL, NULL),
('survey.answer.16', 6, NULL, NULL, NULL, NULL),
('survey.answer.17', 6, NULL, NULL, NULL, NULL),
('survey.answer.18', 6, NULL, NULL, NULL, NULL),
('survey.answer.19', 6, NULL, NULL, NULL, NULL),
('survey.answer.20', 6, NULL, NULL, NULL, NULL),
('survey.answer', 7, NULL, 18, 100, 1),
('survey.answer', 8, NULL, 0, 1000, 5),
('survey.answer.23', 9, NULL, NULL, NULL, NULL),
('survey.answer.24', 9, NULL, NULL, NULL, NULL),
('survey.answer.no.no_smoke', 9, NULL, NULL, NULL, NULL);

-- INSERT INTO question_answer_points (fk_questionid, fk_answerid, score) VALUES
-- (2, 3, 5);

-- INSERT INTO surveys (fk_userid, fk_questionid, fk_answerid, min, max) VALUES
-- (1, 1, 1, NULL, NULL),
-- (1, 2, NULL, 18, 20),
-- (1, 3, NULL, 0, 50),
-- (1, 4, 4, NULL, NULL),
-- (1, 4, 5, NULL, NULL),
-- (1, 5, 6, NULL, NULL),
-- (1, 6, 8, NULL, NULL),
-- (1, 7, 12, NULL, NULL),
-- (1, 7, 14, NULL, NULL);

INSERT INTO subscription (fk_userid, gender_desired, match_left) VALUES
(1, 1, 999);

-- INSERT INTO already_match (fk_userid_1, fk_userid_2) VALUES
-- (1, 5);

-- INSERT INTO match (fk_userid_1, fk_userid_2, display_at) VALUES
-- (1, 7, NOW());

-- INSERT INTO meeting (fk_match, requested_by, fk_partner, planned_at, user2_accepted) VALUES
-- (1, 7, 1, NOW(), TRUE),
-- (1, 7, 1, NOW(), TRUE);

GRANT USAGE ON SCHEMA public TO passionly;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO passionly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO passionly;
