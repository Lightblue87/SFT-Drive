-- PR-Review-Feedback auf #18: das Mac-Dashboard sowie die neuen Restaurant-/
-- Hotel-Übersichten riefen admin_get_tour_planning_summary() einmal pro Tour
-- auf (N+1 HTTP-Requests -- bei 20 Touren rund 20 zusätzliche Roundtrips
-- allein für einen Dashboard-Load, relevant für §4 Kostenregel/Free-Tier-
-- Traffic). Neue gebündelte Funktion, die alle benötigten Summaries in genau
-- einem Request zurückgibt.
--
-- Ruft dafür bewusst die bestehende admin_get_tour_planning_summary() pro
-- ID intern auf, statt deren Berechnung zu duplizieren (§23.14 "keine
-- zweite Architektur für dieselbe Funktion"). Jede ID wird einzeln
-- abgefangen: schlägt die Berechnung für eine Tour fehl (z. B. gelöschte
-- Tour-ID), bricht das nicht das gesamte Bundle ab, sondern die betroffene
-- Zeile bekommt summary=null und einen Fehlertext -- der Client kann das
-- damit explizit anzeigen statt es als "0 Anfragen" misszuverstehen.
create or replace function public.admin_get_tour_planning_summaries(p_tour_ids uuid[])
returns table(tour_id uuid, summary jsonb, error text)
language plpgsql stable security invoker set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  foreach v_id in array coalesce(p_tour_ids, '{}') loop
    tour_id := v_id;
    begin
      summary := public.admin_get_tour_planning_summary(v_id);
      error := null;
    exception when others then
      summary := null;
      error := sqlerrm;
    end;
    return next;
  end loop;
end;
$$;
revoke all on function public.admin_get_tour_planning_summaries(uuid[]) from public, anon;
grant execute on function public.admin_get_tour_planning_summaries(uuid[]) to authenticated;
