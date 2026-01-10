-- Create RPC function for matching Dispo script segments
CREATE OR REPLACE FUNCTION match_dispo_script_segments(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  gate INTEGER,
  gate_name TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dss.gate_number::INTEGER as gate,
    dss.gate_name,
    1 - (dss.embedding <=> query_embedding) as similarity
  FROM dispo_script_segments dss
  WHERE 1 - (dss.embedding <=> query_embedding) >= match_threshold
  ORDER BY dss.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION match_dispo_script_segments IS 'Vector similarity search for Dispo script segments';
