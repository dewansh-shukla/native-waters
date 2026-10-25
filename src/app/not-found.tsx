import Link from 'next/link';
export default function NotFound() {
  return <main style={{ maxWidth: '65ch', margin: '64px auto', padding: '24px' }}><h1>River or species not found</h1><p>This address does not match a published reference.</p><Link href='/'>Explore the river basins</Link><p><Link href='/field-guide'>Browse the field guide</Link></p></main>;
}
