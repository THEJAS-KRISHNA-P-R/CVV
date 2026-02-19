-- =====================================================
-- Storage Bucket Policies (Retry with safer checks)
-- =====================================================

-- 1. Create the 'reports' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS (Safe to run even if already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policies - Drop existing to avoid conflicts, then recreate

-- Allow public read access (SELECT)
DROP POLICY IF EXISTS "Public Access to Reports Bucket" ON storage.objects;
CREATE POLICY "Public Access to Reports Bucket"
ON storage.objects FOR SELECT
USING ( bucket_id = 'reports' );

-- Allow authenticated uploads (INSERT)
DROP POLICY IF EXISTS "Authenticated Users can Upload to Reports" ON storage.objects;
CREATE POLICY "Authenticated Users can Upload to Reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reports' AND
  auth.role() = 'authenticated'
);

-- Allow owners to update their files (UPDATE)
DROP POLICY IF EXISTS "Users can update own files in Reports" ON storage.objects;
CREATE POLICY "Users can update own files in Reports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'reports' AND
  auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'reports' AND
  auth.uid() = owner
);

-- Allow owners to delete their files (DELETE)
DROP POLICY IF EXISTS "Users can delete own files in Reports" ON storage.objects;
CREATE POLICY "Users can delete own files in Reports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reports' AND
  auth.uid() = owner
);
