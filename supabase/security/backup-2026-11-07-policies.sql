CREATE POLICY gym_api_logs_insert ON public.gym_api_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_api_logs_select_own_gym ON public.gym_api_logs AS PERMISSIVE FOR SELECT TO public USING (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_audit_logs_insert ON public.gym_audit_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_audit_logs_select_own_gym ON public.gym_audit_logs AS PERMISSIVE FOR SELECT TO public USING (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_click_logs_insert ON public.gym_click_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_click_logs_select_own_gym ON public.gym_click_logs AS PERMISSIVE FOR SELECT TO public USING (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY "Gym users can delete own gym diet plans" ON public.gym_diet_plans AS PERMISSIVE FOR DELETE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_diet_plans_insert ON public.gym_diet_plans AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_diet_plans_select ON public.gym_diet_plans AS PERMISSIVE FOR SELECT TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_diet_plans_update ON public.gym_diet_plans AS PERMISSIVE FOR UPDATE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_error_logs_insert ON public.gym_error_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_error_logs_select_own_gym ON public.gym_error_logs AS PERMISSIVE FOR SELECT TO public USING (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY "Allow authenticated read" ON public.gym_exercises AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY gym_expenses_delete ON public.gym_expenses AS PERMISSIVE FOR DELETE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_expenses_insert ON public.gym_expenses AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_expenses_select ON public.gym_expenses AS PERMISSIVE FOR SELECT TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_expenses_update ON public.gym_expenses AS PERMISSIVE FOR UPDATE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_food_items_insert ON public.gym_food_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY gym_food_items_select ON public.gym_food_items AS PERMISSIVE FOR SELECT TO authenticated USING ((is_active = true));
CREATE POLICY gym_food_items_update ON public.gym_food_items AS PERMISSIVE FOR UPDATE TO authenticated USING ((created_by = auth.uid()));
CREATE POLICY "Allow gym creation during signup" ON public.gym_gyms AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Demo gyms - allow anonymous delete" ON public.gym_gyms AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() IS NULL) AND ((is_protected = false) OR (is_protected IS NULL))));
CREATE POLICY "Demo gyms - allow anonymous update" ON public.gym_gyms AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() IS NULL) AND ((is_protected = false) OR (is_protected IS NULL))));
CREATE POLICY gym_gyms_delete_own ON public.gym_gyms AS PERMISSIVE FOR DELETE TO public USING ((id = get_current_gym_id()));
CREATE POLICY gym_gyms_select_own ON public.gym_gyms AS PERMISSIVE FOR SELECT TO public USING ((id = get_current_gym_id()));
CREATE POLICY gym_gyms_update_own ON public.gym_gyms AS PERMISSIVE FOR UPDATE TO public USING ((id = get_current_gym_id()));
CREATE POLICY installment_plans_delete_own_gym ON public.gym_installment_plans AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY installment_plans_insert_own_gym ON public.gym_installment_plans AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY installment_plans_select_own_gym ON public.gym_installment_plans AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY installment_plans_update_own_gym ON public.gym_installment_plans AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY installments_delete_own_gym ON public.gym_installments AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY installments_insert_own_gym ON public.gym_installments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY installments_select_own_gym ON public.gym_installments AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY installments_update_own_gym ON public.gym_installments AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY "Gym users can delete own gym diet assignments" ON public.gym_member_diet_assignments AS PERMISSIVE FOR DELETE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_diet_assign_insert ON public.gym_member_diet_assignments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_diet_assign_select ON public.gym_member_diet_assignments AS PERMISSIVE FOR SELECT TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_diet_assign_update ON public.gym_member_diet_assignments AS PERMISSIVE FOR UPDATE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_member_history_insert ON public.gym_member_history AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_member_history_select ON public.gym_member_history AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_member_progress_delete ON public.gym_member_progress AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_member_progress_insert ON public.gym_member_progress AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_member_progress_select ON public.gym_member_progress AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_member_progress_update ON public.gym_member_progress AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY "Gym users can delete own gym workout assignments" ON public.gym_member_workout_assignments AS PERMISSIVE FOR DELETE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_workout_assign_insert ON public.gym_member_workout_assignments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_workout_assign_select ON public.gym_member_workout_assignments AS PERMISSIVE FOR SELECT TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_workout_assign_update ON public.gym_member_workout_assignments AS PERMISSIVE FOR UPDATE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY "Demo members - allow anonymous delete" ON public.gym_members AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() IS NULL) AND is_demo_gym(gym_id)));
CREATE POLICY "Demo members - allow anonymous insert" ON public.gym_members AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() IS NULL) AND is_demo_gym(gym_id)));
CREATE POLICY "Demo members - allow anonymous update" ON public.gym_members AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() IS NULL) AND is_demo_gym(gym_id)));
CREATE POLICY gym_members_delete_own_gym ON public.gym_members AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_members_insert_own_gym ON public.gym_members AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_members_select_own_gym ON public.gym_members AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_members_update_own_gym ON public.gym_members AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY "Gym users can delete own gym freezes" ON public.gym_membership_freezes AS PERMISSIVE FOR DELETE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_freezes_insert ON public.gym_membership_freezes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_freezes_select ON public.gym_membership_freezes AS PERMISSIVE FOR SELECT TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_freezes_update ON public.gym_membership_freezes AS PERMISSIVE FOR UPDATE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_membership_periods_delete ON public.gym_membership_periods AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_membership_periods_insert ON public.gym_membership_periods AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_membership_periods_select ON public.gym_membership_periods AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_membership_periods_update ON public.gym_membership_periods AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY "Demo plans - allow anonymous delete" ON public.gym_membership_plans AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() IS NULL) AND is_demo_gym(gym_id)));
CREATE POLICY "Demo plans - allow anonymous insert" ON public.gym_membership_plans AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() IS NULL) AND is_demo_gym(gym_id)));
CREATE POLICY "Demo plans - allow anonymous update" ON public.gym_membership_plans AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() IS NULL) AND is_demo_gym(gym_id)));
CREATE POLICY gym_plans_delete_own_gym ON public.gym_membership_plans AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_plans_insert_own_gym ON public.gym_membership_plans AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_plans_select_own_gym ON public.gym_membership_plans AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_plans_update_own_gym ON public.gym_membership_plans AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_navigation_logs_insert ON public.gym_navigation_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_navigation_logs_select_own_gym ON public.gym_navigation_logs AS PERMISSIVE FOR SELECT TO public USING (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_notification_settings_delete ON public.gym_notification_settings AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_notification_settings_insert ON public.gym_notification_settings AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_notification_settings_select ON public.gym_notification_settings AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_notification_settings_update ON public.gym_notification_settings AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_notification_templates_delete ON public.gym_notification_templates AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_notification_templates_insert ON public.gym_notification_templates AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_notification_templates_select ON public.gym_notification_templates AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_notification_templates_update ON public.gym_notification_templates AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_notifications_delete ON public.gym_notifications AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_notifications_insert ON public.gym_notifications AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_notifications_select ON public.gym_notifications AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_notifications_update ON public.gym_notifications AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_schedule_delete_own_gym ON public.gym_payment_schedule AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_schedule_insert_own_gym ON public.gym_payment_schedule AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_schedule_select_own_gym ON public.gym_payment_schedule AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_schedule_update_own_gym ON public.gym_payment_schedule AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_payment_schedule_history_insert ON public.gym_payment_schedule_history AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_payment_schedule_history_select ON public.gym_payment_schedule_history AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY "Demo payments - allow anonymous delete" ON public.gym_payments AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() IS NULL) AND is_demo_gym(gym_id)));
CREATE POLICY "Demo payments - allow anonymous insert" ON public.gym_payments AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() IS NULL) AND is_demo_gym(gym_id)));
CREATE POLICY "Demo payments - allow anonymous update" ON public.gym_payments AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() IS NULL) AND is_demo_gym(gym_id)));
CREATE POLICY gym_payments_delete_own_gym ON public.gym_payments AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_payments_insert_own_gym ON public.gym_payments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_payments_select_own_gym ON public.gym_payments AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_payments_update_own_gym ON public.gym_payments AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_performance_logs_insert ON public.gym_performance_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_performance_logs_select_own_gym ON public.gym_performance_logs AS PERMISSIVE FOR SELECT TO public USING (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_receipts_delete ON public.gym_receipts AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_receipts_insert ON public.gym_receipts AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id = get_current_gym_id()));
CREATE POLICY gym_receipts_select ON public.gym_receipts AS PERMISSIVE FOR SELECT TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_receipts_update ON public.gym_receipts AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_sessions_insert ON public.gym_sessions AS PERMISSIVE FOR INSERT TO public WITH CHECK (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_sessions_select_own_gym ON public.gym_sessions AS PERMISSIVE FOR SELECT TO public USING (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY gym_sessions_update_own_gym ON public.gym_sessions AS PERMISSIVE FOR UPDATE TO public USING (((gym_id = get_current_gym_id()) OR (gym_id IS NULL)));
CREATE POLICY "Allow gym user creation during signup" ON public.gym_users AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated users can create gym user" ON public.gym_users AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY gym_users_delete_own_gym ON public.gym_users AS PERMISSIVE FOR DELETE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY gym_users_select_own_gym ON public.gym_users AS PERMISSIVE FOR SELECT TO public USING (((gym_id = get_current_gym_id()) OR (auth_user_id = auth.uid())));
CREATE POLICY gym_users_update_own_gym ON public.gym_users AS PERMISSIVE FOR UPDATE TO public USING ((gym_id = get_current_gym_id()));
CREATE POLICY "Gym users can delete own gym workout plans" ON public.gym_workout_plans AS PERMISSIVE FOR DELETE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_workout_plans_insert ON public.gym_workout_plans AS PERMISSIVE FOR INSERT TO public WITH CHECK ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_workout_plans_select ON public.gym_workout_plans AS PERMISSIVE FOR SELECT TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY gym_workout_plans_update ON public.gym_workout_plans AS PERMISSIVE FOR UPDATE TO public USING ((gym_id IN ( SELECT gym_users.gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid()))));
CREATE POLICY "Allow read access to version history" ON public.record_versions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow system inserts to version history" ON public.record_versions AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow gym-scoped deletes from images" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'images'::text) AND (name ~~ (('%'::text || ( SELECT (gym_users.gym_id)::text AS gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid())
 LIMIT 1)) || '%'::text))));
CREATE POLICY "Allow gym-scoped uploads to images" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'images'::text) AND (name ~~ (('%'::text || ( SELECT (gym_users.gym_id)::text AS gym_id
   FROM gym_users
  WHERE (gym_users.auth_user_id = auth.uid())
 LIMIT 1)) || '%'::text))));
CREATE POLICY "Allow public read access to images" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'images'::text));
CREATE POLICY "Allow service uploads to images" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK ((bucket_id = 'images'::text));