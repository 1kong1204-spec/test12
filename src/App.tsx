/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Shuffle, 
  Users, 
  XCircle, 
  CheckCircle2, 
  RefreshCw, 
  Undo2, 
  Info, 
  School, 
  Sparkles, 
  Trash2, 
  ChevronLeft 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * 4x5 교실 격자 정보 정의 (총 20석)
 */
const TOTAL_SEATS = 20;
const ROWS = 4;
const COLS = 5;

export default function App() {
  // [상태 정의]
  // 1. 학생 수 (초기값 null, 첫 진입 시 선택하도록 유도)
  const [studentCount, setStudentCount] = useState<number | null>(null);
  
  // 2. 임시 입력 인원수 (드롭다운 바인딩용)
  const [tempCount, setTempCount] = useState<number>(15);
  
  // 3. 지정된 빈자리(X) 목록 (20개 크기의 boolean 배열)
  const [blockedSeats, setBlockedSeats] = useState<boolean[]>(Array(TOTAL_SEATS).fill(false));
  
  // 4. 배정된 좌석 정보 (배열 인덱스가 좌석 번호-1, 값은 학생 번호 1~N 또는 빈자리의 경우 null)
  const [seating, setSeating] = useState<(number | null)[]>(Array(TOTAL_SEATS).fill(null));
  
  // 5. 자리 배치 완료 여부
  const [isAssigned, setIsAssigned] = useState<boolean>(false);
  
  // 6. 셔플(배치 중) 애니메이션 작동 여부
  const [isShuffling, setIsShuffling] = useState<boolean>(false);

  // [계산된 값들]
  // 지정된 X 빈자리 개수
  const blockedCount = blockedSeats.filter(Boolean).length;
  // 실제 배치 가능한 좌석 수 (총 좌석 20 - 지정된 빈자리 X)
  const placeableCount = TOTAL_SEATS - blockedCount;
  // 현재 설정된 학생 수 (오류 방지용 기본값 처리)
  const activeStudentCount = studentCount || 0;
  // 배치 가능한 좌석이 학생 수보다 부족한지 여부
  const isLackOfSeats = placeableCount < activeStudentCount;

  // [효과/이벤트 핸들러]
  
  // 인원수가 변경되거나 빈자리가 토글되면, 기존 배치 결과는 초기화하여 정합성을 유지합니다.
  const resetSeatingOnly = () => {
    setSeating(Array(TOTAL_SEATS).fill(null));
    setIsAssigned(false);
  };

  // 1. 학생 인원수 선택 완료
  const handleStartSetup = (count: number) => {
    setStudentCount(count);
    // 빈자리 및 배정 상태 새로 초기화
    setBlockedSeats(Array(TOTAL_SEATS).fill(false));
    setSeating(Array(TOTAL_SEATS).fill(null));
    setIsAssigned(false);
  };

  // 2. 특정 좌석 클릭 시 빈자리(X) 지정/해제 토글
  const handleToggleBlock = (index: number) => {
    // 셔플 중이거나 배치 중일 때는 클릭을 막습니다.
    if (isShuffling) return;

    const newBlocked = [...blockedSeats];
    newBlocked[index] = !newBlocked[index];
    setBlockedSeats(newBlocked);
    
    // 빈자리 지정이 바뀌면 기존 배치 결과는 리셋하여 충돌을 방지합니다.
    resetSeatingOnly();
  };

  // 3. 빈자리(X) 지정 전체 초기화
  const handleResetBlocks = () => {
    if (isShuffling) return;
    setBlockedSeats(Array(TOTAL_SEATS).fill(false));
    resetSeatingOnly();
  };

  // 4. 무작위 자리 배정 로직 생성 함수
  const generateRandomSeating = (currentBlocked: boolean[], count: number) => {
    // 1) X로 차단되지 않은 배치 가능한 좌석의 인덱스 모음 필터링
    const availableIndices: number[] = [];
    for (let i = 0; i < TOTAL_SEATS; i++) {
      if (!currentBlocked[i]) {
        availableIndices.push(i);
      }
    }

    // 2) 배치 가능한 인덱스 리스트를 무작위로 섞음 (Fisher-Yates Shuffle)
    const shuffledIndices = [...availableIndices];
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }

    // 3) 새로운 좌석 배치판 생성 (전부 null로 채움)
    const nextSeating: (number | null)[] = Array(TOTAL_SEATS).fill(null);

    // 4) 섞인 자리에 순서대로 1번부터 N번 학생 배치
    for (let s = 0; s < count; s++) {
      if (s < shuffledIndices.length) {
        const seatIdx = shuffledIndices[s];
        nextSeating[seatIdx] = s + 1; // 학생 번호는 1부터 시작
      }
    }

    return nextSeating;
  };

  // 5. 자리 배정 실행 (애니메이션 효과 포함)
  const handleAssignSeats = () => {
    if (isLackOfSeats || activeStudentCount === 0) return;
    
    setIsShuffling(true);
    
    let ticks = 0;
    const maxTicks = 8; // 8번 빠르게 셔플되는 효과 연출
    
    const interval = setInterval(() => {
      // 셔플링 동안 시각적 흥미를 주기 위해 가상의 임시 무작위 배치 생성
      const tempSeating = generateRandomSeating(blockedSeats, activeStudentCount);
      setSeating(tempSeating);
      ticks++;
      
      if (ticks >= maxTicks) {
        clearInterval(interval);
        
        // 최종 무작위 자리 확정 및 상태 업데이트
        const finalSeating = generateRandomSeating(blockedSeats, activeStudentCount);
        setSeating(finalSeating);
        setIsShuffling(false);
        setIsAssigned(true);
      }
    }, 100);
  };

  // 6. 초기 화면으로 가기 (인원수 재지정)
  const handleGoBack = () => {
    setStudentCount(null);
    setBlockedSeats(Array(TOTAL_SEATS).fill(false));
    setSeating(Array(TOTAL_SEATS).fill(null));
    setIsAssigned(false);
  };

  return (
    <div id="app-container" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans transition-colors duration-200">
      
      {/* 글로벌 헤더: Professional Polish 테마 기반 h-16 고정 및 정돈 */}
      <header id="app-header" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 sticky top-0 z-10 shrink-0 shadow-sm">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* 로고 & 타이틀 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-850 tracking-tight flex items-center gap-2">
                스마트 자리 배정 시스템
                <span className="text-indigo-600 font-semibold text-xs bg-indigo-50 px-2 py-0.5 rounded-full">
                  Simple v1.0
                </span>
              </h1>
            </div>
          </div>

          {/* 현재 진행 상태 피드백 */}
          <div className="flex items-center gap-4">
            {studentCount !== null && (
              <button 
                id="btn-change-students"
                onClick={handleGoBack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                학생 수 설정 ({studentCount}명)
              </button>
            )}
            <div className="hidden sm:flex flex-col items-end shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">현재 상태</span>
              <span className="text-xs text-slate-600 font-medium" id="statusText">
                {isShuffling ? "무작위 섞는 중..." : isAssigned ? "자리 배치 완료" : "자리 배치 대기 중"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main id="app-main" className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
        
        <AnimatePresence mode="wait">
          {studentCount === null ? (
            
            /* ================= [1단계: 인원수 선택 초기 화면] ================= */
            <motion.div
              key="step-setup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xl shadow-slate-200/40 text-center"
            >
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Users className="w-8 h-8" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">학급 인원수 선택</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                자리를 배치할 학생 인원수를 선택해 주세요.<br />
                이름은 자동으로 학생1, 학생2... 형태로 자동 지정됩니다.
              </p>

              {/* 드롭다운 셀렉트 박스 */}
              <div className="mb-6">
                <label htmlFor="student-select" className="block text-xs font-bold uppercase tracking-wider text-slate-400 text-left mb-2">
                  학생 수 선택 (1명 ~ 최대 20명)
                </label>
                <div className="relative">
                  <select
                    id="student-select"
                    value={tempCount}
                    onChange={(e) => setTempCount(Number(e.target.value))}
                    className="w-full h-12 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 text-base font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none cursor-pointer transition-all"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num}명
                      </option>
                    ))}
                  </select>
                  {/* 드롭다운 화살표 장식 */}
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-mono">▼</span>
                  </div>
                </div>
              </div>

              {/* 진행 시작 버튼 */}
              <button
                id="btn-start-setup"
                onClick={() => handleStartSetup(tempCount)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                자리 바꾸기 시작
              </button>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <Info className="w-3.5 h-3.5" />
                모든 데이터는 브라우저 메모리에만 저장되며 새로고침 시 초기화됩니다.
              </div>
            </motion.div>

          ) : (
            
            /* ================= [2단계: 메인 배치 및 설정 화면] ================= */
            <motion.div
              key="step-workspace"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col lg:flex-row gap-6 md:gap-8 items-start"
            >
              
              {/* 왼쪽 사이드 패널: 설명, 실시간 현황 통계, 및 컨트롤 버튼 */}
              <aside className="w-full lg:w-72 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 shadow-[1px_1px_10px_rgba(0,0,0,0.02)]">
                
                {/* 1. 사용 설정 파트 */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    설정: 학생 인원수
                  </label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700">{activeStudentCount}명 배치 대상</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    * 교실은 4x5(20석) 고정입니다.<br />
                    * 우측 자리를 클릭하여 빈자리(X)를 지정할 수 있습니다.
                  </p>
                </div>

                {/* 2. 통계 지표 대시보드 - Professional Polish 스타일 변환 */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    현재 학급 현황
                  </label>

                  {/* 지표 1: 전체 학생 수 */}
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">전체 학생 수</span>
                      <span className="text-lg font-bold text-indigo-900" id="statTotal">{activeStudentCount}명</span>
                    </div>
                    <div className="w-full bg-indigo-200/50 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (activeStudentCount / TOTAL_SEATS) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* 지표 2: 지정된 빈자리 수 */}
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                      <span className="block text-[10px] text-rose-500 font-bold uppercase tracking-wider mb-1">X 빈자리</span>
                      <span className="text-xl font-bold text-rose-900" id="statX">{blockedCount}</span>
                    </div>

                    {/* 지표 3: 배치 가능 좌석 수 */}
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <span className="block text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-1">배치 가능</span>
                      <span className={`text-xl font-bold ${isLackOfSeats ? "text-rose-600" : "text-emerald-900"}`} id="statAvail">
                        {placeableCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. 액션 제어 패널 */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  
                  {/* 자리 배정 및 재배정 버튼 */}
                  <button
                    id="btn-assign-seats"
                    onClick={handleAssignSeats}
                    disabled={isLackOfSeats || isShuffling}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${
                      isLackOfSeats
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100/60"
                    }`}
                  >
                    {isShuffling ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        자리 섞는 중...
                      </>
                    ) : isAssigned ? (
                      <>
                        <Shuffle className="w-4 h-4" />
                        다시 자리 배정
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        자리 배정 하기
                      </>
                    )}
                  </button>

                  {/* 배치 초기화 버튼 (원래 배치 대기 상태로 되돌리기) */}
                  {isAssigned && (
                    <button
                      id="btn-clear-seating"
                      onClick={resetSeatingOnly}
                      disabled={isShuffling}
                      className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      배정 상태 초기화
                    </button>
                  )}

                  {/* X 지정 전체 해제 버튼 */}
                  <button
                    id="btn-reset-blocks"
                    onClick={handleResetBlocks}
                    disabled={blockedCount === 0 || isShuffling}
                    className="w-full py-2.5 px-4 bg-white hover:bg-rose-50 text-rose-600 disabled:text-slate-300 disabled:bg-white disabled:border-slate-100 font-semibold text-xs rounded-xl border border-slate-200 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    빈자리(X) 전체 초기화
                  </button>
                </div>

                {/* 배치 대기 학생 목록 간단 보기 */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    배치 대상 명단
                  </h4>
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                    {Array.from({ length: activeStudentCount }, (_, i) => i + 1).map((idx) => (
                      <span key={idx} className="text-[10px] bg-white border border-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-md">
                        학생{idx}
                      </span>
                    ))}
                  </div>
                </div>

              </aside>

              {/* 오른쪽 작업 영역: 교실 보드 */}
              <div className="flex-1 w-full bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col items-center">
                
                {/* 칠판 일러스트레이션 (앞쪽 구분) */}
                <div id="classroom-front" className="w-full max-w-xl bg-slate-800 text-white rounded-2xl py-3.5 px-6 mb-8 text-center shadow-md relative overflow-hidden flex flex-col items-center justify-center border border-slate-700">
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-amber-800"></div>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">CLASS FRONT</span>
                  <span className="text-base font-extrabold tracking-widest text-slate-100 flex items-center gap-1.5">
                    [ 칠 판 ]
                  </span>
                </div>

                {/* 자리가 모자라는 오류 상태 경고 배너 */}
                {isLackOfSeats && (
                  <div className="w-full max-w-xl mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3 shadow-sm animate-pulse">
                    <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <strong className="font-bold text-amber-900">배치 가능한 좌석이 부족합니다!</strong>
                      <p className="mt-0.5">
                        학생 수(<span className="font-bold">{activeStudentCount}명</span>)에 비해 지정된 빈자리가 너무 많아 남은 자리가 <span className="font-bold text-rose-600">{placeableCount}석</span>에 불과합니다. 우측 자리를 마우스로 클릭해 <strong className="text-rose-600">X 지정</strong>을 일부 해제해 주세요.
                      </p>
                    </div>
                  </div>
                )}

                {/* 4x5 격자 자리배치 레이아웃: Professional Polish 스펙 반영 */}
                <div 
                  id="classroom-grid" 
                  className="w-full grid grid-cols-5 gap-3 md:gap-4 max-w-2.5xl aspect-[5/4] sm:aspect-auto"
                >
                  {Array.from({ length: TOTAL_SEATS }).map((_, idx) => {
                    const seatNumber = idx + 1;
                    const isBlocked = blockedSeats[idx];
                    const assignedStudent = seating[idx];

                    // 각 자리의 상태에 맞는 스타일 테마 분류
                    let cardStyle = "";
                    let content = null;

                    if (isBlocked) {
                      // 1. 차단된 빈자리 (X)
                      cardStyle = "bg-rose-50 border-2 border-dashed border-rose-200 text-rose-500 shadow-sm";
                      content = (
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="text-3xl font-black text-rose-500 opacity-40">✕</span>
                          <span className="text-[10px] font-bold text-rose-400 mt-0.5 uppercase tracking-wider">제외석</span>
                        </div>
                      );
                    } else if (assignedStudent !== null) {
                      // 2. 학생 배치 완료 상태
                      // 시각적으로 부드러우면서 눈에 띄게 설계
                      const colorIndex = assignedStudent % 5;
                      const studentThemes = [
                        "bg-white border-2 border-indigo-200 text-indigo-950 shadow-md shadow-indigo-100/40 hover:border-indigo-500 hover:-translate-y-0.5",
                        "bg-white border-2 border-emerald-200 text-emerald-950 shadow-md shadow-emerald-100/40 hover:border-emerald-500 hover:-translate-y-0.5",
                        "bg-white border-2 border-sky-200 text-sky-950 shadow-md shadow-sky-100/40 hover:border-sky-500 hover:-translate-y-0.5",
                        "bg-white border-2 border-amber-200 text-amber-950 shadow-md shadow-amber-100/40 hover:border-amber-500 hover:-translate-y-0.5",
                        "bg-white border-2 border-violet-200 text-violet-950 shadow-md shadow-violet-100/40 hover:border-violet-500 hover:-translate-y-0.5"
                      ];
                      
                      cardStyle = `cursor-pointer ${studentThemes[colorIndex]}`;
                      content = (
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">
                            학생 {assignedStudent}
                          </span>
                        </div>
                      );
                    } else if (isAssigned) {
                      // 3. 배정이 끝났으나 이 석은 할당되지 않은 여유석 (빈자리)
                      cardStyle = "bg-slate-50 border-2 border-dashed border-slate-200 text-slate-300 cursor-pointer hover:bg-slate-100";
                      content = (
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="text-xs font-semibold text-slate-400">빈자리</span>
                        </div>
                      );
                    } else {
                      // 4. 배정 전 일반 대기 좌석 (클릭해서 빈자리 X 설정 가능)
                      cardStyle = "bg-white border-2 border-slate-200 hover:border-indigo-500 hover:-translate-y-0.5 text-slate-400 cursor-pointer shadow-[0_4px_6px_-1px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200";
                      content = (
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="text-xs font-semibold text-slate-350">배치 대기</span>
                        </div>
                      );
                    }

                    return (
                      <motion.div
                        id={`seat-${seatNumber}`}
                        key={idx}
                        onClick={() => handleToggleBlock(idx)}
                        whileHover={{ scale: isShuffling ? 1 : 1.01 }}
                        whileTap={{ scale: isShuffling ? 1 : 0.99 }}
                        transition={{ type: "spring", stiffness: 450, damping: 28 }}
                        className={`relative aspect-square sm:aspect-[4/3.2] rounded-2xl flex flex-col justify-between p-2.5 select-none ${cardStyle}`}
                      >
                        {/* 좌측 상단 좌석 번호 라벨 (1~20) */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold ${
                            isBlocked ? "text-rose-400" : "text-slate-400"
                          }`}>
                            {String(seatNumber).padStart(2, '0')}
                          </span>
                        </div>

                        {/* 메인 상태 콘텐츠 */}
                        <div className="flex-1 w-full flex items-center justify-center">
                          {content}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* 교실 뒷단 가이드 가볍게 추가 */}
                <div className="w-full max-w-xl mt-8 pt-4 border-t border-dashed border-slate-200 flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>← 교문 (뒤쪽)</span>
                  <span className="text-slate-300">|</span>
                  <span>교실 뒷문 →</span>
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* 푸터 영역 - Professional Polish 가이드라인대로 정비 */}
      <footer id="app-footer" className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0 text-[10px] text-slate-400 font-medium">
        <span className="uppercase tracking-widest">Seating Layout Grid: 4 Rows &times; 5 Columns</span>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-slate-500">시스템 정상 작동 중</span>
        </div>
      </footer>

    </div>
  );
}
