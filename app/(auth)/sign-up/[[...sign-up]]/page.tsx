import { redirect } from 'next/navigation'

// TESTING MODE — direkt zum Onboarding
export default function SignUpPage() {
  redirect('/onboarding')
}
