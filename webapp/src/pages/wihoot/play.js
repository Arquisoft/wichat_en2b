import WihootPage from '@/components/wihoot/WihootPage'
import { useRouter } from 'next/router';

const WihootPlay = () => {
    const router = useRouter();

    // Get the query parameters received from Creating the Quiz
    const { questions, time } = router.query;

    return (<WihootPage questions={questions} time={time} />)
}

export default WihootPlay;