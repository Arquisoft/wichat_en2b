import HostManager from '@/components/wihoot/host/HostManager'
import { useRouter } from 'next/router'

export default function HostManagerPage() {
    const router = useRouter()
    const { code } = router.query
    return <HostManager />
}