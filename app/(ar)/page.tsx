import HomeClient from './HomeClient'
import './home.css'

export const revalidate = 60

export default function HomePage() {
  return <HomeClient />
}
