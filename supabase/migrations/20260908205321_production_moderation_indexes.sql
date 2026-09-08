create index if not exists abuse_reports_handled_by_idx on public.abuse_reports(handled_by);
create index if not exists moderation_actions_report_id_idx on public.moderation_actions(report_id);
create index if not exists moderation_actions_admin_user_id_idx on public.moderation_actions(admin_user_id);
