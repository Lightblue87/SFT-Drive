-- Fix (Codex review on #19): admin_save_tour()'s DATE_RANGE_CONFLICT guard
-- only checked a hotel suggestion's night_date against the new tour end,
-- not night_date_end (§36.2/§36.5, 20260911050000). A suggestion covering
-- e.g. 18.–20.06. still passed the check after shortening the tour to end
-- on the 20th, because the 18th alone remained a valid night -- even though
-- the suggestion's range still reached into the now-invalid 20th night.
-- Fix: compare the suggestion's effective end (coalesce(night_date_end,
-- night_date)) against the new end_date, exactly like every other place
-- that reads this range (§36.14 Nachtrag 11.09.2026).
create or replace function public.admin_save_tour(
  p_id uuid, p_expected jsonb, p_tour jsonb, p_member jsonb, p_participant jsonb
) returns jsonb language plpgsql security invoker set search_path = public
as $$
declare
  old_t public.tours%rowtype;
  next_t public.tours%rowtype;
  old_m jsonb;
  old_p jsonb;
  result public.registration_result;
  base_slug text;
  candidate_slug text;
  slug_attempt int;
  allowed text[] := array['title','region','start_date','end_date','short_description','public_description',
    'route_length_km','meeting_point_public','meeting_at','planned_end_at','max_vehicles','confirmation_mode',
    'license_plate_required','min_power_ps','max_power_ps','min_driver_age','registration_open_at',
    'registration_close_at','passenger_edit_deadline_at','check_in_enabled','check_in_open_minutes_before',
    'check_in_close_minutes_after','cover_image_url','youtube_url','youtube_embed','status'];
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_id is null or jsonb_typeof(p_tour) is distinct from 'object'
    or jsonb_typeof(p_member) is distinct from 'object' or jsonb_typeof(p_participant) is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(p_tour) k where not(k = any(allowed)))
    or exists(select 1 from jsonb_object_keys(p_member) k where k <> 'member_description')
    or exists(select 1 from jsonb_object_keys(p_participant) k where k <> all(array['participant_description','meeting_point_private','kurviger_url','zello_url','whatsapp_group_url']))
  then raise exception 'INVALID_PAYLOAD'; end if;
  -- Serialize creates/retries with the same client-generated ID.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into old_t from public.tours where id = p_id for update;
  if found then
    select to_jsonb(m) into old_m from public.tour_member_details m where tour_id=p_id for update;
    select to_jsonb(p) into old_p from public.tour_participant_details p where tour_id=p_id for update;
    if p_expected is null or p_expected is distinct from jsonb_build_object('tour',to_jsonb(old_t),'member',old_m,'participant',old_p)
      then raise exception 'CONFLICT: Tour wurde inzwischen verändert. Neu laden und Änderungen vergleichen.' using errcode='40001'; end if;
    next_t := jsonb_populate_record(old_t, p_tour);
    if next_t.status = 'cancelled' and old_t.status <> 'cancelled' then raise exception 'USE_ADMIN_CANCEL_TOUR'; end if;
    if next_t.status is distinct from old_t.status and not (
      (old_t.status = 'draft' and next_t.status = 'published') or
      (old_t.status = 'published' and next_t.status in ('registration_closed','completed','archived')) or
      (old_t.status = 'registration_closed' and next_t.status in ('published','completed','archived')) or
      (old_t.status in ('completed','cancelled') and next_t.status = 'archived')
    ) then raise exception 'INVALID_STATUS_TRANSITION'; end if;
  else
    if p_expected is not null then raise exception 'CONFLICT: Tour nicht mehr vorhanden.' using errcode='40001'; end if;
    next_t := jsonb_populate_record(null::public.tours, p_tour);
    if next_t.status is distinct from 'draft' then raise exception 'NEW_TOUR_MUST_BE_DRAFT'; end if;
  end if;
  if coalesce(trim(next_t.title),'')='' or coalesce(trim(next_t.region),'')=''
    or next_t.start_date is null or next_t.end_date is null or next_t.end_date < next_t.start_date
    or next_t.max_vehicles is null or next_t.max_vehicles <= 0
    or (next_t.check_in_enabled and next_t.meeting_at is null)
    or next_t.registration_close_at < next_t.registration_open_at
    then raise exception 'INVALID_TOUR'; end if;
  -- Existing hotel confirmations/etappes must not become orphaned by date edits.
  if exists(select 1 from public.tour_stages where tour_id=p_id and stage_date not between next_t.start_date and next_t.end_date)
    or exists(select 1 from public.tour_hotel_suggestions where tour_id=p_id and (night_date < next_t.start_date or coalesce(night_date_end, night_date) >= next_t.end_date))
    or exists(select 1 from public.tour_accommodation_confirmations where tour_id=p_id and (night_date < next_t.start_date or night_date >= next_t.end_date))
    then raise exception 'DATE_RANGE_CONFLICT: Bestehende Tagesrouten oder Übernachtungen liegen außerhalb des neuen Zeitraums.'; end if;
  if old_t.id is null then
    base_slug := public.slugify_text(next_t.title);
    if base_slug = '' then base_slug := 'tour-' || replace(p_id::text,'-',''); end if;
    base_slug := base_slug || '-' || next_t.start_date::text;
    candidate_slug := base_slug;
    slug_attempt := 1;
    loop
      begin
        insert into public.tours (id,slug,title,region,start_date,end_date,max_vehicles,confirmation_mode,status,created_by)
          values(p_id, candidate_slug, next_t.title,next_t.region,next_t.start_date,next_t.end_date,
            next_t.max_vehicles,next_t.confirmation_mode,'draft',auth.uid());
        exit;
      exception when unique_violation then
        slug_attempt := slug_attempt + 1;
        if slug_attempt > 20 then raise; end if;
        candidate_slug := base_slug || '-' || slug_attempt::text;
      end;
    end loop;
  elsif old_t.max_vehicles is distinct from next_t.max_vehicles then
    result := public.admin_update_max_vehicles(p_id,next_t.max_vehicles);
    if result.code <> 'OK' then raise exception '%',result.code; end if;
  end if;
  update public.tours set
    title=next_t.title, region=next_t.region, start_date=next_t.start_date, end_date=next_t.end_date,
    short_description=next_t.short_description, public_description=next_t.public_description,
    route_length_km=next_t.route_length_km, meeting_point_public=next_t.meeting_point_public,
    meeting_at=next_t.meeting_at, planned_end_at=next_t.planned_end_at,
    confirmation_mode=next_t.confirmation_mode, license_plate_required=next_t.license_plate_required,
    min_power_ps=next_t.min_power_ps,max_power_ps=next_t.max_power_ps,min_driver_age=next_t.min_driver_age,
    registration_open_at=next_t.registration_open_at,registration_close_at=next_t.registration_close_at,
    passenger_edit_deadline_at=next_t.passenger_edit_deadline_at,check_in_enabled=next_t.check_in_enabled,
    check_in_open_minutes_before=next_t.check_in_open_minutes_before,check_in_close_minutes_after=next_t.check_in_close_minutes_after,
    cover_image_url=next_t.cover_image_url,youtube_url=next_t.youtube_url,youtube_embed=next_t.youtube_embed,
    status=next_t.status, updated_at=now(),
    published_at=case when next_t.status='published' then coalesce(old_t.published_at,now()) else old_t.published_at end
    where id=p_id;
  insert into public.tour_member_details(tour_id,member_description)
    values(p_id,p_member->>'member_description') on conflict(tour_id)
    do update set member_description=excluded.member_description;
  insert into public.tour_participant_details(tour_id,participant_description,meeting_point_private,kurviger_url,zello_url,whatsapp_group_url)
    values(p_id,p_participant->>'participant_description',p_participant->>'meeting_point_private',p_participant->>'kurviger_url',p_participant->>'zello_url',p_participant->>'whatsapp_group_url')
    on conflict(tour_id) do update set participant_description=excluded.participant_description,
      meeting_point_private=excluded.meeting_point_private,kurviger_url=excluded.kurviger_url,zello_url=excluded.zello_url,whatsapp_group_url=excluded.whatsapp_group_url;
  return jsonb_build_object('code','OK');
end;
$$;
revoke all on function public.admin_save_tour(uuid,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.admin_save_tour(uuid,jsonb,jsonb,jsonb,jsonb) to authenticated;
