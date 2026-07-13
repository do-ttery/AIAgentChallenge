import { useParams } from "react-router-dom";

// T-15 진행 화면 — mock 데이터로 구현 예정
export default function ProgressPage() {
  const { machineId } = useParams();

  return (
    <main>
      <h1>진행 화면</h1>
      <p>{machineId}</p>
    </main>
  );
}
