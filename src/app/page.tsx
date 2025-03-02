import { redirect } from 'next/navigation';

export default async function Home() {
  // Redirect all users to the projects page
  redirect('/projects');
  
  // The following code will never be executed due to the redirect above
  return null;
}
