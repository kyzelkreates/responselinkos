-- ============================================================
-- ResponseLink OS™ — Supabase Storage Setup
-- supabase/storage.sql
--
-- ResponseLink OS™
-- AI-Assisted Community Welfare & Mobile Response Platform
-- Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
--
-- Run 11 — Complete Supabase Backend SQL + RLS + Realtime
--
-- ⚠ EXECUTION ORDER: Run AFTER realtime.sql
--
-- ⚠ STORAGE SECURITY:
--   All evidence buckets are PRIVATE by default.
--   No public access to welfare evidence files.
--   Signed URLs must be generated server-side for downloads.
--   Never expose file URLs directly in the frontend without auth check.
--
-- ⚠ EXECUTION STATUS:
--   SQL setup pack PREPARED but NOT EXECUTED.
-- ============================================================


-- ============================================================
-- 11. STORAGE BUCKETS
-- ============================================================

-- Supabase Storage uses the storage schema.
-- Buckets are created via SQL or the Supabase Dashboard.
-- These inserts create the buckets if they don't exist.

-- ── evidence-items — private ──────────────────────────────────
-- Purpose: Evidence photos, audio, files, forms for incidents/missions
-- Policy: private — no public access
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence-items',
  'evidence-items',
  false,                    -- PRIVATE
  52428800,                 -- 50MB max file size
  array[
    'image/jpeg','image/png','image/webp','image/heic',
    'audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm',
    'video/mp4','video/quicktime','video/webm',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- ── report-exports — private ──────────────────────────────────
-- Purpose: Exported report PDFs and data exports
-- Policy: private — admin/coordinator access only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-exports',
  'report-exports',
  false,                    -- PRIVATE
  104857600,                -- 100MB max
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/zip'
  ]
)
on conflict (id) do nothing;

-- ── organisation-assets — private (can be changed to public for branding) ──
-- Purpose: Organisation logos, branding assets
-- Policy: private by default; change to public if branding assets should be visible
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organisation-assets',
  'organisation-assets',
  false,                    -- PRIVATE (change to true if logo should be public)
  5242880,                  -- 5MB max
  array[
    'image/jpeg','image/png','image/webp','image/svg+xml',
    'image/gif','image/ico','image/vnd.microsoft.icon'
  ]
)
on conflict (id) do nothing;


-- ============================================================
-- 12. STORAGE POLICIES
-- ============================================================
-- Uses the storage.objects table + storage.foldername helper.


-- ── evidence-items policies ───────────────────────────────────

-- Staff (coordinators/supervisors/admins) can read org evidence
drop policy if exists "ev_storage_staff_select" on storage.objects;
create policy "ev_storage_staff_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'evidence-items'
    and (storage.foldername(name))[1] in (
      select id::text from public.organisations
      where id in (select public.current_user_org_ids())
    )
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner','admin','coordinator','supervisor','viewer']
    )
  );

-- Responders can upload evidence for their assigned missions
-- File path structure: {org_id}/{mission_id}/{filename}
drop policy if exists "ev_storage_responder_insert" on storage.objects;
create policy "ev_storage_responder_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'evidence-items'
    and (storage.foldername(name))[1] in (
      select id::text from public.organisations
      where id in (select public.current_user_org_ids())
    )
    and (
      public.has_org_role(
        (storage.foldername(name))[1]::uuid,
        array['owner','admin','coordinator','supervisor']
      )
      or (
        -- Responders can upload for their org
        public.is_org_member((storage.foldername(name))[1]::uuid)
        and public.has_org_role(
          (storage.foldername(name))[1]::uuid,
          array['responder']
        )
      )
    )
  );

-- Staff can delete evidence
drop policy if exists "ev_storage_staff_delete" on storage.objects;
create policy "ev_storage_staff_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'evidence-items'
    and (storage.foldername(name))[1] in (
      select id::text from public.organisations
      where id in (select public.current_user_org_ids())
    )
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner','admin','coordinator','supervisor']
    )
  );


-- ── report-exports policies ───────────────────────────────────

drop policy if exists "rep_storage_staff_select" on storage.objects;
create policy "rep_storage_staff_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'report-exports'
    and (storage.foldername(name))[1] in (
      select id::text from public.organisations
      where id in (select public.current_user_org_ids())
    )
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner','admin','coordinator','supervisor','viewer']
    )
  );

drop policy if exists "rep_storage_staff_insert" on storage.objects;
create policy "rep_storage_staff_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'report-exports'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner','admin','coordinator','supervisor']
    )
  );

drop policy if exists "rep_storage_admin_delete" on storage.objects;
create policy "rep_storage_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'report-exports'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner','admin']
    )
  );


-- ── organisation-assets policies ─────────────────────────────

drop policy if exists "org_assets_staff_select" on storage.objects;
create policy "org_assets_staff_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'organisation-assets'
    and (storage.foldername(name))[1] in (
      select id::text from public.organisations
      where id in (select public.current_user_org_ids())
    )
  );

drop policy if exists "org_assets_admin_insert" on storage.objects;
create policy "org_assets_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'organisation-assets'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner','admin']
    )
  );

drop policy if exists "org_assets_admin_delete" on storage.objects;
create policy "org_assets_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'organisation-assets'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner','admin']
    )
  );
