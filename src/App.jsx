import { useState } from 'react';
import './App.css';

const machines = [
  { id: 1, type: '세탁기', status: '사용 가능' },
  { id: 2, type: '세탁기', status: '사용 중' },
  { id: 3, type: '건조기', status: '방치 의심' },
];

function App() {
  const [selectedMachine, setSelectedMachine] = useState(1);
  const [remainingTime, setRemainingTime] = useState('');
  const [isAlarmSet, setIsAlarmSet] = useState(false);

  const selected = machines.find((machine) => machine.id === selectedMachine);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!remainingTime) {
      alert('기계에 표시된 남은 시간을 입력해주세요.');
      return;
    }

    setIsAlarmSet(true);
  };

  return (
    <main className="page">
      <section className="hero">
        <p className="badge">소상공인이 겪는 문제 해결</p>
        <h1>WashPing</h1>
        <p className="subtitle">
          셀프빨래방을 위한 QR 기반 세탁물 수거 알림 및 방치 방지 서비스
        </p>

        <div className="hero-actions">
          <button>QR 스캔하기</button>
          <button className="secondary">점주 화면 보기</button>
        </div>
      </section>

      <section className="problem-section">
        <div className="card">
          <h2>문제 상황</h2>
          <p>
            셀프빨래방에서는 세탁이 끝난 뒤에도 세탁물이 오래 방치되는 문제가
            자주 발생합니다. 이용자는 종료 시간을 놓치기 쉽고, 다음 이용자는
            비어 있는 기계를 기다려야 합니다.
          </p>
        </div>

        <div className="card">
          <h2>해결 아이디어</h2>
          <p>
            세탁기와 건조기에 QR코드를 부착하고, 이용자가 QR을 스캔한 뒤
            기계에 표시된 남은 시간을 입력하면 수거 알림을 받을 수 있습니다.
            점주는 관리자 화면에서 방치 가능성과 고장 신고를 확인할 수 있습니다.
          </p>
        </div>
      </section>

      <section className="prototype-section">
        <div className="phone">
          <div className="phone-header">
            <span>WashPing</span>
            <span>QR 연결</span>
          </div>

          <div className="machine-info">
            <p className="small-label">현재 선택된 기계</p>
            <h2>
              {selected.type} {selected.id}번
            </h2>
            <p className={`status ${selected.status === '방치 의심' ? 'warning' : ''}`}>
              {selected.status}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="timer-form">
            <label htmlFor="time">기계에 표시된 남은 시간</label>
            <div className="input-row">
              <input
                id="time"
                type="number"
                placeholder="예: 38"
                value={remainingTime}
                onChange={(event) => setRemainingTime(event.target.value)}
              />
              <span>분</span>
            </div>

            <button type="submit">수거 알림 설정하기</button>
          </form>

          {isAlarmSet && (
            <div className="result-box">
              <strong>알림이 설정되었습니다.</strong>
              <p>약 {remainingTime}분 후 세탁물 수거 알림을 보내드립니다.</p>
              <button className="done-button">수거 완료</button>
            </div>
          )}
        </div>

        <div className="admin-panel">
          <h2>점주 관리자 화면</h2>
          <p className="admin-desc">
            기계별 이용 상태, 방치 가능성, 고장 신고를 한눈에 확인합니다.
          </p>

          <div className="machine-list">
            {machines.map((machine) => (
              <button
                key={machine.id}
                className={`machine-card ${selectedMachine === machine.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedMachine(machine.id);
                  setIsAlarmSet(false);
                  setRemainingTime('');
                }}
              >
                <span>
                  {machine.type} {machine.id}번
                </span>
                <strong>{machine.status}</strong>
              </button>
            ))}
          </div>

          <div className="notice-box">
            <h3>매장 공지</h3>
            <p>완료된 세탁물은 다음 이용자를 위해 빠른 수거를 부탁드립니다.</p>
          </div>
        </div>
      </section>

      <section className="feature-section">
        <h2>핵심 기능</h2>

        <div className="features">
          <div>
            <h3>기계별 QR</h3>
            <p>QR을 통해 몇 번 세탁기/건조기인지 바로 확인합니다.</p>
          </div>
          <div>
            <h3>수거 알림</h3>
            <p>사용자가 입력한 남은 시간을 기준으로 수거 알림을 제공합니다.</p>
          </div>
          <div>
            <h3>방치 방지</h3>
            <p>수거 완료가 확인되지 않으면 방치 가능성을 점주 화면에 표시합니다.</p>
          </div>
          <div>
            <h3>고장 신고</h3>
            <p>기계별 QR을 통해 정확한 기계 번호와 문제를 신고할 수 있습니다.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;