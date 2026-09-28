import { redirect } from 'next/navigation';

export default function MergePdfRedirectPage() {
  redirect('/tools/pdf-tools?mode=merge');
}
