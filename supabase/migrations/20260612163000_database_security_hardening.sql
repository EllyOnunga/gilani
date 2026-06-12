-- ============ NOTIFICATION DELETE POLICY ============
-- Allows users to delete their own notifications (for the in-app delete button)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
      AND policyname = 'Users delete own notifications'
  ) THEN
    CREATE POLICY "Users delete own notifications"
      ON public.notifications
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Confirm DELETE privilege is granted (UPDATE already granted in prior migration)
GRANT DELETE ON public.notifications TO authenticated;

-- ============ PAYMENTS — DENY UPDATE/DELETE TO AUTHENTICATED ============
-- Users should never be able to modify payment records directly.
-- Only service_role (our server) should write to payments.
REVOKE UPDATE, DELETE ON public.payments FROM authenticated;

-- ============ RATE_LIMITS — DENY ALL FROM AUTHENTICATED ============
-- Already locked via RLS but also revoke table-level privileges as defense-in-depth.
REVOKE ALL ON public.rate_limits FROM authenticated, anon;
GRANT  ALL ON public.rate_limits TO service_role;

-- ============ AUDIT_LOGS — LOCK DOWN ============
-- audit_logs should be append-only from service_role; users must never UPDATE or DELETE entries.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'service_role_only'
    ) THEN
      CREATE POLICY "service_role_only" ON public.audit_logs
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- Users can read their own audit entries (optional transparency)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Users view own audit logs'
    ) THEN
      CREATE POLICY "Users view own audit logs" ON public.audit_logs
        FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;

    REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated, anon;
    GRANT SELECT ON public.audit_logs TO authenticated;
  END IF;
END $$;

-- ============ NOTE_CHUNKS — OWNERSHIP ISOLATION ============
-- Each user's vector chunks should only be readable by themselves.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'note_chunks' AND table_schema = 'public') THEN
    ALTER TABLE public.note_chunks ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'note_chunks' AND policyname = 'Users access own chunks'
    ) THEN
      CREATE POLICY "Users access own chunks" ON public.note_chunks
        FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'note_chunks' AND policyname = 'service_role_full_access'
    ) THEN
      CREATE POLICY "service_role_full_access" ON public.note_chunks
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ============ ESCALATIONS — STRENGTHEN ============
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escalations' AND table_schema = 'public') THEN
    ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

    -- Students can only see their own escalations
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'escalations' AND policyname = 'Students view own escalations'
    ) THEN
      CREATE POLICY "Students view own escalations" ON public.escalations
        FOR SELECT TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    -- Students can insert escalations for themselves only
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'escalations' AND policyname = 'Students create own escalations'
    ) THEN
      CREATE POLICY "Students create own escalations" ON public.escalations
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Teachers/admins can update escalations (status changes, reviewer assignment)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'escalations' AND policyname = 'Teachers update escalations'
    ) THEN
      CREATE POLICY "Teachers update escalations" ON public.escalations
        FOR UPDATE TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('teacher', 'admin')
          )
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'escalations' AND policyname = 'service_role_full_access'
    ) THEN
      CREATE POLICY "service_role_full_access" ON public.escalations
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- Deny students from deleting escalations
    REVOKE DELETE ON public.escalations FROM authenticated;
  END IF;
END $$;
