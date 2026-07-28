import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import StatusBadge from "./StatusBadge.jsx";

// CSS Modules는 실제로는 해시된 클래스명을 돌려주지만, 여기서는 StatusBadge.jsx가
// "어떤 클래스를 골랐는지"만 확인하면 되므로 프로퍼티 키를 그대로 돌려주는 프록시로 목업한다.
vi.mock("./StatusBadge.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop) => prop }),
}));

// vitest는 globals:true가 아니면 Testing Library의 자동 cleanup이 걸리지 않는다 —
// 매 테스트 뒤 렌더 결과를 직접 지워서 다음 테스트에 이전 DOM이 남지 않게 한다.
afterEach(cleanup);

describe("StatusBadge — 정상 케이스", () => {
  it("IDLE → '대기' 렌더, idle 톤 클래스", () => {
    const { container } = render(<StatusBadge status="IDLE" />);
    expect(screen.getByText("대기")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("idle");
  });


  it("RUNNING → '세탁 중' 렌더, live 점", () => {
    const { container } = render(<StatusBadge status="RUNNING" />);
    expect(screen.getByText("세탁 중")).toBeInTheDocument();
    expect(container.querySelector(".dot")).toHaveClass("live");
  });

  it("SPIN → '탈수' 렌더, live 점", () => {
    const { container } = render(<StatusBadge status="SPIN" />);
    expect(screen.getByText("탈수")).toBeInTheDocument();
    expect(container.querySelector(".dot")).toHaveClass("live");
  });

  it("DONE → '완료' 렌더, live 점 없음", () => {
    const { container } = render(<StatusBadge status="DONE" />);
    expect(screen.getByText("완료")).toBeInTheDocument();
    expect(container.querySelector(".dot")).not.toHaveClass("live");
  });

  it("COLLECTED → '수거 완료' 렌더", () => {
    render(<StatusBadge status="COLLECTED" />);
    expect(screen.getByText("수거 완료")).toBeInTheDocument();
  });

  it("ABANDONED + audience=owner → '방치' 렌더", () => {
    render(<StatusBadge status="ABANDONED" audience="owner" />);
    expect(screen.getByText("방치")).toBeInTheDocument();
  });

  it("ABANDONED + audience 생략(customer) → '방치'가 아니라 '수거 대기'", () => {
    render(<StatusBadge status="ABANDONED" />);
    expect(screen.getByText("수거 대기")).toBeInTheDocument();
    expect(screen.queryByText("방치")).not.toBeInTheDocument();
  });

  it("detail 전달 → 배지 안에 detail 텍스트도 렌더", () => {
    render(<StatusBadge status="ABANDONED" audience="owner" detail="32분" />);
    expect(screen.getByText("32분")).toBeInTheDocument();
  });

  it("solid=true → solid 클래스 붙음", () => {
    const { container } = render(<StatusBadge status="ABANDONED" solid />);
    expect(container.firstChild).toHaveClass("solid");
  });

  it("onDark=true → onDark 톤 클래스로 대체", () => {
    const { container } = render(<StatusBadge status="RUNNING" onDark />);
    expect(container.firstChild).toHaveClass("onDark");
    expect(container.firstChild).not.toHaveClass("running");
  });
});

describe("StatusBadge — 빈 값 / 기본값", () => {
  it("detail 생략 → detail용 span이 렌더 트리에 없음", () => {
    const { container } = render(<StatusBadge status="IDLE" />);
    expect(container.querySelector(".detail")).toBeNull();
  });

  it("detail='' (빈 문자열) → 렌더 안 됨", () => {
    const { container } = render(<StatusBadge status="IDLE" detail="" />);
    expect(container.querySelector(".detail")).toBeNull();
  });

  it("audience 생략 → customer 기본값으로 동작 (ABANDONED에서 '수거 대기')", () => {
    render(<StatusBadge status="ABANDONED" />);
    expect(screen.getByText("수거 대기")).toBeInTheDocument();
  });

  it("onDark·solid 생략 → 관련 클래스 없음", () => {
    const { container } = render(<StatusBadge status="IDLE" />);
    expect(container.firstChild).not.toHaveClass("onDark");
    expect(container.firstChild).not.toHaveClass("solid");
  });
});

describe("StatusBadge — 경계값", () => {
  it("audience=owner + ownerLabel 없는 상태(RUNNING) → 기본 라벨 그대로", () => {
    render(<StatusBadge status="RUNNING" audience="owner" />);
    expect(screen.getByText("세탁 중")).toBeInTheDocument();
  });

  it("detail='0' (문자열, truthy) → 렌더됨", () => {
    render(<StatusBadge status="IDLE" detail="0" />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("detail=0 (숫자, falsy) → 렌더 안 됨", () => {
    const { container } = render(<StatusBadge status="IDLE" detail={0} />);
    expect(container.querySelector(".detail")).toBeNull();
  });

  it("status 소문자('idle') → 매치 실패, 아무것도 렌더 안 됨", () => {
    const { container } = render(<StatusBadge status="idle" />);
    expect(container.firstChild).toBeNull();
  });
});

describe("StatusBadge — 실패(비정상 입력) 케이스", () => {
  it("status 생략(undefined) → null 반환, 에러 없음", () => {
    const { container } = render(<StatusBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("status='FOO' (정의 안 된 값) → null 반환", () => {
    const { container } = render(<StatusBadge status="FOO" />);
    expect(container.firstChild).toBeNull();
  });

  it("status=null → null 반환", () => {
    const { container } = render(<StatusBadge status={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("status 없이 audience='owner'만 줘도 여전히 렌더 안 됨", () => {
    const { container } = render(<StatusBadge audience="owner" />);
    expect(container.firstChild).toBeNull();
  });
});

