-- Bisher konnte `reject_tour_registration` nur `pending`/`waitlisted`
-- Registrierungen ablehnen. Für eine bereits `confirmed` Registrierung gab es
-- im Admin-Bereich nur "Entfernen" (admin_remove_registration -> 'cancelled'),
-- was laut der vorherigen Migration (20260907081100) bewusst eine normale
-- Neuanmeldung gemäß Tourmodus erlaubt — für einen Admin, der jemanden aktiv
-- ablehnen will (z. B. Fehlverhalten), war das nicht ausreichend: die Person
-- konnte sich danach im Automatik-Modus einfach wieder automatisch bestätigen.
--
-- reject_tour_registration erlaubt jetzt zusätzlich 'confirmed' und löst in
-- diesem Fall die normale Wartelisten-Nachrücklogik aus (der freiwerdende
-- Platz muss genauso behandelt werden wie bei einer Stornierung/Entfernung).
create or replace function public.reject_tour_registration(p_registration_id uuid, p_reason text)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_reg public.tour_registrations%rowtype;
  v_was_confirmed boolean;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  select * into v_reg from public.tour_registrations where id = p_registration_id for update;
  if not found then
    return ('REGISTRATION_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_reg.status not in ('pending', 'waitlisted', 'confirmed') then
    return ('REGISTRATION_NOT_PENDING', v_reg.status, v_reg.id)::public.registration_result;
  end if;

  -- Tour sperren, bevor ein ggf. freiwerdender Platz nachgerückt wird.
  perform 1 from public.tours where id = v_reg.tour_id for update;

  v_was_confirmed := v_reg.status = 'confirmed';

  update public.tour_registrations
  set status = 'rejected', rejected_at = now(), rejected_by = v_admin_id, rejection_reason = p_reason, updated_at = now()
  where id = v_reg.id;

  if v_was_confirmed then
    perform public.promote_next_waitlisted(v_reg.tour_id);
  end if;

  return ('REJECTED', 'rejected', v_reg.id)::public.registration_result;
end;
$$;

revoke all on function public.reject_tour_registration(uuid, text) from public;
grant execute on function public.reject_tour_registration(uuid, text) to authenticated;
