-- =====================================================
-- FITFLOW PRODUCTION MIGRATION - TRIGGERS
-- Date: December 6, 2025
-- =====================================================

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER trigger_gym_gyms_updated_at
  BEFORE UPDATE ON gym_gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_gym_users_updated_at
  BEFORE UPDATE ON gym_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_gym_members_updated_at
  BEFORE UPDATE ON gym_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_gym_payment_schedule_updated_at
  BEFORE UPDATE ON gym_payment_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PAYMENT TRIGGERS
-- =====================================================

CREATE TRIGGER trigger_generate_receipt_number
  BEFORE INSERT ON gym_payments
  FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

CREATE TRIGGER trg_update_member_on_payment
  AFTER INSERT ON gym_payments
  FOR EACH ROW EXECUTE FUNCTION update_member_status_on_payment();

CREATE TRIGGER trigger_payment_update_schedule
  AFTER INSERT ON gym_payments
  FOR EACH ROW EXECUTE FUNCTION update_payment_schedule_status();

CREATE TRIGGER trg_clear_payment_schedule_reference
  BEFORE DELETE ON gym_payments
  FOR EACH ROW EXECUTE FUNCTION clear_payment_schedule_reference();

CREATE TRIGGER trg_clear_receipt_reference
  BEFORE DELETE ON gym_payments
  FOR EACH ROW EXECUTE FUNCTION clear_receipt_reference();

-- =====================================================
-- MEMBER TRIGGERS
-- =====================================================

-- NOTE: Removed trigger_member_create_schedule that was incorrectly generating
-- 12 payment schedule records on member creation. Payment schedules should
-- only be created when actual payments are made (handled by update_payment_schedule_status).

-- =====================================================
-- VERSION LOGGING TRIGGERS
-- =====================================================

CREATE TRIGGER trg_gym_gyms_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_gyms
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_users_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_users
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_members_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_members
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_membership_plans_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_membership_plans
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_payments_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_payments
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_payment_schedule_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_payment_schedule
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_membership_periods_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_membership_periods
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_receipts_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_receipts
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_member_progress_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_member_progress
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_member_history_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_member_history
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_notification_settings_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_notification_settings
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_notification_templates_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_notification_templates
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_notifications_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_notifications
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

CREATE TRIGGER trg_gym_sessions_version
  AFTER INSERT OR UPDATE OR DELETE ON gym_sessions
  FOR EACH ROW EXECUTE FUNCTION log_record_version();

-- =====================================================
-- PREVENT HARD DELETE TRIGGERS
-- =====================================================

CREATE TRIGGER trg_prevent_delete_gym_gyms
  BEFORE DELETE ON gym_gyms
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER trg_prevent_delete_gym_members
  BEFORE DELETE ON gym_members
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER trg_prevent_delete_gym_membership_plans
  BEFORE DELETE ON gym_membership_plans
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER trg_prevent_delete_gym_payments
  BEFORE DELETE ON gym_payments
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER trg_prevent_delete_gym_receipts
  BEFORE DELETE ON gym_receipts
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
