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
 const hotelID='00000000-0000-0000-0000-000000000020';
 check((await rpc('admin_save_tour_resource',['hotels',hotelID,tourID,null,{name:'Testhotel',night_date:'2027-06-18',sort_order:0}])).code,'OK');
 await bad(()=>rpc('admin_save_tour_resource',['hotels','00000000-0000-0000-0000-000000000021',tourID,null,{name:'Bad',night_date:'2027-06-20'}]),/INVALID_NIGHT_DATE/);
 await identity(member);check((await rpc('set_accommodation_confirmation',[tourID,'2027-06-18',true])).code,'OK');check((await rpc('set_accommodation_confirmation',[tourID,'2027-06-19',true])).code,'OK');
 await identity(second);check((await rpc('set_accommodation_confirmation',[tourID,'2027-06-18',true])).code,'OK');
 await identity(admin);
 const stopID='00000000-0000-0000-0000-000000000030';
 const importID='00000000-0000-0000-0000-000000000031';
 await bad(()=>rpc('admin_create_restaurant',[importID,tourID,{title:'Rollback',sort_order:0},{ordering_enabled:false},[{id:'00000000-0000-0000-0000-000000000041',name:'Invalid',price:-1}]]),/INVALID_PRICE/);
 check((await db.query('select * from tour_stops where id=$1',[importID])).rows.length,0);
 check((await rpc('admin_create_restaurant',[importID,tourID,{title:'Imported',sort_order:0},{ordering_enabled:false},[{id:'00000000-0000-0000-0000-000000000041',name:'Soup',price:9.5}]])).code,'OK');
 await bad(()=>rpc('admin_create_restaurant',[importID,tourID,{title:'Duplicate'}, {}, []]),/CONFLICT/);
 const menuID='00000000-0000-0000-0000-000000000040';
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
 check(s.confirmed_vehicles,2);check(s.people,4);check(s.nights.map(n=>n.confirmed),[2,1]);check(s.all_nights_confirmed,1);check(s.restaurants[0].orders,2);check(s.restaurants[0].dishes,4);
 await rpc('admin_remove_registration',[regs.find(r=>r.user_id===second).id,null]);
 s=await rpc('admin_get_tour_planning_summary',[tourID]);check(s.confirmed_vehicles,1);check(s.people,2);check(s.restaurants[0].orders,1);check(s.restaurants[0].dishes,2);check(s.nights.map(n=>n.confirmed),[1,1]);
 await identity(member);await bad(()=>rpc('admin_save_tour_resource',['hotels',hotelID,tourID,null,{name:'Attack'}]),/FORBIDDEN/);
 check((await db.query('select * from profiles where id=$1',[second])).rows.length,0);
 await db.exec('reset role');await db.query("delete from user_roles where user_id=$1 and role='admin'",[admin]);await identity(admin);
 await bad(()=>rpc('admin_get_tour_planning_summary',[tourID]),/FORBIDDEN/);
 console.log(`PASS: ${checks} assertions, real authenticated role, no production access.`);
} catch(e) {console.error('FAIL:',e.message);process.exitCode=1;}
await db.close();
