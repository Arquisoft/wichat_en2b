import WihootPage from '@/components/wihoot/WihootPage'
import { useRouter } from 'next/router';

const WihootPlay = () => {
    const router = useRouter();


    const { code, playerName } = router.query;

    return (<WihootPage code={code} name={playerName}/>)
}

export default WihootPlay;