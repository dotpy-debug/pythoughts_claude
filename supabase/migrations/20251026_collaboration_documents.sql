-- Collaboration Documents Table
-- Stores Yjs CRDT state for real-time collaborative editing

CREATE TABLE IF NOT EXISTS collaboration_documents (
  -- Document identifier (format: "post:{postId}")
  document_id TEXT PRIMARY KEY,

  -- Yjs document state as binary (stored as JSONB array of integers)
  content JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_collaboration_documents_updated_at
  ON collaboration_documents(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE collaboration_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read collaboration documents
CREATE POLICY "Users can read collaboration documents for posts they have access to"
  ON collaboration_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE 'post:' || posts.id::text = collaboration_documents.document_id
      AND (
        posts.author_id = auth.uid()
        OR posts.status = 'published'
      )
    )
  );

-- Allow authenticated users to insert/update collaboration documents for their posts
CREATE POLICY "Users can update collaboration documents for their posts"
  ON collaboration_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE 'post:' || posts.id::text = collaboration_documents.document_id
      AND posts.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE 'post:' || posts.id::text = collaboration_documents.document_id
      AND posts.author_id = auth.uid()
    )
  );

-- Allow service role to manage all collaboration documents (for Hocuspocus server)
CREATE POLICY "Service role can manage all collaboration documents"
  ON collaboration_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_collaboration_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the update function
CREATE TRIGGER collaboration_documents_updated_at
  BEFORE UPDATE ON collaboration_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_collaboration_documents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE collaboration_documents IS 'Stores Yjs CRDT document state for real-time collaborative editing';
COMMENT ON COLUMN collaboration_documents.document_id IS 'Document identifier in format: post:{postId}';
COMMENT ON COLUMN collaboration_documents.content IS 'Yjs document state as JSONB array of integers (Uint8Array)';
