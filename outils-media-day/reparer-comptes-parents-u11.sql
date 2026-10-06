-- Réparation des comptes U11 créés « joueur » par un parent (06/10/2026, demandée par Fouka) :
-- le compte devient un compte parent, rattaché à l'enfant par un lien confirmé ; la fiche de l'enfant
-- n'est plus « le compte » de personne ; une date de naissance d'adulte est effacée (la famille la redonnera).
begin;
do $rep$
declare f record; v_parent uuid; r text := ''; n int; ok boolean;
begin
  for f in
    select p.id, p.prenom, p.nom, p.user_id, p.date_naissance
      from player_profiles p join team_memberships tm on tm.player_id = p.id and tm.statut = 'active'
     where tm.team_id = '50f0da25-b7be-4248-9c5d-32f18b9b8aa4' and p.user_id is not null
  loop
    -- Le garde-fou proteger_identite_joueur ne laisse détacher un compte qu'à l'administration (rôle de service).
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
    select id into v_parent from parent_profiles where user_id = f.user_id;
    if v_parent is null then insert into parent_profiles (user_id) values (f.user_id) returning id into v_parent; end if;
    insert into parent_player_relationships (parent_id, player_id, relation_type, statut, confirmed_at)
    values (v_parent, f.id, 'parent', 'confirme', now())
    on conflict (parent_id, player_id) do update set statut = 'confirme', confirmed_at = now();
    perform set_config('sv.correction_identite', 'oui', true);
    perform set_config('sv.revendication_decidee', 'oui', true);
    update player_profiles
       set user_id = null,
           date_naissance = case when date_naissance <= (current_date - interval '18 years')::date then null else date_naissance end,
           updated_at = now()
     where id = f.id;
    insert into connect_profile_settings (user_id, account_type, profil_particulier) values (f.user_id, 'particulier', 'parent')
    on conflict (user_id) do update set account_type = 'particulier', profil_particulier = 'parent', updated_at = now();
    -- relecture, du point de vue du parent
    perform set_config('request.jwt.claims', json_build_object('sub', f.user_id, 'role', 'authenticated')::text, true);
    ok := public.is_confirmed_parent_of(f.id);
    select count(*) into n from public.connect_list_my_athletes();
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
    r := r || format(' | %s %s : parent confirmé %s, enfants vus par le compte %s, fiche détachée %s, date %s',
      f.prenom, f.nom, ok, n, (select user_id is null from player_profiles where id = f.id), (select coalesce(date_naissance::text, 'à redonner') from player_profiles where id = f.id));
  end loop;
  raise notice '%', r;
end $rep$;
commit;
