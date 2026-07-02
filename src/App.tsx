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
  ChevronLeft,
  Lock,
  Unlock,
  Plus,
  Save,
  FolderOpen,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Firebase 모듈 가져오기
import { db, doc, getDoc, setDoc } from "./firebase";

/**
 * 4x5 교실 격자 정보 정의 (총 20석)
 */
const TOTAL_SEATS = 20;
const ROWS = 4;
const COLS = 5;

// 학생 객체 타입 정의
interface Student {
  id: number;
  name: string;
}

export default function App() {
  // [상태 정의]
  // 1. 학생 목록 (각 학생은 { id, name } 객체)
  const [students, setStudents] = useState<Student[]>([]);
  
  // 2. 학생 수 (초기값 null, 첫 진입 시 선택하거나 DB에서 자동 로드)
  const [studentCount, setStudentCount] = useState<number | null>(null);
  
  // 3. 임시 입력 인원수 (드롭다운 바인딩용)
  const [tempCount, setTempCount] = useState<number>(15);
  
  // 4. 지정된 빈자리(X) 목록 (20개 크기의 boolean 배열)
  const [blockedSeats, setBlockedSeats] = useState<boolean[]>(Array(TOTAL_SEATS).fill(false));
  
  // 5. 배정된 좌석 정보 (배열 인덱스가 좌석 번호-1, 값은 학생 ID 또는 빈자리의 경우 null)
  const [seating, setSeating] = useState<(number | null)[]>(Array(TOTAL_SEATS).fill(null));
  
  // 6. 고정석(🔒) 지정 상태 목록 (20개 크기의 boolean 배열)
  const [fixedSeats, setFixedSeats] = useState<boolean[]>(Array(TOTAL_SEATS).fill(false));
  
  // 7. 좌석 선택 모드 ("block": 빈자리 X 토글, "fix": 고정석 지정)
  const [activeMode, setActiveMode] = useState<"block" | "fix">("block");
  
  // 8. 고정석 지정 시 선택 중인 좌석 인덱스 (선택 시 학생 목록 모달 표시)
  const [selectedSeatForFix, setSelectedSeatForFix] = useState<number | null>(null);

  // 9. 사이드바 탭 제어 ("controls": 설정 및 대시보드, "students": 학생 관리)
  const [activeSidebarTab, setActiveSidebarTab] = useState<"controls" | "students">("controls");

  // 10. 자리 배치 완료 여부
  const [isAssigned, setIsAssigned] = useState<boolean>(false);
  
  // 11. 셔플(배치 중) 애니메이션 작동 여부
  const [isShuffling, setIsShuffling] = useState<boolean>(false);

  // 12. 전체 화면 로딩 상태 (앱 구동 시 DB 자동 로딩용)
  const [isScreenLoading, setIsScreenLoading] = useState<boolean>(true);

  // 13. 저장/불러오기 트랜잭션 진행 여부
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoaderActive, setIsLoaderActive] = useState<boolean>(false);

  // 14. 일시적 알림 메시지 토스트 상태
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // [알림 안내 토스트 함수]
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  // 토스트 자동 사라짐 타이머
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ================= [Firebase Firestore 연동 로직] =================

  // 1. 앱 마운트 시 데이터베이스(Firestore)로부터 기존 설정 자동 로딩
  useEffect(() => {
    const autoLoadData = async () => {
      try {
        setIsScreenLoading(true);
        const docRef = doc(db, "classroom_config", "default");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.students && data.students.length > 0) {
            setStudents(data.students);
            setStudentCount(data.students.length);
            
            if (data.blockedSeats) setBlockedSeats(data.blockedSeats);
            if (data.seating) setSeating(data.seating);
            if (data.fixedSeats) setFixedSeats(data.fixedSeats);
            
            // 배정 여부 확인
            const hasAssigned = data.seating ? data.seating.some((s: any) => s !== null) : false;
            setIsAssigned(hasAssigned);
            
            showToast("데이터베이스로부터 설정을 자동으로 불러왔습니다.", "success");
          }
        }
      } catch (err: any) {
        console.error("Firebase AutoLoad Error:", err);
        showToast("서버로부터 설정 로드에 실패했습니다: " + err.message, "error");
      } finally {
        setIsScreenLoading(false);
      }
    };

    autoLoadData();
  }, []);

  // 2. 학생 명단만 데이터베이스에 별도 저장
  const handleSaveStudentsToDB = async () => {
    if (students.length === 0) {
      showToast("저장할 학생 명단이 존재하지 않습니다.", "error");
      return;
    }
    
    setIsSaving(true);
    try {
      const docRef = doc(db, "classroom_config", "default");
      // 기존 다른 데이터 보존을 위해 먼저 로딩 시도 후 덮어쓰기 병합
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      await setDoc(docRef, {
        ...existingData,
        students,
        updatedAt: new Date().toISOString()
      });
      
      showToast("학생 명단이 데이터베이스에 저장되었습니다.", "success");
    } catch (err: any) {
      console.error("Firebase Save Students Error:", err);
      showToast("학생 명단 저장에 실패했습니다: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 3. 현재의 전체 배치 상태(자리 배치도, 빈자리X, 고정석 포함)를 데이터베이스에 영구 저장
  const handleSaveSeatingToDB = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, "classroom_config", "default");
      await setDoc(docRef, {
        students,
        blockedSeats,
        seating,
        fixedSeats,
        updatedAt: new Date().toISOString()
      });
      showToast("현재의 모든 자리배치 및 고정석 정보가 데이터베이스에 저장되었습니다.", "success");
    } catch (err: any) {
      console.error("Firebase Save Seating Error:", err);
      showToast("자리배치 저장에 실패했습니다: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 4. 저장된 배치 상태 불러오기 (수동)
  const handleLoadSeatingFromDB = async () => {
    setIsLoaderActive(true);
    try {
      const docRef = doc(db, "classroom_config", "default");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.students) setStudents(data.students);
        if (data.students) setStudentCount(data.students.length);
        if (data.blockedSeats) setBlockedSeats(data.blockedSeats);
        if (data.seating) setSeating(data.seating);
        if (data.fixedSeats) setFixedSeats(data.fixedSeats);
        
        const hasAssigned = data.seating ? data.seating.some((s: any) => s !== null) : false;
        setIsAssigned(hasAssigned);

        showToast("데이터베이스로부터 저장된 배치를 수동으로 불러왔습니다.", "success");
      } else {
        showToast("불러올 수 있는 저장된 데이터가 존재하지 않습니다.", "error");
      }
    } catch (err: any) {
      console.error("Firebase Load Seating Error:", err);
      showToast("데이터를 불러오는 중 문제가 발생했습니다: " + err.message, "error");
    } finally {
      setIsLoaderActive(false);
    }
  };

  // ================= [기본 비즈니스 로직 제어] =================

  // 지정된 X 빈자리 개수
  const blockedCount = blockedSeats.filter(Boolean).length;
  // 고정석 지정된 개수
  const fixedCount = fixedSeats.filter(Boolean).length;
  // 실제 배치 가능한 빈 좌석 수 (총 좌석 20 - 지정된 빈자리 X)
  const placeableCount = TOTAL_SEATS - blockedCount;
  // 현재 등록된 총 학생 수
  const activeStudentCount = students.length;
  // 배치 가능한 좌석이 학생 수보다 부족한지 여부
  const isLackOfSeats = placeableCount < activeStudentCount;

  // 인원수 혹은 레이아웃 변경 시 기존 무작위 배치 결과만 선택적으로 초기화
  const resetSeatingOnly = () => {
    // 고정석이 있는 자리는 유지하고, 비고정석만 null로 초기화합니다.
    const newSeating = seating.map((studentId, idx) => {
      return fixedSeats[idx] ? studentId : null;
    });
    setSeating(newSeating);
    setIsAssigned(false);
  };

  // 1. 초기 셋업 단계에서 학생 수 선택완료 시 자동 이름 생성
  const handleStartSetup = (count: number) => {
    // 1번부터 count번까지 순차적으로 가상 학생 생성
    const initialStudents: Student[] = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `학생 ${i + 1}`
    }));
    
    setStudents(initialStudents);
    setStudentCount(count);
    
    // 상태 초기 리셋
    setBlockedSeats(Array(TOTAL_SEATS).fill(false));
    setSeating(Array(TOTAL_SEATS).fill(null));
    setFixedSeats(Array(TOTAL_SEATS).fill(false));
    setIsAssigned(false);
    setActiveSidebarTab("controls");
  };

  // 2. 학생 명단 관리: 개별 학생 이름 실시간 변경
  const handleRenameStudent = (id: number, newName: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  // 3. 학생 명단 관리: 새로운 학생 직접 추가
  const handleAddStudent = () => {
    if (students.length >= TOTAL_SEATS) {
      showToast("교실의 총 좌석 크기(20석)를 초과하여 학생을 추가할 수 없습니다.", "error");
      return;
    }
    
    // 중복 없는 ID 자동 검증
    const nextId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;
    const newStudent: Student = {
      id: nextId,
      name: `학생 ${nextId}`
    };

    setStudents(prev => [...prev, newStudent]);
    setStudentCount(students.length + 1);
    showToast(`임시 학생이 명단에 추가되었습니다. 영구 저장을 위해 '학생 명단 저장'을 눌러주세요.`, "success");
  };

  // 4. 학생 명단 관리: 학생 강제 삭제
  const handleDeleteStudent = (id: number) => {
    // 학생 명단에서 제거
    const updatedStudents = students.filter(s => s.id !== id);
    setStudents(updatedStudents);
    setStudentCount(updatedStudents.length);

    // 해당 학생이 배치되어 있거나 고정석 지정이 되어 있었다면 즉각 초기화하여 데이터 무결성 보호
    setSeating(prev => prev.map(s => s === id ? null : s));
    setFixedSeats(prev => prev.map((f, idx) => seating[idx] === id ? false : f));

    showToast("학생이 목록에서 제거되었습니다. 영구 반영을 위해 '학생 명단 저장'을 실행하세요.", "success");
  };

  // 5. 교실 좌석 격자 클릭 통합 제어기
  const handleSeatClick = (index: number) => {
    if (isShuffling) return;

    if (activeMode === "block") {
      // 5-1. 빈자리(X) 지정 모드인 경우
      const isCurrentlyBlocked = blockedSeats[index];
      
      if (!isCurrentlyBlocked) {
        // 새로 X를 지정하는 경우: 기존에 해당 자리가 고정석이거나 학생 배치 상태였다면 강제 정화
        const newBlocked = [...blockedSeats];
        newBlocked[index] = true;
        setBlockedSeats(newBlocked);

        const newFixed = [...fixedSeats];
        newFixed[index] = false;
        setFixedSeats(newFixed);

        const newSeating = [...seating];
        newSeating[index] = null;
        setSeating(newSeating);

        showToast(`${index + 1}번 좌석이 빈자리(X)로 제외되었습니다.`);
      } else {
        // X 제외 해제
        const newBlocked = [...blockedSeats];
        newBlocked[index] = false;
        setBlockedSeats(newBlocked);
      }
      resetSeatingOnly();

    } else if (activeMode === "fix") {
      // 5-2. 고정석 지정 모드인 경우
      if (blockedSeats[index]) {
        showToast("이 자리는 빈자리(X)로 설정되어 있어 고정석으로 지정할 수 없습니다.", "error");
        return;
      }
      // 고정할 학생 선택 모달/목록 열기
      setSelectedSeatForFix(index);
    }
  };

  // 6. 특정 자리에 학생을 고정석으로 바인딩
  const handleAssignFixedStudent = (seatIndex: number, studentId: number | null) => {
    const newSeating = [...seating];
    const newFixed = [...fixedSeats];

    if (studentId === null) {
      // 고정석 지정 해제인 경우
      newSeating[seatIndex] = null;
      newFixed[seatIndex] = false;
      showToast(`${seatIndex + 1}번 고정석이 해제되었습니다.`);
    } else {
      // 특정 학생을 고정하는 경우
      // 규칙 예외 처리: 동일 학생이 다른 자리에 고정되어 있었다면 그 자리의 고정부터 해제하여 1인 1석 구조 유지
      for (let i = 0; i < TOTAL_SEATS; i++) {
        if (seating[i] === studentId) {
          newSeating[i] = null;
          newFixed[i] = false;
        }
      }

      newSeating[seatIndex] = studentId;
      newFixed[seatIndex] = true;
      
      const targetStudent = students.find(s => s.id === studentId);
      showToast(`'${targetStudent?.name || `학생 ${studentId}`}'님이 ${seatIndex + 1}번 자리에 고정석으로 매칭되었습니다.`);
    }

    setSeating(newSeating);
    setFixedSeats(newFixed);
    setSelectedSeatForFix(null);
    resetSeatingOnly();
  };

  // 7. 빈자리(X) 지정 전체 초기화
  const handleResetBlocks = () => {
    if (isShuffling) return;
    setBlockedSeats(Array(TOTAL_SEATS).fill(false));
    resetSeatingOnly();
    showToast("모든 빈자리(X) 제외 지정을 초기화했습니다.");
  };

  // 8. 고정석 전체 초기화
  const handleResetFixedSeats = () => {
    if (isShuffling) return;
    setFixedSeats(Array(TOTAL_SEATS).fill(false));
    setSeating(Array(TOTAL_SEATS).fill(null));
    setIsAssigned(false);
    showToast("모든 고정석(🔒) 지정을 해제했습니다.");
  };

  // 9. 핵심: 고정석 및 예외처리 규칙을 준수하는 무작위 자리 배정 로직
  const generateRandomSeatingWithRules = (
    currentBlocked: boolean[],
    currentFixed: boolean[],
    currentSeating: (number | null)[],
    studentList: Student[]
  ) => {
    // 1) 고정석으로 지정된 고정 학생 목록 및 고정된 자리 수집
    const fixedStudentIds: number[] = [];
    const finalSeating: (number | null)[] = Array(TOTAL_SEATS).fill(null);

    for (let i = 0; i < TOTAL_SEATS; i++) {
      if (currentFixed[i] && currentSeating[i] !== null) {
        finalSeating[i] = currentSeating[i];
        fixedStudentIds.push(currentSeating[i] as number);
      }
    }

    // 2) 고정석을 제외하고 남은 학생 목록 추출
    const remainingStudents = studentList.filter(s => !fixedStudentIds.includes(s.id));

    // 3) 무작위로 배치 가능한 비어있는 자리 인덱스 목록 계산
    // 규칙: X 빈자리가 아니면서, 현재 고정석이 배치되지 않은 자리여야 함
    const availableIndices: number[] = [];
    for (let i = 0; i < TOTAL_SEATS; i++) {
      if (!currentBlocked[i] && !currentFixed[i]) {
        availableIndices.push(i);
      }
    }

    // 4) 가용한 남은 자리가 남아있는 무작위 배치 학생수보다 적은지 한 번 더 검증
    if (availableIndices.length < remainingStudents.length) {
      return { success: false, seating: null };
    }

    // 5) 남은 가용 좌석 리스트 무작위 셔플 (Fisher-Yates)
    const shuffledIndices = [...availableIndices];
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }

    // 6) 섞인 남은 자리에 잔여 무작위 배치 학생들 일대일 밀어 넣기
    for (let s = 0; s < remainingStudents.length; s++) {
      const seatIdx = shuffledIndices[s];
      finalSeating[seatIdx] = remainingStudents[s].id;
    }

    return { success: true, seating: finalSeating };
  };

  // 10. 자리 배정 실행 프로세서 (애니메이션 탑재)
  const handleAssignSeats = () => {
    if (isLackOfSeats || activeStudentCount === 0) return;
    
    setIsShuffling(true);
    let ticks = 0;
    const maxTicks = 10; // 빠른 셔플 효과

    const interval = setInterval(() => {
      // 셔플링 연출을 위한 빠른 임시 배치도 갱신
      const tempResult = generateRandomSeatingWithRules(blockedSeats, fixedSeats, seating, students);
      if (tempResult.success && tempResult.seating) {
        setSeating(tempResult.seating);
      }
      ticks++;

      if (ticks >= maxTicks) {
        clearInterval(interval);
        
        // 최종 실배치 갱신 및 확정
        const finalResult = generateRandomSeatingWithRules(blockedSeats, fixedSeats, seating, students);
        if (finalResult.success && finalResult.seating) {
          setSeating(finalResult.seating);
          setIsAssigned(true);
          showToast("학생들의 무작위 자리 배정이 무사히 완료되었습니다.");
        } else {
          showToast("자리가 부족하여 모든 학생을 배치할 수 없습니다. 빈자리(X)를 줄이거나 고정석을 해제해 주세요.", "error");
        }
        setIsShuffling(false);
      }
    }, 100);
  };

  // 11. 초기 상태로 원천 회귀 및 학급 설정 초기화
  const handleGoBack = () => {
    setStudentCount(null);
    setStudents([]);
    setBlockedSeats(Array(TOTAL_SEATS).fill(false));
    setSeating(Array(TOTAL_SEATS).fill(null));
    setFixedSeats(Array(TOTAL_SEATS).fill(false));
    setIsAssigned(false);
  };

  return (
    <div id="app-container" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans transition-colors duration-200">
      
      {/* 글로벌 헤더 */}
      <header id="app-header" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 sticky top-0 z-10 shrink-0 shadow-sm">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* 타이틀 영역 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                스마트 자리 배정 시스템
                <span className="text-indigo-600 font-bold text-xs bg-indigo-50 px-2 py-0.5 rounded-full">
                  DB 연동형 v2.0
                </span>
              </h1>
            </div>
          </div>

          {/* 헤더 우측 조작 피드백 */}
          <div className="flex items-center gap-3">
            {studentCount !== null && (
              <button 
                id="btn-change-students"
                onClick={handleGoBack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                인원 설정 초기화
              </button>
            )}
            <div className="hidden md:flex flex-col items-end shrink-0 text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">시스템 구동 상태</span>
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                실시간 서버 동기화 활성
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 실시간 피드백 토스트 알림창 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2.5 max-w-md ${
              toast.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 뷰포트 로더 */}
      <AnimatePresence>
        {(isScreenLoading || isSaving || isLoaderActive) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex flex-col items-center justify-center text-white"
          >
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-xs text-center">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <div>
                <h3 className="font-bold text-sm">데이터 처리 중</h3>
                <p className="text-xs text-slate-400 mt-1">Firebase Cloud 서버와 실시간으로 통신하는 중입니다. 잠시만 기다려주세요...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 콘텐츠 구조 */}
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
                이름은 자동으로 생성되며 이후 이름 편집 및 저장이 가능합니다.
              </p>

              {/* 드롭다운 셀렉트 박스 */}
              <div className="mb-6 text-left">
                <label htmlFor="student-select" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  학생 수 선택 (1명 ~ 최대 20명)
                </label>
                <div className="relative">
                  <select
                    id="student-select"
                    value={tempCount}
                    onChange={(e) => setTempCount(Number(e.target.value))}
                    className="w-full h-12 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 text-base font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none cursor-pointer transition-all"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num}명
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-mono">▼</span>
                  </div>
                </div>
              </div>

              {/* 시작 버튼 */}
              <button
                id="btn-start-setup"
                onClick={() => handleStartSetup(tempCount)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                설정 및 시작하기
              </button>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <Info className="w-3.5 h-3.5" />
                Firebase Firestore와 실시간 데이터 연동이 셋업되어 작동합니다.
              </div>
            </motion.div>

          ) : (
            
            /* ================= [2단계: 메인 워크스페이스] ================= */
            <motion.div
              key="step-workspace"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 items-start"
            >
              
              {/* 왼쪽 조작 & 관리 패널 */}
              <aside className="w-full lg:w-80 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-[1px_1px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                
                {/* 탭 헤더 스위처 */}
                <div className="flex border-b border-slate-100 bg-slate-50">
                  <button
                    onClick={() => setActiveSidebarTab("controls")}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                      activeSidebarTab === "controls"
                        ? "border-indigo-600 text-indigo-600 bg-white"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    통계 및 배치 제어
                  </button>
                  <button
                    onClick={() => setActiveSidebarTab("students")}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                      activeSidebarTab === "students"
                        ? "border-indigo-600 text-indigo-600 bg-white"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    학생 명단 관리 ({activeStudentCount})
                  </button>
                </div>

                {/* 탭 내용 */}
                <div className="p-5 flex flex-col gap-5">
                  
                  {activeSidebarTab === "controls" ? (
                    /* ----- 탭 1: 통계 및 제어 ----- */
                    <>
                      {/* 설정 모드 전환 */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                          작업 모드 선택
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                          <button
                            onClick={() => setActiveMode("block")}
                            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              activeMode === "block"
                                ? "bg-white text-rose-600 shadow-xs border border-slate-200/85"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            빈자리(X) 지정
                          </button>
                          <button
                            onClick={() => setActiveMode("fix")}
                            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              activeMode === "fix"
                                ? "bg-white text-indigo-600 shadow-xs border border-slate-200/85"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5 text-indigo-500" />
                            고정석 지정
                          </button>
                        </div>
                      </div>

                      {/* 현황 통계 카드 */}
                      <div className="space-y-2.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                          현재 학급 현황
                        </label>
                        
                        <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex justify-between items-center">
                          <span className="text-xs text-indigo-700 font-bold uppercase tracking-wider">전체 학생 수</span>
                          <span className="text-lg font-black text-indigo-950">{activeStudentCount}명</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                            <span className="block text-[10px] text-rose-500 font-bold uppercase tracking-wider mb-0.5">X 빈자리</span>
                            <span className="text-xl font-black text-rose-950">{blockedCount}석</span>
                          </div>
                          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <span className="block text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-0.5">배치 가능</span>
                            <span className={`text-xl font-black ${isLackOfSeats ? "text-rose-600" : "text-emerald-950"}`}>
                              {placeableCount}석
                            </span>
                          </div>
                        </div>

                        {/* 고정석 정보 */}
                        <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl flex justify-between items-center">
                          <span className="text-xs text-sky-700 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Lock className="w-3 h-3" /> 고정석 수
                          </span>
                          <span className="text-lg font-black text-sky-950">{fixedCount}석</span>
                        </div>
                      </div>

                      {/* 제어 조작 버튼 모음 */}
                      <div className="space-y-2.5 pt-3 border-t border-slate-100">
                        <button
                          id="btn-assign-seats"
                          onClick={handleAssignSeats}
                          disabled={isLackOfSeats || isShuffling}
                          className={`w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${
                            isLackOfSeats
                              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
                          }`}
                        >
                          {isShuffling ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              무작위 자리 섞는 중...
                            </>
                          ) : (
                            <>
                              <Shuffle className="w-4 h-4" />
                              무작위 자리 배정하기
                            </>
                          )}
                        </button>

                        {/* DB 연동 조작 섹션 (그린 계열 등 차별성 강화) */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            id="btn-save-seating"
                            onClick={handleSaveSeatingToDB}
                            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            배치 저장
                          </button>
                          <button
                            id="btn-load-seating"
                            onClick={handleLoadSeatingFromDB}
                            className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            배치 불러오기
                          </button>
                        </div>

                        {/* 배치 및 핀 초기화 */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={handleResetBlocks}
                            disabled={blockedCount === 0 || isShuffling}
                            className="py-2 px-3 bg-white hover:bg-slate-50 disabled:bg-white disabled:text-slate-300 disabled:border-slate-100 text-slate-500 border border-slate-200 font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            X 빈자리 초기화
                          </button>
                          <button
                            onClick={handleResetFixedSeats}
                            disabled={fixedCount === 0 || isShuffling}
                            className="py-2 px-3 bg-white hover:bg-slate-50 disabled:bg-white disabled:text-slate-300 disabled:border-slate-100 text-slate-500 border border-slate-200 font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            고정석 해제
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* ----- 탭 2: 학생 명단 관리 ----- */
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">학생 수정/삭제</span>
                        <button
                          onClick={handleAddStudent}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> 학생 추가
                        </button>
                      </div>

                      {/* 학생 스크롤 스페이스 */}
                      <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50/50 pr-1">
                        {students.map((student) => (
                          <div key={student.id} className="flex items-center gap-2 p-2 bg-white">
                            <span className="text-[10px] font-mono text-slate-400 w-5 text-right font-bold">
                              {String(student.id).padStart(2, '0')}
                            </span>
                            <input
                              type="text"
                              value={student.name}
                              onChange={(e) => handleRenameStudent(student.id, e.target.value)}
                              placeholder="학생 이름"
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
                              className="text-slate-300 hover:text-rose-500 p-1.5 rounded-md hover:bg-rose-50 transition-all cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {students.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-8">등록된 학생이 없습니다.</p>
                        )}
                      </div>

                      {/* 명단 저장 기능 */}
                      <button
                        onClick={handleSaveStudentsToDB}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                      >
                        <Save className="w-4 h-4" />
                        학생 명단 서버에 저장하기
                      </button>
                    </>
                  )}

                </div>
              </aside>

              {/* 오른쪽 작업 영역: 교실 배치판 */}
              <div className="flex-1 w-full bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col items-center">
                
                {/* 칠판 구분 기호 */}
                <div id="classroom-front" className="w-full max-w-xl bg-slate-800 text-white rounded-2xl py-3.5 px-6 mb-8 text-center shadow-md relative overflow-hidden flex flex-col items-center justify-center border border-slate-700">
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-amber-800"></div>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">CLASS FRONT</span>
                  <span className="text-base font-extrabold tracking-widest text-slate-100 flex items-center gap-1.5">
                    [ 칠 판 (앞 쪽) ]
                  </span>
                </div>

                {/* 에러 상태 경고 배너 */}
                {isLackOfSeats && (
                  <div className="w-full max-w-xl mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3 shadow-xs animate-pulse">
                    <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <strong className="font-bold text-amber-900">배치 가능한 좌석이 부족합니다!</strong>
                      <p className="mt-0.5">
                        학생 수(<span className="font-bold">{activeStudentCount}명</span>)에 비해 가용 좌석이 <span className="font-bold text-rose-600">{placeableCount}석</span>에 불과합니다. 자리를 클릭해 <strong className="text-rose-600">X 지정</strong>을 해제해 주세요.
                      </p>
                    </div>
                  </div>
                )}

                {/* 현재 조작 모드 힌트 표시 */}
                <div className="mb-4 w-full max-w-xl flex items-center justify-between bg-indigo-50/45 border border-indigo-100/70 py-2.5 px-4 rounded-xl text-xs font-bold text-indigo-950">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    {activeMode === "block" ? (
                      <span>[빈자리 모드] 임의의 자리를 클릭해 <strong className="text-rose-600">X 빈자리</strong>로 제외시킵니다.</span>
                    ) : (
                      <span>[고정석 모드] 자리를 클릭해 원하는 학생을 <strong className="text-indigo-600">고정석</strong>으로 지정합니다.</span>
                    )}
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md uppercase">
                    {activeMode === "block" ? "제외석 지정 중" : "고정석 매핑 중"}
                  </span>
                </div>

                {/* 4x5 격자 자리배치 레이아웃 */}
                <div 
                  id="classroom-grid" 
                  className="w-full grid grid-cols-5 gap-3 md:gap-4 max-w-2.5xl aspect-[5/4] sm:aspect-auto"
                >
                  {Array.from({ length: TOTAL_SEATS }).map((_, idx) => {
                    const seatNumber = idx + 1;
                    const isBlocked = blockedSeats[idx];
                    const assignedStudentId = seating[idx];
                    const isFixed = fixedSeats[idx];

                    let cardStyle = "";
                    let content = null;

                    if (isBlocked) {
                      // 1. 제외된 빈자리 (X)
                      cardStyle = "bg-rose-50 border-2 border-dashed border-rose-200 text-rose-500 shadow-xs";
                      content = (
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="text-3xl font-black text-rose-500 opacity-40">✕</span>
                          <span className="text-[10px] font-bold text-rose-400 mt-0.5 uppercase tracking-wider">제외석</span>
                        </div>
                      );
                    } else if (assignedStudentId !== null) {
                      // 2. 학생 배치 완료
                      const studentObj = students.find(s => s.id === assignedStudentId);
                      const studentName = studentObj ? studentObj.name : `학생 ${assignedStudentId}`;

                      // 고정석 여부에 따라 다른 느낌의 톤 부여
                      if (isFixed) {
                        cardStyle = "bg-indigo-50 border-2 border-indigo-400 text-indigo-950 shadow-md shadow-indigo-100/60 hover:border-indigo-600";
                        content = (
                          <div className="flex flex-col items-center justify-center h-full gap-1">
                            <span className="text-sm md:text-base font-extrabold text-indigo-950 tracking-tight flex items-center gap-1">
                              {studentName}
                            </span>
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> 고정석
                            </span>
                          </div>
                        );
                      } else {
                        const colorIndex = assignedStudentId % 5;
                        const studentThemes = [
                          "bg-white border-2 border-slate-200 text-slate-800 shadow-sm hover:border-indigo-400",
                          "bg-white border-2 border-slate-200 text-slate-800 shadow-sm hover:border-emerald-400",
                          "bg-white border-2 border-slate-200 text-slate-800 shadow-sm hover:border-sky-400",
                          "bg-white border-2 border-slate-200 text-slate-800 shadow-sm hover:border-amber-400",
                          "bg-white border-2 border-slate-200 text-slate-800 shadow-sm hover:border-violet-400"
                        ];
                        cardStyle = `cursor-pointer ${studentThemes[colorIndex]} hover:-translate-y-0.5 transition-all`;
                        content = (
                          <div className="flex flex-col items-center justify-center h-full">
                            <span className="text-sm md:text-base font-extrabold text-slate-800 tracking-tight">
                              {studentName}
                            </span>
                          </div>
                        );
                      }
                    } else if (isAssigned) {
                      // 3. 배정이 끝났으나 이 석은 할당되지 않은 여유석 (빈자리)
                      cardStyle = "bg-slate-50 border-2 border-dashed border-slate-200 text-slate-300 cursor-pointer hover:bg-slate-100";
                      content = (
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="text-xs font-semibold text-slate-400">빈자리</span>
                        </div>
                      );
                    } else {
                      // 4. 배정 전 일반 대기 좌석
                      cardStyle = "bg-white border-2 border-slate-200 hover:border-indigo-500 hover:-translate-y-0.5 text-slate-400 cursor-pointer shadow-[0_4px_6px_-1px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200";
                      content = (
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="text-xs font-semibold text-slate-400">배치 대기</span>
                        </div>
                      );
                    }

                    return (
                      <motion.div
                        id={`seat-${seatNumber}`}
                        key={idx}
                        onClick={() => handleSeatClick(idx)}
                        whileHover={{ scale: isShuffling ? 1 : 1.01 }}
                        whileTap={{ scale: isShuffling ? 1 : 0.99 }}
                        transition={{ type: "spring", stiffness: 450, damping: 28 }}
                        className={`relative aspect-square sm:aspect-[4/3.2] rounded-2xl flex flex-col justify-between p-2.5 select-none ${cardStyle}`}
                      >
                        {/* 좌측 상단 좌석 번호 */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold ${
                            isBlocked ? "text-rose-400" : "text-slate-400"
                          }`}>
                            {String(seatNumber).padStart(2, '0')}
                          </span>
                        </div>

                        {/* 상태 콘텐츠 */}
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

        {/* ================= [3단계: 고정석 배치용 학생 매핑 팝업 모달] ================= */}
        <AnimatePresence>
          {selectedSeatForFix !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4"
              >
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-indigo-600" />
                    {selectedSeatForFix + 1}번 고정석 지정
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    이 자리에 항상 지정해 고정해 둘 학생을 선택해 주세요. 자리 배치 시 고정된 학생은 항상 이 자리에 유지됩니다.
                  </p>
                </div>

                {/* 학생 목록 리스트 */}
                <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50 p-1">
                  {/* 고정 해제 옵션 */}
                  <button
                    onClick={() => handleAssignFixedStudent(selectedSeatForFix, null)}
                    className="w-full p-3 bg-white text-rose-600 font-bold text-xs flex items-center justify-between hover:bg-rose-50/50 rounded-lg transition-all text-left"
                  >
                    <span>이 자리 고정 해제하기 (공석화)</span>
                    <Unlock className="w-3.5 h-3.5" />
                  </button>

                  {students.map((student) => {
                    // 이미 다른 자리에 고정되어 있는지 검증
                    let isAlreadyFixedElsewhere = false;
                    let targetSeatNum = 0;
                    for (let i = 0; i < TOTAL_SEATS; i++) {
                      if (fixedSeats[i] && seating[i] === student.id) {
                        isAlreadyFixedElsewhere = true;
                        targetSeatNum = i + 1;
                      }
                    }

                    return (
                      <button
                        key={student.id}
                        onClick={() => handleAssignFixedStudent(selectedSeatForFix, student.id)}
                        className="w-full p-3 text-slate-700 font-bold text-xs flex items-center justify-between hover:bg-white rounded-lg transition-all text-left"
                      >
                        <span className="flex items-center gap-1.5">
                          👦 {student.name}
                        </span>
                        {isAlreadyFixedElsewhere && (
                          <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {targetSeatNum}번 고정중 (이동됨)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedSeatForFix(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* 푸터 영역 */}
      <footer id="app-footer" className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0 text-[10px] text-slate-400 font-medium mt-12">
        <span className="uppercase tracking-widest">Seating Layout Grid: 4 Rows &times; 5 Columns</span>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-slate-500">시스템 정상 작동 중</span>
        </div>
      </footer>

    </div>
  );
}
