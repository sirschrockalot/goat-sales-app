-- Create RPC function for matching Dispo script segments (only if vector extension is fully enabled)
DO $$ 
DECLARE
  vector_type_exists BOOLEAN;
BEGIN
  -- Check if vector type exists and extension is enabled
  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'vector' AND n.nspname = 'public'
  ) INTO vector_type_exists;
  
  IF vector_type_exists THEN
    BEGIN
      -- Try to create the function using fully qualified type reference
      EXECUTE format('
        CREATE OR REPLACE FUNCTION match_dispo_script_segments(
          query_embedding public.VECTOR(1536),
          match_threshold FLOAT DEFAULT 0.3,
          match_count INT DEFAULT 5
        )
        RETURNS TABLE (
          gate INTEGER,
          gate_name TEXT,
          similarity FLOAT
        )
        LANGUAGE plpgsql
        AS $func$
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
        $func$;');
      RAISE NOTICE 'Successfully created match_dispo_script_segments function';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not create match_dispo_script_segments function: %. Skipping.', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'vector type not found in public schema. Skipping match_dispo_script_segments function creation.';
  END IF;
END $$;

-- Add comment only if function exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'match_dispo_script_segments' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'COMMENT ON FUNCTION match_dispo_script_segments IS ''Vector similarity search for Dispo script segments''';
  ELSE
    RAISE NOTICE 'match_dispo_script_segments function does not exist. Skipping comment.';
  END IF;
END $$;
