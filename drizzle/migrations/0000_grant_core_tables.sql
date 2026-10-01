DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['profiles','user_roles','events','event_participants','mcq_questions','mcq_attempts','coding_questions','coding_test_cases','coding_attempts','coding_submissions','coding_drafts','shortlists','proctor_logs'] LOOP
  EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
END LOOP; END $$;
CREATE INDEX IF NOT EXISTS idx_ep_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_mcqq_event ON public.mcq_questions(event_id, position);
CREATE INDEX IF NOT EXISTS idx_cq_event ON public.coding_questions(event_id);
CREATE INDEX IF NOT EXISTS idx_tc_question ON public.coding_test_cases(question_id, position);