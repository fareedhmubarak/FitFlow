CREATE OR REPLACE VIEW public.v_recent_changes AS  SELECT id,
    table_name,
    record_id,
    operation,
    changed_fields,
        CASE
            WHEN (table_name = 'gym_members'::text) THEN (new_data ->> 'full_name'::text)
            WHEN (table_name = 'gym_gyms'::text) THEN (new_data ->> 'name'::text)
            ELSE record_id
        END AS record_name,
    created_at,
    changed_by
   FROM record_versions rv
  ORDER BY created_at DESC;
