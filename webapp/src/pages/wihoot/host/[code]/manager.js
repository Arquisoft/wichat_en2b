import HostManager from '@/components/wihoot/host/HostManager'
import { useRouter } from "next/router";

const HostManagerPage = () => {
    const router = useRouter();
    const { code, questions, time } = router.query;

    return (
        <HostManager code={code} questions={questions} time={time}/>
    )
}