select u.email,
       u.email_confirmed_at,
       u.raw_user_meta_data->>'msclkid' as msclkid,
       p.onboarding_completed
from auth.users u
join profiles p on p.id = u.id;