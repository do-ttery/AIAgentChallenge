import { useParams } from "react-router-dom";

// T-14 QR 랜딩 화면 — mock 데이터로 구현 예정
export default function LandingPage() {
  const { machineId } = useParams();

  return (
    <main>
      <h1>QR 랜딩</h1>
      <p>{machineId}</p>
    </main>
  );
}
