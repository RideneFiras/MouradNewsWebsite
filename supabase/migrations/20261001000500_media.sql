-- El Borj — 05 media library

create table public.media (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  variants jsonb not null default '{}'::jsonb, -- {"480": path, "960": path, "1600": path}
  mime_type text not null default 'image/webp',
  width int,
  height int,
  size_bytes int,
  focal_x numeric(4,3) not null default 0.5 check (focal_x between 0 and 1),
  focal_y numeric(4,3) not null default 0.5 check (focal_y between 0 and 1),
  alt_ar text,
  alt_fr text,
  caption_ar text,
  caption_fr text,
  credit text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index media_created_idx on public.media (created_at desc);
create index media_uploaded_by_idx on public.media (uploaded_by);

alter table public.profiles
  add constraint profiles_avatar_media_fk foreign key (avatar_media_id) references public.media (id) on delete set null;
alter table public.tags
  add constraint tags_image_media_fk foreign key (image_media_id) references public.media (id) on delete set null;
