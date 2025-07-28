-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cert (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  creator text DEFAULT ''::text,
  head text DEFAULT ''::text,
  given text DEFAULT ''::text,
  date date,
  file_id text DEFAULT ''::text,
  uploader_mail text,
  CONSTRAINT cert_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cert_pdf (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now() UNIQUE,
  pdf_link text DEFAULT ''::text,
  given text DEFAULT ''::text,
  from text DEFAULT ''::text,
  date date,
  uid text DEFAULT ''::text,
  cert_name text DEFAULT ''::text,
  uploader_mail text,
  CONSTRAINT cert_pdf_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clubs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  code text,
  description text,
  instagram text,
  owners text,
  logo text,
  title text,
  urls text,
  CONSTRAINT clubs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.posts_instagram (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  user_name text,
  time timestamp with time zone,
  description text,
  image_links json DEFAULT '{"links":[]}'::json,
  post_link text,
  CONSTRAINT posts_instagram_pkey PRIMARY KEY (id)
);
CREATE TABLE public.url (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  club_code text,
  path text,
  redirect text,
  CONSTRAINT url_pkey PRIMARY KEY (id)
);