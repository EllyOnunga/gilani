-- ============================================================
-- Phase 5: Security hardening & RLS gap closure
-- ============================================================

-- ============ MESSAGE_FEEDBACK — Full RLS ============
-- This table exists in production but had no migration or RLS policies.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_feedback' AND table_schema = 'public') THEN
    ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;

    -- Users can view their own feedback votes
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'message_feedback' AND policyname = 'Users view own feedback'
    ) THEN
      CREATE POLICY "Users view own feedback"
        ON public.message_feedback FOR SELECT TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    -- Users can insert their own votes
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'message_feedback' AND policyname = 'Users insert own feedback'
    ) THEN
      CREATE POLICY "Users insert own feedback"
        ON public.message_feedback FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Users can update (change) their own votes
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'message_feedback' AND policyname = 'Users update own feedback'
    ) THEN
      CREATE POLICY "Users update own feedback"
        ON public.message_feedback FOR UPDATE TO authenticated
        USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Users can delete (retract) their own votes
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'message_feedback' AND policyname = 'Users delete own feedback'
    ) THEN
      CREATE POLICY "Users delete own feedback"
        ON public.message_feedback FOR DELETE TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    -- Teachers can view feedback to assess session quality
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'message_feedback' AND policyname = 'Teachers view all feedback'
    ) THEN
      CREATE POLICY "Teachers view all feedback"
        ON public.message_feedback FOR SELECT TO authenticated
        USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
    END IF;

    -- Service role has full access
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'message_feedback' AND policyname = 'service_role_full_access'
    ) THEN
      CREATE POLICY "service_role_full_access"
        ON public.message_feedback FOR ALL TO service_role
        USING (true) WITH CHECK (true);
    END IF;

    -- Revoke direct write access from anon
    REVOKE INSERT, UPDATE, DELETE ON public.message_feedback FROM anon;
  END IF;
END $$;

-- ============ STUDY_PLANS — Prevent Teacher Tampering ============
-- Teachers should only READ plans, not modify or delete them.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'study_plans' AND table_schema = 'public') THEN
    -- Add a read policy for teachers (students already have full own-row access)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'study_plans' AND policyname = 'Teachers read all plans'
    ) THEN
      CREATE POLICY "Teachers read all plans"
        ON public.study_plans FOR SELECT TO authenticated
        USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
    END IF;
  END IF;
END $$;

-- ============ ANALYTICS_EVENTS — Deny Tampering ============
-- Events should be append-only for users; only service_role may delete.
REVOKE UPDATE, DELETE ON public.analytics_events FROM authenticated, anon;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access"
      ON public.analytics_events FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============ NOTIFICATIONS — Deny direct insert by users ============
-- Notifications should only be created by service_role (backend), not by users directly.
REVOKE INSERT ON public.notifications FROM authenticated, anon;

-- ============ PAYMENTS — Deny delete ============
-- Payments are financial records and must never be deleted even by service_role via client.
REVOKE DELETE ON public.payments FROM authenticated, anon;

-- ============ CONVERSATIONS — Prevent UPDATE of user_id ============
-- Even though users manage their own rows, they must not be able to reassign ownership.
-- This is enforced by the WITH CHECK (auth.uid() = user_id) in the existing policy, but
-- we add an explicit service_role policy to enable backend cascades.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access"
      ON public.conversations FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============ MESSAGES — service_role bypass ============
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access"
      ON public.messages FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;
