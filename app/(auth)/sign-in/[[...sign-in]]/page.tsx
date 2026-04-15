import { redirect } from 'next/navigation'

// TESTING MODE — direkt zum Onboarding
export default function SignInPage() {
  redirect('/dashboard')
}
