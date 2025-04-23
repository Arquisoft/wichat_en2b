import PlayerView from '@/components/wihoot/play/PlayerView'
import { useRouter } from 'next/router';

const WihootPlay= () => {
    const router = useRouter();

    const { code, playerName } = router.query;

    return (<PlayerView />)
}

export default WihootPlay;