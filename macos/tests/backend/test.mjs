import { PGlite } from '@electric-sql/pglite';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const root = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));
let checks=0;
const check=(a,b,message)=>{assert.deepEqual(a,b,message);checks++};
const bad=async(fn,pattern)=>{await assert.rejects(fn,pattern);checks++};
const admin='00000000-0000-0000-0000-000000000001';
const member='00000000-0000-0000-0000-000000000002';
const second='00000000-0000-0000-0000-000000000003';
const tourID='00000000-0000-0000-0000-000000000010';
const rpc=async(name,args)=>{const r=await db.query(`select to_jsonb(public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})) as result`,args);return r.rows[0].result};
async function identity(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function snapshot(){return (await db.query(`select jsonb_build_object('tour',to_jsonb(t),'member',(select to_jsonb(m) from public.tour_member_details m where tour_id=t.id),'participant',(select to_jsonb(p) from public.tour_participant_details p where tour_id=t.id)) s from public.tours t where id=$1`,[tourID])).rows[0].s;}
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email varchar,raw_user_meta_data jsonb default '{}',banned_until timestamptz,created_at timestamptz default now());
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;`);
 for (const file of readdirSync(root).filter(x=>x.endsWith('.sql')).sort()) {
   try { await db.exec(readFileSync(root+file,'utf8')); }
   catch(e){throw Error('Migration '+file+': '+e.message)}
 }
 console.log('All migrations loaded unchanged');
 await db.query(`insert into auth.users(id,email,raw_user_meta_data) values ($1,'admin@example.invalid','{"username":"testadmin","first_name":"Test","last_name":"Admin"}'),($2,'user@example.invalid','{"username":"testuser","first_name":"Test","last_name":"User"}'),($3,'second@example.invalid','{"username":"testsecond","first_name":"Test","last_name":"Second"}')`,[admin,member,second]);
 await db.query("insert into public.user_roles values ($1,'admin',now())",[admin]);
 await identity(member);
 await bad(()=>rpc('admin_get_tour_planning_summary',[tourID]),/FORBIDDEN/);
 await bad(()=>rpc('admin_save_tour',[tourID,null,{}, {}, {}]),/FORBIDDEN/);
 await identity(admin);
 await bad(()=>rpc('admin_get_tour_planning_summary',[tourID]),/TOUR_NOT_FOUND/);
 const values={title:'Testfahrt',region:'Testregion',start_date:'2027-06-18',end_date:'2027-06-20',max_vehicles:2,confirmation_mode:'automatic',status:'draft',license_plate_required:false,check_in_enabled:false,check_in_open_minutes_before:30,check_in_close_minutes_after:15,youtube_embed:true};
 check((await rpc('admin_save_tour',[tourID,null,values,{member_description:'Mitglieder'},{meeting_point_private:'Privat'}])).code,'OK');
 const before=await snapshot();
 await bad(()=>rpc('admin_save_tour',[tourID,null,values,{},{}]),/CONFLICT/);
 await db.query("update public.tours set title='PWA Änderung' where id=$1",[tourID]);
 await bad(()=>rpc('admin_save_tour',[tourID,before,{...values,title:'Mac Änderung'},{},{}]),/CONFLICT/);
 const current=await snapshot();
 check((await rpc('admin_save_tour',[tourID,current,{...values,status:'published'},{member_description:'Mitglieder'},{meeting_point_private:'Privat'}])).code,'OK');
 const register=async(uid)=>{await identity(uid);return rpc('register_for_tour',[tourID,'Test','Auto',300,null,1]);};
 check((await register(member)).code,'CONFIRMED');check((await register(second)).code,'CONFIRMED');
 await identity(admin);
 const withParticipants=await snapshot();
 await bad(()=>rpc('admin_save_tour',[tourID,withParticipants,{...values,status:'published',max_vehicles:1,title:'Must rollback'}, {member_description:'Bad'},{}]),/VEHICLE_DATA_INVALID/);
 check((await snapshot()).tour.title,'Testfahrt');
 // Two titles differing only in umlaut case must reduce to the same base slug
 // (matching the PWA's own slugify(), which lower-cases before stripping
 // diacritics) and therefore collide, receiving the numeric-suffix
 // disambiguation instead of silently diverging into two different slugs.
 const slugTourA='00000000-0000-0000-0000-000000000012';
 const slugTourB='00000000-0000-0000-0000-000000000013';
 check((await rpc('admin_save_tour',[slugTourA,null,{...values,title:'Über Nacht',start_date:'2027-08-01',end_date:'2027-08-01'},{},{}])).code,'OK');
 check((await rpc('admin_save_tour',[slugTourB,null,{...values,title:'über nacht',start_date:'2027-08-01',end_date:'2027-08-01'},{},{}])).code,'OK');
 check((await db.query('select slug from public.tours where id=$1',[slugTourA])).rows[0].slug,'uber-nacht-2027-08-01');
 check((await db.query('select slug from public.tours where id=$1',[slugTourB])).rows[0].slug,'uber-nacht-2027-08-01-2');
 const hotelID='00000000-0000-0000-0000-000000000020';
 check((await rpc('admin_save_tour_resource',['hotels',hotelID,tourID,null,{name:'Testhotel',night_date:'2027-06-18',sort_order:0}])).code,'OK');
 const hotelBefore=(await db.query('select to_jsonb(h) v from tour_hotel_suggestions h where id=$1',[hotelID])).rows[0].v;
 await db.query("update tour_hotel_suggestions set note='PWA changed' where id=$1",[hotelID]);
 await bad(()=>rpc('admin_save_tour_resource',['hotels',hotelID,tourID,hotelBefore,{name:'Mac changed'}]),/CONFLICT/);
 await bad(()=>rpc('admin_save_tour_resource',['users',hotelID,tourID,null,{}]),/INVALID_RESOURCE/);
 await bad(()=>rpc('admin_save_tour_resource',['hotels',hotelID,tourID,hotelBefore,{user_id:admin}]),/INVALID_PAYLOAD/);
 await bad(()=>rpc('admin_save_tour_resource',['hotels','00000000-0000-0000-0000-000000000021',tourID,null,{name:'Bad',night_date:'2027-06-20'}]),/INVALID_NIGHT_DATE/);
 // night_date_end/price_per_night: covers multiple consecutive nights + organizer's advertised nightly rate (§36.2/§36.5).
 const hotelRangeID='00000000-0000-0000-0000-000000000022';
 check((await rpc('admin_save_tour_resource',['hotels',hotelRangeID,tourID,null,{name:'Mehrnächte-Hotel',night_date:'2027-06-18',night_date_end:'2027-06-19',price_per_night:89.5,sort_order:1}])).code,'OK');
 check(Number((await db.query('select night_date_end,price_per_night from tour_hotel_suggestions where id=$1',[hotelRangeID])).rows[0].price_per_night),89.5);
 await bad(()=>rpc('admin_save_tour_resource',['hotels','00000000-0000-0000-0000-000000000023',tourID,null,{name:'Bad end',night_date:'2027-06-18',night_date_end:'2027-06-20'}]),/INVALID_NIGHT_DATE/);
 await bad(()=>rpc('admin_save_tour_resource',['hotels','00000000-0000-0000-0000-000000000024',tourID,null,{name:'Bad order',night_date:'2027-06-19',night_date_end:'2027-06-18'}]),/INVALID_NIGHT_DATE/);
 await bad(()=>rpc('admin_save_tour_resource',['hotels','00000000-0000-0000-0000-000000000025',tourID,null,{name:'Bad price',night_date:'2027-06-18',price_per_night:-5}]),/INVALID_PRICE/);
 // admin_save_tour() must also reject shortening the tour past a hotel range's
 // night_date_end, not just its night_date (Codex review on #19): hotelRangeID
 // covers 18./19.06., so shortening end_date to the 19th still leaves the 18th
 // a valid night on its own but abandons the suggestion's range end.
 const beforeShorten=await snapshot();
 await bad(()=>rpc('admin_save_tour',[tourID,beforeShorten,{end_date:'2027-06-19'},{},{}]),/DATE_RANGE_CONFLICT/);
 await bad(()=>rpc('admin_save_tour_resource',['hotels','00000000-0000-0000-0000-000000000026',tourID,null,{name:'Bad unit',night_date:'2027-06-18',price_unit:'€'}]),/tour_hotel_price_unit_chk/);
 await identity(member);check((await rpc('set_accommodation_confirmation',[tourID,'2027-06-18',true])).code,'OK');check((await rpc('set_accommodation_confirmation',[tourID,'2027-06-19',true])).code,'OK');
 check((await rpc('set_accommodation_choice',[tourID,'2027-06-18',true,'suggested_hotel',hotelRangeID])).code,'OK');
 await bad(()=>rpc('set_accommodation_choice',[tourID,'2027-06-19',true,'suggested_hotel','00000000-0000-0000-0000-000000000099']),/INVALID_HOTEL_SUGGESTION/);
 await identity(second);check((await rpc('set_accommodation_confirmation',[tourID,'2027-06-18',true])).code,'OK');
 check((await rpc('set_accommodation_choice',[tourID,'2027-06-18',true,'other_accommodation',null])).code,'OK');
 await identity(admin);
 const matrix=await rpc('admin_get_participant_matrix_bulk',[[tourID]]);
 check(matrix.length,2);check(matrix.find(r=>r.user_id===member).accommodation[0].hotel_name,'Mehrnächte-Hotel');check(matrix.find(r=>r.user_id===second).accommodation[0].choice,'other_accommodation');
 const stopID='00000000-0000-0000-0000-000000000030';
 const importID='00000000-0000-0000-0000-000000000031';
 await bad(()=>rpc('admin_create_restaurant',[importID,tourID,{title:'Rollback',sort_order:0},{ordering_enabled:false},[{id:'00000000-0000-0000-0000-000000000041',name:'Invalid',price:-1}]]),/INVALID_PRICE/);
 check((await db.query('select * from tour_stops where id=$1',[importID])).rows.length,0);
 check((await rpc('admin_create_restaurant',[importID,tourID,{title:'Imported',sort_order:0},{ordering_enabled:false},[{id:'00000000-0000-0000-0000-000000000041',name:'Soup',price:9.5}]])).code,'OK');
 // A retry with the exact same client-generated IDs and byte-identical payload (e.g. after
 // an ambiguous network failure) must succeed idempotently instead of falsely conflicting.
 check((await rpc('admin_create_restaurant',[importID,tourID,{title:'Imported',sort_order:0},{ordering_enabled:false},[{id:'00000000-0000-0000-0000-000000000041',name:'Soup',price:9.5}]])).code,'OK');
 await bad(()=>rpc('admin_create_restaurant',[importID,tourID,{title:'Duplicate'}, {}, []]),/CONFLICT/);
 const menuID='00000000-0000-0000-0000-000000000040';
 const breakStopID='00000000-0000-0000-0000-000000000032';
 check((await rpc('admin_save_tour_resource',['stops',breakStopID,tourID,null,{title:'Kaffeepause',type:'break',starts_at:'2027-06-18T14:00:00Z',sort_order:5}])).code,'OK');
 // Retrying the exact same create with a timestamptz field must succeed idempotently
 // even though to_jsonb() normalizes the stored value to Postgres's own "+00:00"
 // text form while the client still sends the original "Z"-suffixed ISO string.
 check((await rpc('admin_save_tour_resource',['stops',breakStopID,tourID,null,{title:'Kaffeepause',type:'break',starts_at:'2027-06-18T14:00:00Z',sort_order:5}])).code,'OK');
 check((await rpc('admin_save_tour_resource',['stops',stopID,tourID,null,{title:'Restaurant',type:'restaurant',sort_order:0}])).code,'OK');
 check((await rpc('admin_save_tour_resource',['restaurantSettings',stopID,stopID,null,{ordering_enabled:true}])).code,'OK');
 check((await rpc('admin_save_tour_resource',['menu',menuID,stopID,null,{name:'Pasta',price:12.50,is_available:true,is_vegetarian:true,is_vegan:false,sort_order:0}])).code,'OK');
 const regs=(await db.query('select * from tour_registrations where tour_id=$1',[tourID])).rows;
 for(const row of regs) check((await rpc('admin_update_meal_order',[stopID,row.id,[{menu_item_id:menuID,quantity:2,note:null}]])).code,'OK');
 const readOrder=async()=> (await db.query(`select to_jsonb(o)||jsonb_build_object('meal_order_items', (select jsonb_agg(jsonb_build_object('menu_item_id',i.menu_item_id,'quantity',i.quantity,'note',i.note)) from meal_order_items i where i.meal_order_id=o.id)) v from meal_orders o where restaurant_stop_id=$1 and registration_id=$2`,[stopID,regs[0].id])).rows[0].v;
 const orderBefore=await readOrder();
 check((await rpc('admin_replace_meal_order',[stopID,regs[0].id,orderBefore,[{menu_item_id:menuID,quantity:3,note:null}]])).code,'OK');
 await bad(()=>rpc('admin_replace_meal_order',[stopID,regs[0].id,orderBefore,[{menu_item_id:menuID,quantity:4,note:null}]]),/CONFLICT/);
 await rpc('admin_replace_meal_order',[stopID,regs[0].id,await readOrder(),[{menu_item_id:menuID,quantity:2,note:null}]]);
 let s=await rpc('admin_get_tour_planning_summary',[tourID]);
 check((await rpc('admin_set_checked_in',[regs[0].id,true])).code,'OK');
 check((await rpc('admin_get_tour_planning_summary',[tourID])).checked_in,1);
 check(s.confirmed_vehicles,2);check(s.people,4);check(s.nights.map(n=>n.confirmed),[2,1]);check(s.all_nights_confirmed,1);check(s.restaurants[0].orders,2);check(s.restaurants[0].dishes,4);
 await rpc('admin_remove_registration',[regs.find(r=>r.user_id===second).id,null]);
 s=await rpc('admin_get_tour_planning_summary',[tourID]);check(s.confirmed_vehicles,1);check(s.people,2);check(s.restaurants[0].orders,1);check(s.restaurants[0].dishes,2);check(s.nights.map(n=>n.confirmed),[1,1]);
 // Bundled multi-tour summary RPC (PR #18 review): one request for many tours,
 // a bad ID in the batch must not sink the whole call -- it comes back as its
 // own null-summary/error row instead.
 const bulk=(await db.query('select * from public.admin_get_tour_planning_summaries($1::uuid[])',[[tourID,'00000000-0000-0000-0000-000000000099']])).rows;
 check(bulk.length,2);
 const bulkOk=bulk.find(r=>r.tour_id===tourID);check(bulkOk.error,null);check(bulkOk.summary.confirmed_vehicles,1);
 const bulkMissing=bulk.find(r=>r.tour_id==='00000000-0000-0000-0000-000000000099');check(bulkMissing.summary,null);check(/TOUR_NOT_FOUND/.test(bulkMissing.error),true);
 // Bundled multi-tour registrations RPC (Dashboard "Teilnehmer"/"Bestätigte
 // Fahrzeuge" drilldowns): one request instead of a loop per tour (§4 N+1-Regel).
 const regsBulk=(await db.query('select * from public.admin_get_registrations_bulk($1::uuid[])',[[tourID]])).rows;
 check(regsBulk.length,regs.length);check(regsBulk.every(r=>r.tour_id===tourID),true);
 const deadlines=(await db.query('select * from public.admin_get_planning_deadlines_bulk($1::uuid[])',[[tourID]])).rows;
 check(deadlines.some(d=>d.kind==='hotel_booking'),false);check(deadlines.some(d=>d.kind==='meal_order'),false);
 // Guided duplicate flow: reusable structures are copied, while new-tour dates,
 // times, deadlines and prices are deliberately reset for conscious review.
 const copyTourID='00000000-0000-0000-0000-000000000014';
 check((await rpc('admin_save_tour',[copyTourID,null,{...values,title:'Planungskopie',start_date:'2027-09-01',end_date:'2027-09-03'},{},{}])).code,'OK');
 const copied=await rpc('admin_copy_tour_planning',[tourID,copyTourID,true,true,true]);
 check(copied.code,'OK');check(copied.hotels,2);check(copied.restaurants,2);
 const copiedHotel=(await db.query('select * from tour_hotel_suggestions where tour_id=$1 order by sort_order limit 1',[copyTourID])).rows[0];
 check(copiedHotel.night_date.toISOString().slice(0,10),'2027-09-01');check(copiedHotel.booking_deadline,null);check(copiedHotel.price_per_night,null);
 const copiedRestaurant=(await db.query("select * from tour_stops where tour_id=$1 and type='restaurant' and title='Restaurant'",[copyTourID])).rows[0];
 check(copiedRestaurant.starts_at,null);check(copiedRestaurant.reservation_status,'planned');
 const copiedMenu=(await db.query('select * from menu_items where restaurant_stop_id=$1',[copiedRestaurant.id])).rows[0];
 check(copiedMenu.name,'Pasta');check(copiedMenu.price,null);
 await bad(()=>rpc('admin_copy_tour_planning',[tourID,copyTourID,true,true,true]),/TARGET_PLANNING_NOT_EMPTY/);
 await identity(member);await bad(()=>db.query('select * from public.admin_get_registrations_bulk($1::uuid[])',[[tourID]]),/FORBIDDEN/);
 await identity(admin);
 await identity(member);await bad(()=>rpc('admin_save_tour_resource',['hotels',hotelID,tourID,null,{name:'Attack'}]),/FORBIDDEN/);
 await bad(()=>rpc('admin_get_participant_matrix_bulk',[[tourID]]),/FORBIDDEN/);
 await bad(()=>db.query('select * from public.admin_get_planning_deadlines_bulk($1::uuid[])',[[tourID]]),/FORBIDDEN/);
 await bad(()=>rpc('admin_copy_tour_planning',[tourID,copyTourID,true,true,true]),/FORBIDDEN/);
 await bad(()=>db.query('select * from public.admin_get_tour_planning_summaries($1::uuid[])',[[tourID]]),/FORBIDDEN/);
 await bad(()=>rpc('admin_replace_meal_order',[stopID,regs[0].id,orderBefore,[]]),/FORBIDDEN/);
 check((await db.query('select * from profiles where id=$1',[second])).rows.length,0);
 await db.exec('reset role');await db.query("delete from user_roles where user_id=$1 and role='admin'",[admin]);await identity(admin);
 await bad(()=>rpc('admin_get_tour_planning_summary',[tourID]),/FORBIDDEN/);
 console.log(`PASS: ${checks} assertions, real authenticated role, no production access.`);
} catch(e) {console.error('FAIL:',e.message);process.exitCode=1;}
await db.close();
