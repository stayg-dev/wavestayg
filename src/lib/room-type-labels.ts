// PMS codes stay in API requests; translate them only for display.
const labels: Record<string, string> = {
  SDX: "스탠다드 더블 X",
  DDM: "디럭스 더블 마운틴",
  DHO: "디럭스 더블 하프오션",
  THO: "디럭스 트윈 하프오션",
  JFO: "주니어 패밀리 오션",
  JDO: "주니어 더블 오션",
  PDO: "프리미엄 더블 오션",
  PTO: "프리미엄 트윈 오션",
  LDO: "로프트 더블 오션",
  LTO: "로프트 트윈 오션",
  LFO: "로프트 패밀리 오션",
};

export function roomTypeLabel(name: string) {
  return Object.hasOwn(labels, name) ? labels[name] : name;
}
