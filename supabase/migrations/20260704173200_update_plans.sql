-- Migrate existing paid plans to 'pro'
UPDATE public.profiles
SET plan = 'pro'
WHERE plan IN ('basic', 'premium', 'school');

UPDATE public.payments
SET plan = 'pro'
WHERE plan IN ('basic', 'premium', 'school');
