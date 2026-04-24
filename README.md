# AbidingAnchor

A faith-based application designed to help users grow in their spiritual journey through Bible reading, prayer, journaling, and community.

## Environment Variables

The following environment variables are required for the application to function properly:

### Required for Vercel/Netlify Deployment:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_GROQ_API_KEY`: Your Groq API key for AI Bible Study Companion
- `STRIPE_SECRET_KEY`: Your Stripe secret key for webhook handling
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret for verifying webhook events
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key for server-side operations

### Required for Local Development:

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Supabase Setup

### Storage Bucket Setup

To enable profile picture uploads, you need to create a storage bucket in Supabase:

1. Go to your Supabase dashboard
2. Navigate to **Storage** → **New bucket**
3. Create a bucket named `avatars`
4. Set **Public** to `true`
5. Click **Create bucket**

### Database Setup

The `profiles` table should have the following columns:

- `id` (text, primary key, references auth.users)
- `full_name` (text)
- `avatar_url` (text) - Stores the public URL of the user's profile picture
- `reading_streak` (integer)
- `last_book` (text)
- `last_chapter` (integer)
- `last_active_date` (date)
- `longest_streak` (integer)
- `streak_start_date` (date)
- `onboarding_complete` (boolean, default false) - Tracks if user completed onboarding
- `growth_goals` (text[]) - Array of selected growth goals from onboarding
- `faith_duration` (text) - User's faith duration from onboarding
- `daily_commitment` (text) - User's daily time commitment from onboarding
- `recommended_path` (text) - Personalized learning path recommendation
- `recommended_reading_plan` (text) - Recommended daily Bible reading plan
- `recommended_study_depth` (text) - Recommended study depth setting

The `profile_reports` table should have the following columns for reporting inappropriate profile pictures:

- `id` (uuid, primary key, default uuid_generate_v4())
- `reporter_id` (text, references profiles.id)
- `reported_profile_id` (text, references profiles.id)
- `reason` (text)
- `created_at` (timestamp with time zone, default now())
- `status` (text, default 'pending') - Values: 'pending', 'reviewed', 'resolved'

The `guided_study_progress` table should have the following columns for tracking guided study completion:

- `id` (text, primary key) - Format: `{user_id}_{book_name}_{chapter_number}`
- `user_id` (text, references profiles.id)
- `book_name` (text)
- `chapter_number` (integer)
- `completed_at` (timestamp with time zone, default now())
- `action_steps_completed` (integer, default 0)
- `reflection_saved` (boolean, default false)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
