// Particle animation variables declared at top to avoid TDZ (Temporal Dead Zone) issues
var pCanvas, pCtx, pAnimFrameId;
var pParticles = [];

const state = {
  analysis: null,
  activeFilter: "ALL",
  contractType: "Hợp đồng thuê nhà",
  pendingFile: null,
  loadingTimer: null,
  successTimer: null,
  activeView: "intro",
  chatMessages: [],
  chatHistory: [],
  chatAnalysisKey: "",
  chatOpen: false,
};

const MAX_FILE_BYTES = 80 * 1024 * 1024;
const DEFAULT_FILE_LABEL = "Chọn DOCX, TXT hoặc PDF";
const DEFAULT_FILE_SUBLABEL = "80MB tối đa";

const severity = {
  RED: { label: "Đỏ", weight: 3, summary: "Rủi ro cao cần sửa trước khi ký" },
  YELLOW: { label: "Vàng", weight: 2, summary: "Điểm mơ hồ cần thương lượng" },
  GREEN: { label: "Xanh", weight: 1, summary: "Điểm đang tương đối an toàn" },
};

const selectors = {
  introView: document.querySelector("#introView"),
  reportView: document.querySelector("#reportView"),
  homeBtn: document.querySelector("#homeBtn"),
  heroFileInput: document.querySelector("#heroFileInput"),
  heroFileLabel: document.querySelector("#heroFileLabel"),
  heroFileSubLabel: document.querySelector("#heroFileSubLabel"),
  heroDropzone: document.querySelector("#heroDropzone"),
  heroScanBtn: document.querySelector("#heroScanBtn"),
  heroPasteBtn: document.querySelector("#heroPasteBtn"),
  heroSampleBtn: document.querySelector("#heroSampleBtn"),
  fileInput: document.querySelector("#fileInput"),
  fileLabel: document.querySelector("#fileLabel"),
  fileSubLabel: document.querySelector("#fileSubLabel"),
  dropzone: document.querySelector("#dropzone"),
  scanBtn: document.querySelector("#scanBtn"),
  sampleBtn: document.querySelector("#sampleBtn"),
  pasteBtn: document.querySelector("#pasteBtn"),
  pasteDialog: document.querySelector("#pasteDialog"),
  pasteForm: document.querySelector("#pasteForm"),
  pasteText: document.querySelector("#pasteText"),
  exportBtn: document.querySelector("#exportBtn"),
  documentTitle: document.querySelector("#documentTitle"),
  documentViewer: document.querySelector("#documentViewer"),
  categoryCount: document.querySelector("#categoryCount"),
  privacyStatus: document.querySelector("#privacyStatus"),
  scoreRing: document.querySelector("#scoreRing"),
  scoreValue: document.querySelector("#scoreValue"),
  riskLevel: document.querySelector("#riskLevel"),
  riskSummary: document.querySelector("#riskSummary"),
  countAll: document.querySelector("#countAll"),
  countRed: document.querySelector("#countRed"),
  countYellow: document.querySelector("#countYellow"),
  countGreen: document.querySelector("#countGreen"),
  pipeline: document.querySelector("#pipeline"),
  deepInsights: document.querySelector("#deepInsights"),
  findingsList: document.querySelector("#findingsList"),
  reportChat: document.querySelector("#reportChat"),
  chatLauncher: document.querySelector("#chatLauncher"),
  chatCloseBtn: document.querySelector("#chatCloseBtn"),
  chatMessages: document.querySelector("#chatMessages"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  chatSendBtn: document.querySelector("#chatSendBtn"),
  disclaimer: document.querySelector("#disclaimer"),
  toast: document.querySelector("#toast"),
};

const STATUSES = {
  idle: { text: "Sẵn sàng quét hợp đồng", icon: "📄", className: "status-idle" },
  scanning: { text: "đang quét hợp đồng", icon: "🔍", className: "status-scanning" },
  redacting: { text: "đang che thông tin cá nhân, thông tin nhạy cảm", icon: "🛡️", className: "status-redacting" },
  analyzing: { text: "AI đang phân tích", icon: "🧠", className: "status-analyzing" },
  success: { text: "AI phân tích thành công", icon: "✅", className: "status-success" },
  completed: { text: "Hoàn tất báo cáo", icon: "📊", className: "status-completed" },
  error: { text: "Lỗi phân tích hợp đồng", icon: "❌", className: "status-error" }
};

function setPipelineStatus(statusKey) {
  const status = STATUSES[statusKey];
  if (!status) return;

  const pipeline = selectors.pipeline;
  if (!pipeline) return;

  // Clear previous status classes
  Object.values(STATUSES).forEach(s => pipeline.classList.remove(s.className));
  pipeline.classList.add(status.className);

  const iconEl = pipeline.querySelector(".status-icon");
  const textEl = pipeline.querySelector("#pipelineStatusText");

  if (iconEl) iconEl.textContent = status.icon;
  if (textEl) textEl.textContent = status.text;
}

function showIntro() {
  setPipelineStatus("idle");
  state.activeView = "intro";
  document.body.classList.add("intro-mode");
  selectors.introView.classList.remove("is-hidden");
  selectors.reportView.classList.add("is-hidden");
  selectors.homeBtn.disabled = true;
  selectors.exportBtn.disabled = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
  initParticles();
}

function showReport() {
  state.activeView = "report";
  document.body.classList.remove("intro-mode");
  selectors.introView.classList.add("is-hidden");
  selectors.reportView.classList.remove("is-hidden");
  selectors.homeBtn.disabled = false;
  selectors.exportBtn.disabled = !state.analysis;
  window.scrollTo({ top: 0, behavior: "smooth" });
  stopParticles();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function shorten(value, maxLength = 220) {
  const text = compact(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function showToast(message) {
  selectors.toast.textContent = message;
  selectors.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => selectors.toast.classList.remove("is-visible"), 2600);
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function setFileLabels(label, subLabel) {
  selectors.fileLabel.textContent = label;
  selectors.fileSubLabel.textContent = subLabel;
  selectors.heroFileLabel.textContent = label;
  selectors.heroFileSubLabel.textContent = subLabel;
}

function loadingMessageForFile(file) {
  if (/\.pdf$/i.test(file.name)) {
    return "Đang trích xuất chữ từ PDF. Nếu là PDF scan ảnh, OCR tiếng Việt có thể mất 1-3 phút cho 30-40 trang.";
  }
  return "Đang đọc nội dung hợp đồng và đối chiếu với checklist rủi ro.";
}

function renderProcessingState(title, message) {
  state.analysis = null;
  state.chatMessages = [];
  state.chatAnalysisKey = "";
  state.chatOpen = false;
  selectors.scoreRing.style.setProperty("--score", 0);
  selectors.scoreValue.textContent = "--";
  selectors.riskLevel.textContent = "Đang phân tích";
  selectors.riskSummary.textContent = message;
  selectors.countAll.textContent = "0";
  selectors.countRed.textContent = "0";
  selectors.countYellow.textContent = "0";
  selectors.countGreen.textContent = "0";
  selectors.documentTitle.textContent = title;
  selectors.categoryCount.textContent = "40 hạng mục";
  selectors.privacyStatus.textContent = "Đang ẩn PII";
  selectors.disclaimer.textContent = "Đang phân tích, vui lòng giữ tab này mở cho đến khi có báo cáo.";
  selectors.deepInsights.innerHTML = `
    <div class="empty-state compact">
      <strong>Đang chạy deep scan</strong>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  selectors.findingsList.innerHTML = `
    <div class="empty-state compact">
      <strong>Đang tạo thẻ hành động</strong>
      <span>Hệ thống đang tìm điều khoản Đỏ, Vàng và Xanh.</span>
    </div>
  `;
  renderChat();
  selectors.documentViewer.innerHTML = `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  selectors.exportBtn.disabled = true;
  showReport();
}

function renderErrorState(message) {
  state.analysis = null;
  state.chatMessages = [];
  state.chatAnalysisKey = "";
  state.chatOpen = false;
  selectors.scoreRing.style.setProperty("--score", 0);
  selectors.scoreValue.textContent = "--";
  selectors.riskLevel.textContent = "Không phân tích được";
  selectors.riskSummary.textContent = message;
  selectors.countAll.textContent = "0";
  selectors.countRed.textContent = "0";
  selectors.countYellow.textContent = "0";
  selectors.countGreen.textContent = "0";
  selectors.categoryCount.textContent = "40 hạng mục";
  selectors.privacyStatus.textContent = "Chưa xử lý PII";
  selectors.deepInsights.innerHTML = `
    <div class="empty-state compact">
      <strong>Cần file có lớp chữ</strong>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  selectors.findingsList.innerHTML = `
    <div class="empty-state compact">
      <strong>Chưa tạo được thẻ rủi ro</strong>
      <span>Hãy thử PDF có text layer, DOCX hoặc dán trực tiếp nội dung hợp đồng.</span>
    </div>
  `;
  renderChat();
  selectors.documentViewer.innerHTML = `
    <div class="empty-state">
      <strong>Không đọc được nội dung</strong>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  selectors.disclaimer.textContent = "PDF scan ảnh cần ảnh rõ, thẳng trang và đủ tương phản để OCR nhận chữ chính xác.";
  selectors.exportBtn.disabled = true;
  showReport();
}

function setLoading(isLoading) {
  document.body.classList.toggle("is-loading", isLoading);
  selectors.scanBtn.disabled = isLoading || !state.pendingFile;
  selectors.heroScanBtn.disabled = isLoading || !state.pendingFile;
  selectors.sampleBtn.disabled = isLoading;
  selectors.heroSampleBtn.disabled = isLoading;
  selectors.pasteBtn.disabled = isLoading;
  selectors.heroPasteBtn.disabled = isLoading;
  selectors.exportBtn.disabled = isLoading || !state.analysis;
  selectors.scanBtn.textContent = isLoading ? "Đang quét" : "Quét rủi ro";
  selectors.heroScanBtn.textContent = isLoading ? "Đang quét" : "Quét rủi ro";

  window.clearInterval(state.loadingTimer);
  window.clearTimeout(state.successTimer);

  if (isLoading) {
    let currentStep = 0;
    setPipelineStatus("scanning");
    state.loadingTimer = window.setInterval(() => {
      currentStep++;
      if (currentStep === 1) {
        setPipelineStatus("redacting");
      } else if (currentStep === 2) {
        setPipelineStatus("analyzing");
        window.clearInterval(state.loadingTimer);
      }
    }, 2500);
  } else {
    const pipeline = selectors.pipeline;
    const isScanning = pipeline && (
      pipeline.classList.contains("status-scanning") ||
      pipeline.classList.contains("status-redacting") ||
      pipeline.classList.contains("status-analyzing")
    );

    if (isScanning) {
      if (state.analysis) {
        setPipelineStatus("success");
        state.successTimer = window.setTimeout(() => {
          setPipelineStatus("completed");
        }, 1500);
      } else {
        setPipelineStatus("error");
      }
    } else {
      setPipelineStatus(state.analysis ? "completed" : "idle");
    }
  }
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || payload.error || "Không thể xử lý yêu cầu");
  }
  return payload;
}

async function analyzeSample() {
  renderProcessingState("Đang quét hợp đồng mẫu", "Đang tải hợp đồng mẫu và tạo báo cáo demo.");
  setLoading(true);
  try {
    const result = await fetch("/api/analyze-sample").then(readJson);
    state.analysis = result;
    state.pendingFile = null;
    resetChatForAnalysis();
    setFileLabels(DEFAULT_FILE_LABEL, DEFAULT_FILE_SUBLABEL);
    render();
    showToast("Đã tải báo cáo demo");
  } catch (error) {
    renderErrorState(error.message);
    showToast(error.message);
  } finally {
    setLoading(false);
  }
}

async function analyzePendingFile() {
  if (!state.pendingFile) return;
  renderProcessingState(`Đang quét ${state.pendingFile.name}`, loadingMessageForFile(state.pendingFile));
  setLoading(true);
  try {
    const formData = new FormData();
    formData.append("file", state.pendingFile);
    formData.append("contractType", state.contractType);
    const result = await fetch("/api/analyze", { method: "POST", body: formData }).then(readJson);
    state.analysis = result;
    resetChatForAnalysis();
    render();
    showToast("Đã hoàn tất phân tích");
  } catch (error) {
    renderErrorState(error.message);
    showToast(error.message);
  } finally {
    setLoading(false);
  }
}

async function analyzePastedText(text) {
  renderProcessingState("Đang quét nội dung dán", "Đang đọc nội dung đã dán và tạo báo cáo rủi ro.");
  setLoading(true);
  try {
    const result = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        fileName: "pasted-contract.txt",
        contractType: state.contractType,
      }),
    }).then(readJson);
    state.analysis = result;
    resetChatForAnalysis();
    render();
    showToast("Đã phân tích nội dung dán");
  } catch (error) {
    renderErrorState(error.message);
    showToast(error.message);
  } finally {
    setLoading(false);
  }
}

function riskLabel(overallRisk) {
  if (overallRisk === "HIGH") return "Rủi ro cao";
  if (overallRisk === "MEDIUM") return "Rủi ro trung bình";
  return "Rủi ro thấp";
}

function renderSummary() {
  const analysis = state.analysis;
  if (!analysis) return;

  const { summary } = analysis;
  const counts = summary.counts;
  const total = counts.RED + counts.YELLOW + counts.GREEN;
  selectors.scoreRing.style.setProperty("--score", summary.riskScore);
  selectors.scoreValue.textContent = summary.riskScore;
  selectors.riskLevel.textContent = riskLabel(summary.overallRisk);
  const readiness = analysis.deepAnalysis?.readiness?.label;
  selectors.riskSummary.textContent = `${counts.RED} Đỏ, ${counts.YELLOW} Vàng, ${counts.GREEN} Xanh sau khi quét ${summary.scannedCategories} hạng mục.${readiness ? ` ${readiness}.` : ""}`;
  selectors.countAll.textContent = total;
  selectors.countRed.textContent = counts.RED;
  selectors.countYellow.textContent = counts.YELLOW;
  selectors.countGreen.textContent = counts.GREEN;
  selectors.documentTitle.textContent = analysis.fileName;
  selectors.categoryCount.textContent = `${summary.scannedCategories} hạng mục`;
  selectors.privacyStatus.textContent = `Đã ẩn ${summary.piiItemsRedacted} PII`;
  selectors.disclaimer.textContent = analysis.disclaimer;
}

function renderScoringFramework(framework) {
  if (!framework) return "";
  const impacts = Array.isArray(framework.categoryImpacts) ? framework.categoryImpacts : [];
  return `
    <div class="score-framework">
      <div class="score-framework-head">
        <div>
          <span>Khung điểm ổn định</span>
          <strong>${escapeHtml(framework.version || "Rubric")}</strong>
        </div>
        <div class="score-formula">
          ${escapeHtml(String(framework.baseScore || 96))} - ${escapeHtml(String(framework.penaltyPoints || 0))} + ${escapeHtml(String(framework.greenCredit || 0))}
        </div>
      </div>
      <p>${escapeHtml(framework.method || "Điểm được tính bằng rubric cố định sau phân tích.")}</p>
      ${impacts.length ? `
        <div class="score-impact-list">
          ${impacts.map((item) => `
            <div class="score-impact ${item.severity}">
              <span>${escapeHtml(item.category)}</span>
              <strong>-${escapeHtml(String(item.points))}</strong>
            </div>
          `).join("")}
        </div>
      ` : `<span class="muted-line">Không có nhóm rủi ro Đỏ/Vàng bị trừ điểm.</span>`}
    </div>
  `;
}

function findFallbackForMetric(keywords) {
  const findings = sortedFindings();
  for (const f of findings) {
    const text = [f.muc_ra_soat, f.giai_thich_binh_dan, f.van_ban_goc_highlight].join(" ").toLowerCase();
    if (keywords.some((kw) => text.includes(kw))) {
      return {
        quote: f.van_ban_goc_highlight || null,
        reason: f.giai_thich_binh_dan || null,
        findingId: f.id || null,
      };
    }
  }
  return { quote: null, reason: null, findingId: null };
}

function buildMetricPopover(opts) {
  const { cardId, quote, reason, chatPrompt, jumpQuote, findingId } = opts;
  const quoteHtml = quote
    ? `<blockquote class="metric-quote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .75-1 1.5V19c0 1.25.75 2 2 2zm9-3c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .75-1 1.5V19c0 1.25.75 2 2 2z"/></svg>${escapeHtml(quote)}</blockquote>`
    : `<p class="metric-quote-empty">AI không tìm thấy điều khoản liên quan trong văn bản hợp đồng — con số được ước tính từ ngữ cảnh tổng thể.</p>`;
  const reasonHtml = reason
    ? `<p class="metric-reason"><strong>Căn cứ AI:</strong> ${escapeHtml(reason)}</p>`
    : "";
  const jumpBtn = (jumpQuote || findingId)
    ? `<button class="metric-popover-jump mini-btn" type="button" ${jumpQuote ? `data-metric-jump="${escapeHtml(jumpQuote)}"` : ""} ${findingId ? `data-metric-finding="${escapeHtml(findingId)}"` : ""}>Tới đoạn gốc ↗</button>`
    : `<button class="metric-popover-jump mini-btn" type="button" disabled title="Không tìm thấy đoạn hợp đồng tương ứng">Tới đoạn gốc ↗</button>`;
  return `
    <div class="metric-popover" id="${cardId}-popover" role="tooltip" aria-live="polite" hidden>
      <div class="metric-popover-inner">
        <div class="metric-popover-body">
          ${quoteHtml}
          ${reasonHtml}
        </div>
        <div class="metric-popover-actions">
          ${jumpBtn}
          <button class="mini-btn ask-finding-btn" type="button" data-chat-prompt="${escapeHtml(chatPrompt)}">Hỏi thêm →</button>
        </div>
      </div>
    </div>`;
}

function firstMatch(text, patterns, fallback = "Chưa xác định") {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return compact(match[1]);
  }
  return fallback;
}

function timelineValue(timeline, keywords, fallback = "Chưa xác định") {
  const item = timeline.find((entry) => {
    const label = normalizeSearchText(entry.label || "");
    return keywords.some((keyword) => label.includes(keyword));
  });
  return item?.value || fallback;
}

function extractContractSummary(analysis) {
  const text = analysis.text || "";
  const compactText = compact(text);
  const timeline = analysis.deepAnalysis?.timeline || [];
  const exposure = analysis.deepAnalysis?.financialExposure?.display || {};
  const counts = analysis.summary?.counts || { RED: 0, YELLOW: 0, GREEN: 0 };
  const score = analysis.summary?.riskScore || "--";
  const readiness = analysis.deepAnalysis?.readiness;
  const title = firstMatch(text, [/^\s*(HỢP ĐỒNG[^\n]+)/im], analysis.fileName || "Hợp đồng");
  const lessor = firstMatch(text, [/I\.\s*BÊN CHO THUÊ[\s\S]{0,420}?Họ và tên:\s*([^\n]+)/i, /(?:^|\n)\s*(?:- )?Bên cho thuê\s*:\s*([^\n]+)/i]);
  const tenant = firstMatch(text, [/II\.\s*BÊN THUÊ[\s\S]{0,420}?Họ và tên:\s*([^\n]+)/i, /(?:^|\n)\s*(?:- )?Bên thuê\s*:\s*([^\n]+)/i]);
  const propertyType = firstMatch(text, [/Loại nhà ở:\s*([^\n]+)/i], "Nhà ở / tài sản thuê");
  const propertyAddress = firstMatch(text, [/Vị trí, địa điểm nhà ở:\s*([^\n]+)/i, /Địa chỉ nhà[^:]*:\s*([^\n]+)/i]);
  const rent = firstMatch(text, [/Giá thuê[^.\n]*?là\s*([0-9.,]+\s*đồng\/tháng)/i, /tiền thuê[^.\n]*?([0-9.,]+\s*đồng\/tháng)/i], "Chưa xác định");
  const deposit = exposure.deposit || firstMatch(text, [/đặt cọc\s*([0-9.,]+\s*đồng)/i], "Chưa xác định");
  const term = timelineValue(timeline, ["thoi han thue"], firstMatch(text, [/Thời hạn thuê[^.\n]*?là\s*([^.\n]+)/i], "Chưa xác định"));
  const paymentDue = timelineValue(timeline, ["han tra tien", "thanh toan"], firstMatch(text, [/thanh toán chậm nhất vào\s*([^.\n]+)/i], "Chưa xác định"));
  const handover = timelineValue(timeline, ["giao", "ban giao"], firstMatch(text, [/Thời điểm giao nhận nhà:\s*([^\n.]+)/i], "Chưa xác định"));
  const purpose = firstMatch(text, [/Công năng sử dụng:\s*([^\n]+)/i, /mục đích thuê[^:]*:\s*([^\n]+)/i], "Chưa xác định");
  const placeAndDate = firstMatch(text, [/(Thành phố[^\n]+ngày[^\n]+)/i, /(Hà Nội[^\n]+ngày[^\n]+)/i, /(TP\.?[^\n]+ngày[^\n]+)/i], "");
  const topRisks = sortedFindings()
    .filter((finding) => finding.muc_do_rui_ro !== "GREEN")
    .slice(0, 4)
    .map((finding) => ({
      label: finding.muc_ra_soat,
      severity: finding.muc_do_rui_ro,
    }));

  return {
    title,
    placeAndDate,
    brief: `Hợp đồng ghi nhận giao dịch ${normalizeSearchText(title).includes("thue") ? "thuê nhà ở" : "dân sự/thương mại"} giữa ${lessor} và ${tenant}${propertyAddress !== "Chưa xác định" ? ` đối với tài sản tại ${propertyAddress}` : ""}.`,
    riskSummary: {
      label: riskLabel(analysis.summary?.overallRisk),
      score,
      counts,
      readinessLabel: readiness?.label || "",
      reason: readiness?.reason || `Có ${counts.RED} rủi ro Đỏ, ${counts.YELLOW} rủi ro Vàng và ${counts.GREEN} điểm Xanh trong báo cáo.`,
      action: counts.RED
        ? "Ưu tiên xử lý các điểm Đỏ trước khi ký, sau đó rà soát các điểm Vàng liên quan đến nghĩa vụ tiền và quyền chấm dứt."
        : counts.YELLOW
          ? "Nên đàm phán rõ các điểm Vàng trước khi ký để giảm tranh chấp khi thực hiện hợp đồng."
          : "Chưa phát hiện rủi ro nghiêm trọng trong bộ rule hiện tại, nhưng vẫn nên rà soát thủ công trước khi ký.",
    },
    items: [
      { label: "Bên cho thuê", value: lessor },
      { label: "Bên thuê", value: tenant },
      { label: "Tài sản thuê", value: propertyAddress !== "Chưa xác định" ? propertyAddress : propertyType },
      { label: "Mục đích sử dụng", value: purpose },
      { label: "Thời hạn", value: term },
      { label: "Bàn giao", value: handover },
      { label: "Giá thuê", value: rent },
      { label: "Tiền cọc", value: deposit },
      { label: "Hạn thanh toán", value: paymentDue },
    ],
    topRisks,
    compactText,
  };
}

function renderDeepInsights() {
  const deep = state.analysis?.deepAnalysis;
  if (!deep) return;

  const contractSummary = extractContractSummary(state.analysis);

  selectors.deepInsights.innerHTML = `
    <div class="insight-head">
      <div>
        <p class="eyebrow">Tóm tắt hợp đồng</p>
        <h2>${escapeHtml(contractSummary.title)}</h2>
      </div>
      <div class="insight-actions">
        <span class="readiness-chip">${escapeHtml(String(state.analysis.summary?.riskScore || "--"))}/100</span>
        <button class="ask-context-btn" type="button" data-chat-prompt="Tóm tắt hợp đồng này theo các bên, tài sản, thời hạn, tiền thuê, tiền cọc và các rủi ro nổi bật">
          Hỏi thêm
        </button>
      </div>
    </div>
    <p class="insight-reason">${escapeHtml(contractSummary.brief)}</p>
    <div class="contract-summary-grid">
      ${contractSummary.items.map((item) => `
        <div class="contract-summary-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `).join("")}
    </div>
    <section class="contract-risk-summary" aria-label="Tóm tắt rủi ro">
      <div class="contract-risk-summary-head">
        <div>
          <span>Tóm tắt rủi ro</span>
          <strong>${escapeHtml(contractSummary.riskSummary.label)}</strong>
        </div>
        <b>${escapeHtml(String(contractSummary.riskSummary.score))}/100</b>
      </div>
      <div class="risk-count-row" aria-label="Số lượng rủi ro theo mức độ">
        <span class="risk-count RED">Đỏ <strong>${escapeHtml(String(contractSummary.riskSummary.counts.RED || 0))}</strong></span>
        <span class="risk-count YELLOW">Vàng <strong>${escapeHtml(String(contractSummary.riskSummary.counts.YELLOW || 0))}</strong></span>
        <span class="risk-count GREEN">Xanh <strong>${escapeHtml(String(contractSummary.riskSummary.counts.GREEN || 0))}</strong></span>
      </div>
      <p>${escapeHtml(contractSummary.riskSummary.reason)}</p>
      <small>${escapeHtml(contractSummary.riskSummary.action)}</small>
    </section>
    ${contractSummary.topRisks.length ? `
      <div class="summary-risk-strip">
        <span>Rủi ro nổi bật</span>
        <div>
          ${contractSummary.topRisks.map((risk) => `
            <button class="summary-risk-chip ${risk.severity}" type="button" data-chat-prompt="Giải thích rủi ro '${escapeHtml(risk.label)}' trong bối cảnh tóm tắt hợp đồng này">
              ${escapeHtml(risk.label)}
            </button>
          `).join("")}
        </div>
      </div>
    ` : ""}
  `;
}

function splitParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function sortedFindings() {
  return [...(state.analysis?.findings || [])].sort((a, b) => {
    return severity[b.muc_do_rui_ro].weight - severity[a.muc_do_rui_ro].weight;
  });
}

function findingRewriteText(finding) {
  return compact(finding.cau_sua_bo_sung || finding.rewriteSuggestion || finding.goi_y_dam_phan || "");
}

function renderLegalReferences(finding) {
  const references = Array.isArray(finding.legalReferences)
    ? finding.legalReferences.filter((ref) => ref && ref.url && ref.label)
    : [];

  if (!references.length) {
    return `
      <div class="finding-meta">
        <span>Cơ sở: ${escapeHtml(finding.co_so_phap_ly || "Đang cập nhật")}</span>
        <span>Độ tin cậy: ${Math.round(finding.confidence * 100)}%</span>
      </div>
    `;
  }

  return `
    <div class="legal-links">
      <strong>Căn cứ pháp lý</strong>
      <div class="legal-link-list">
        ${references.map((ref) => `
          <a class="legal-link" href="${escapeHtml(ref.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(ref.title || ref.label)}">
            ${escapeHtml(ref.label)}
          </a>
        `).join("")}
      </div>
      <span>${escapeHtml(finding.co_so_phap_ly || "Mở liên kết để xem điều luật cụ thể")}</span>
    </div>
    <div class="finding-meta compact-meta">
      <span>Độ tin cậy: ${Math.round(finding.confidence * 100)}%</span>
    </div>
  `;
}

function findingForParagraph(paragraph) {
  const para = compact(paragraph);
  return sortedFindings().find((finding) => {
    const quote = compact(finding.van_ban_goc_highlight);
    return quote && para.includes(quote);
  });
}

function renderParagraph(paragraph, index) {
  const isPageIndicator = /^\[Trang \d+(?:\s*-\s*OCR)?\]/i.test(paragraph);
  if (isPageIndicator) {
    return `<div class="doc-page-indicator">${escapeHtml(paragraph)}</div>`;
  }

  const finding = findingForParagraph(paragraph);
  const centerish = /^(?:HỢP ĐỒNG|CỘNG HÒA|ĐỘC LẬP|ĐỀ NGHỊ|THỎA THUẬN|BIÊN BẢN|CAM KẾT|QUYẾT ĐỊNH|BẢN CAM KẾT|GIẤY)/i.test(paragraph.trim());

  if (!finding) {
    return `<p class="doc-paragraph${centerish ? " centerish" : ""}">${escapeHtml(paragraph)}</p>`;
  }

  const quote = compact(finding.van_ban_goc_highlight);
  const exactIndex = paragraph.indexOf(quote);
  const mark = (value) =>
    `<mark class="risk-mark ${finding.muc_do_rui_ro}" data-finding-id="${finding.id}" id="hl-${finding.id}">${escapeHtml(value)}</mark>`;

  let html;
  if (exactIndex >= 0) {
    html =
      escapeHtml(paragraph.slice(0, exactIndex)) +
      mark(paragraph.slice(exactIndex, exactIndex + quote.length)) +
      escapeHtml(paragraph.slice(exactIndex + quote.length));
  } else {
    html = mark(paragraph);
  }

  return `<p class="doc-paragraph${centerish ? " centerish" : ""}">${html}</p>`;
}

function renderDocument() {
  const analysis = state.analysis;
  if (!analysis) return;
  const paragraphs = splitParagraphs(analysis.text);
  selectors.documentViewer.innerHTML = `
    <div class="document-pages">
      ${paragraphs.map(renderParagraph).join("")}
    </div>
  `;
}

function renderFindings() {
  const analysis = state.analysis;
  if (!analysis) return;
  const findings = sortedFindings().filter((finding) => {
    return state.activeFilter === "ALL" || finding.muc_do_rui_ro === state.activeFilter;
  });

  if (!findings.length) {
    selectors.findingsList.innerHTML = `
      <div class="empty-state compact">
        <strong>Không có thẻ trong bộ lọc này</strong>
        <span>Chọn bộ lọc khác để xem tiếp.</span>
      </div>
    `;
    return;
  }

  selectors.findingsList.innerHTML = findings
    .map((finding) => {
      const level = severity[finding.muc_do_rui_ro];
      const rewriteText = findingRewriteText(finding);
      return `
        <article class="finding-card ${finding.muc_do_rui_ro}" data-finding-id="${finding.id}">
          <div class="finding-head">
            <h3>${escapeHtml(finding.muc_ra_soat)}</h3>
            <div class="badges">
              <span class="priority-badge">${escapeHtml(finding.impact?.priority || "P3")}</span>
              <span class="severity-badge ${finding.muc_do_rui_ro}">${level.label}</span>
            </div>
          </div>
          <p>${escapeHtml(finding.giai_thich_binh_dan)}</p>
          <div class="impact-grid">
            <span><strong>Bị ảnh hưởng</strong>${escapeHtml(finding.impact?.affectedParty || "Người ký")}</span>
            <span><strong>Exposure</strong>${escapeHtml(finding.impact?.financialExposure || "Không định lượng trực tiếp")}</span>
          </div>
          <div class="suggestion-box">
            <strong>Câu đề xuất</strong>
            <span>${escapeHtml(finding.goi_y_dam_phan)}</span>
          </div>
          <div class="suggestion-box rewrite-box">
            <strong>Câu sửa bổ sung</strong>
            <span>${escapeHtml(rewriteText)}</span>
          </div>
          ${renderLegalReferences(finding)}
          <div class="card-actions">
            <button class="mini-btn jump-btn" type="button" data-finding-id="${finding.id}" ${
        finding.van_ban_goc_highlight ? "" : "disabled"
      }>Tới đoạn gốc</button>
            <button class="mini-btn ask-finding-btn" type="button" data-chat-prompt="Giải thích rủi ro '${escapeHtml(finding.muc_ra_soat)}', căn cứ pháp lý và câu sửa nên dùng">
              Hỏi thêm
            </button>
            <button class="mini-btn copy-btn" type="button" data-copy="${escapeHtml(rewriteText)}">Copy câu sửa</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function normalizeSearchText(value) {
  return compact(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function searchTokens(query) {
  const stopwords = new Set([
    "toi",
    "minh",
    "co",
    "khong",
    "khong?",
    "la",
    "ve",
    "va",
    "hoac",
    "neu",
    "thi",
    "trong",
    "hop",
    "dong",
    "dieu",
    "khoan",
    "can",
    "tim",
    "hoi",
    "gi",
  ]);
  return normalizeSearchText(query)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 2 && !stopwords.has(token));
}

function chatAnalysisKey() {
  if (!state.analysis) return "";
  return `${state.analysis.fileName || "contract"}:${state.analysis.summary?.riskScore || 0}:${state.analysis.findings?.length || 0}`;
}

function resetChatForAnalysis() {
  state.chatAnalysisKey = chatAnalysisKey();
  state.chatHistory = [];
  const numRed = (state.analysis?.findings || []).filter((f) => f.muc_do_rui_ro === "RED").length;
  const numYellow = (state.analysis?.findings || []).filter((f) => f.muc_do_rui_ro === "YELLOW").length;
  const score = state.analysis?.summary?.riskScore ?? "--";
  const fileName = state.analysis?.fileName || "hợp đồng";
  state.chatMessages = [
    {
      role: "bot",
      html: `<p>✅ Mình đã đọc toàn bộ <strong>${escapeHtml(fileName)}</strong> — điểm rủi ro <strong>${score}/100</strong>, phát hiện <strong style="color:#dc2626">${numRed} rủi ro đỏ</strong> và <strong style="color:#ca8a04">${numYellow} rủi ro vàng</strong>.</p><p style="margin-top:6px">Bạn có thể hỏi tự do về bất kỳ điều khoản nào, căn cứ pháp lý, câu sửa đề xuất hoặc đặt câu hỏi pháp lý như <em>"đặt cọc tối đa bao nhiêu?"</em> hay <em>"lãi suất phạt theo luật là bao nhiêu%?"</em>. Mình sẽ kết hợp dữ liệu hợp đồng + tìm kiếm web để trả lời chính xác nhất.</p>`,
      text: `Đã đọc xong báo cáo ${fileName}.`,
      sources: [],
    },
  ];
}

function legalReferenceText(ref) {
  return compact(`${ref?.label || ""} ${ref?.title || ""} ${ref?.url || ""}`);
}

function buildChatDocuments() {
  const analysis = state.analysis;
  if (!analysis) return [];

  const docs = [];
  const findings = sortedFindings();
  findings.forEach((finding) => {
    const level = severity[finding.muc_do_rui_ro]?.label || finding.muc_do_rui_ro || "Rủi ro";
    const rewrite = findingRewriteText(finding);
    const legalText = Array.isArray(finding.legalReferences)
      ? finding.legalReferences.map(legalReferenceText).join(" ")
      : "";
    docs.push({
      type: "finding",
      title: `${level}: ${finding.muc_ra_soat}`,
      text: compact(
        [
          finding.muc_ra_soat,
          finding.giai_thich_binh_dan,
          finding.goi_y_dam_phan,
          rewrite,
          finding.co_so_phap_ly,
          finding.van_ban_goc_highlight,
          legalText,
        ].join(" ")
      ),
      findingId: finding.id,
      severity: finding.muc_do_rui_ro,
      finding,
    });

    (finding.legalReferences || []).forEach((ref) => {
      if (!ref?.url || !ref?.label) return;
      docs.push({
        type: "law",
        title: ref.label,
        text: compact(`${legalReferenceText(ref)} ${finding.muc_ra_soat} ${finding.co_so_phap_ly}`),
        url: ref.url,
        findingId: finding.id,
        finding,
      });
    });
  });

  splitParagraphs(analysis.text).forEach((paragraph, index) => {
    if (paragraph.length < 24) return;
    docs.push({
      type: "contract",
      title: `Đoạn hợp đồng ${index + 1}`,
      text: paragraph,
      paragraphIndex: index,
      findingId: findingForParagraph(paragraph)?.id || "",
    });
  });

  const framework = analysis.deepAnalysis?.scoringFramework;
  if (framework) {
    docs.push({
      type: "score",
      title: "Khung điểm ổn định",
      text: compact(
        [
          framework.version,
          framework.method,
          `Điểm: ${framework.baseScore} - ${framework.penaltyPoints} + ${framework.greenCredit}`,
          ...(framework.categoryImpacts || []).map((item) => `${item.category} ${item.severity} ${item.points}`),
        ].join(" ")
      ),
    });
  }

  return docs;
}

function searchChatDocuments(query, limit = 6) {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = searchTokens(query);
  const docs = buildChatDocuments();
  const severityBoost = {
    RED: /(do|cao|nghiem|p1|sua truoc)/,
    YELLOW: /(vang|mo ho|dam phan|p2)/,
    GREEN: /(xanh|an toan|on)/,
  };

  return docs
    .map((doc) => {
      const haystack = normalizeSearchText(`${doc.title} ${doc.text}`);
      let score = normalizedQuery && haystack.includes(normalizedQuery) ? 18 : 0;
      tokens.forEach((token) => {
        if (haystack.includes(token)) score += token.length > 4 ? 4 : 2;
      });
      if (doc.type === "law" && /(luat|phap ly|can cu|dieu)/.test(normalizedQuery)) score += 7;
      if (doc.type === "score" && /(diem|score|tru|rubric|on dinh)/.test(normalizedQuery)) score += 10;
      if (doc.type === "finding" && severityBoost[doc.severity]?.test(normalizedQuery)) score += 7;
      return { ...doc, score };
    })
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function sourceKey(source) {
  return [source.type, source.title, source.url || "", source.findingId || "", source.paragraphIndex ?? ""].join("|");
}

function uniqueSources(sources) {
  const seen = new Set();
  return sources.filter((source) => {
    const key = sourceKey(source);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildChatAnswer(query) {
  if (!state.analysis) {
    return {
      text: "Bạn hãy quét hợp đồng hoặc chạy mẫu demo trước, rồi mình sẽ search trong báo cáo để trả lời theo đúng dữ liệu của hợp đồng đó.",
      sources: [],
    };
  }

  const normalizedQuery = normalizeSearchText(query);
  const hits = uniqueSources(searchChatDocuments(query, 8));

  // Intent parsing
  const isRedRiskIntent = /(sua gi|can sua|nghiem trong|rui ro cao|kho khan|nguy hiem|p1|the do|can chinh sua)/i.test(normalizedQuery);
  const isMissingClauseIntent = /(thieu|bo sung|them|chua co|chua de cap|khoang trong|missing)/i.test(normalizedQuery);
  const isScoreIntent = /(diem|score|tai sao tru|bi tru|tru diem|cach tinh|rubric|khung diem)/i.test(normalizedQuery);

  if (isRedRiskIntent) {
    const redFindings = sortedFindings().filter((f) => f.muc_do_rui_ro === "RED");
    if (redFindings.length) {
      let html = `<p>Dưới đây là các rủi ro <strong>ĐỎ (nghiêm trọng nhất)</strong> cần được ưu tiên xem xét chỉnh sửa trong hợp đồng:</p>`;
      redFindings.forEach((f) => {
        const rewrite = findingRewriteText(f);
        html += `
          <div class="chat-card RED">
            <div class="chat-card-title">
              <span class="dot dot-red"></span> ${escapeHtml(f.muc_ra_soat)}
            </div>
            <div class="chat-card-body">
              ${escapeHtml(f.giai_thich_binh_dan)}
            </div>
            ${rewrite ? `
              <div class="chat-card-action">
                <div class="chat-card-action-title">Đề xuất câu sửa đổi:</div>
                ${escapeHtml(rewrite)}
                <button class="chat-copy-mini-btn" type="button" data-copy="${escapeHtml(rewrite)}">Copy</button>
              </div>
            ` : ""}
          </div>
        `;
      });
      return {
        text: `Các lỗi đỏ cần sửa: ` + redFindings.map(f => f.muc_ra_soat).join(", "),
        html,
        sources: redFindings.map(f => ({ type: "finding", title: f.muc_ra_soat, findingId: f.id, finding: f })).slice(0, 6)
      };
    } else {
      return {
        text: "Không phát hiện rủi ro Đỏ nào cần sửa trước khi ký.",
        html: `<p>🎉 Rất tốt! Hệ thống <strong>không phát hiện rủi ro Đỏ nào</strong> cần phải chỉnh sửa gấp trong hợp đồng này. Bạn có thể tham khảo các điểm rủi ro Vàng (mơ hồ) để thương lượng thêm.</p>`,
        sources: []
      };
    }
  }

  if (isMissingClauseIntent) {
    const missing = state.analysis.deepAnalysis?.missingClauses || [];
    if (missing.length) {
      let html = `<p>Dưới đây là các <strong>điều khoản đề xuất bổ sung</strong> nhằm bảo vệ quyền lợi của bạn tối đa:</p>`;
      missing.forEach((m) => {
        html += `
          <div class="chat-card YELLOW">
            <div class="chat-card-title">${escapeHtml(m.title)}</div>
            <div class="chat-card-body">
              ${escapeHtml(m.advice)}
            </div>
          </div>
        `;
      });
      return {
        text: `Các điều khoản thiếu đề xuất bổ sung: ` + missing.map(m => m.title).join(", "),
        html,
        sources: []
      };
    } else {
      return {
        text: "Hợp đồng không thiếu điều khoản quan trọng nào.",
        html: `<p>👍 Tuyệt vời! Đối chiếu với checklist chuẩn, hợp đồng hiện tại <strong>không thiếu điều khoản quan trọng nào</strong>.</p>`,
        sources: []
      };
    }
  }

  if (isScoreIntent) {
    const framework = state.analysis.deepAnalysis?.scoringFramework;
    const score = state.analysis.summary?.riskScore || 0;
    if (framework) {
      let html = `
        <p>Hợp đồng đạt <strong>${score}/100 điểm</strong>.</p>
        <p><strong>Cơ cấu tính điểm:</strong></p>
        <ul>
          <li>Điểm cơ sở: <code>${framework.baseScore || 96}</code></li>
          <li>Tổng điểm bị phạt: <code style="color: #dc2626;">-${framework.penaltyPoints || 0}</code></li>
          <li>Điểm cộng thưởng: <code style="color: #16a34a;">+${framework.greenCredit || 0}</code></li>
        </ul>
        <p><em>Hệ thống áp dụng phương án trừ điểm tối đa theo lỗi nặng nhất trong mỗi danh mục rủi ro để tránh việc cùng một loại lỗi bị trừ điểm lặp lại.</em></p>
      `;
      if (framework.categoryImpacts && framework.categoryImpacts.length) {
        html += `<p style="margin-top: 10px; font-weight: bold;">Các nhóm bị trừ điểm nặng nhất:</p><ul>`;
        framework.categoryImpacts.forEach((item) => {
          html += `<li><strong>${escapeHtml(item.category)}</strong>: -${item.points}đ (Mức độ: ${escapeHtml(severity[item.severity]?.label || item.severity)})</li>`;
        });
        html += `</ul>`;
      }
      return {
        text: `Điểm số: ${score}/100. Base: ${framework.baseScore}, phạt: ${framework.penaltyPoints}, thưởng: ${framework.greenCredit}`,
        html,
        sources: [{ type: "score", title: "Khung điểm ổn định" }]
      };
    }
  }

  if (!hits.length) {
    return {
      text: "Mình chưa tìm thấy đoạn nào đủ khớp trong báo cáo hiện tại. Bạn có thể hỏi cụ thể hơn, ví dụ: tiền cọc, chậm thanh toán, chấm dứt hợp đồng, bảo mật dữ liệu hoặc căn cứ pháp lý.",
      sources: [],
    };
  }

  let topFindings = hits.filter((hit) => hit.type === "finding").slice(0, 3);
  if (!topFindings.length) {
    const seenFindingIds = new Set();
    topFindings = hits
      .filter((hit) => hit.finding?.id)
      .filter((hit) => {
        if (seenFindingIds.has(hit.finding.id)) return false;
        seenFindingIds.add(hit.finding.id);
        return true;
      })
      .map((hit) => ({
        type: "finding",
        title: hit.finding.muc_ra_soat,
        text: hit.text,
        findingId: hit.finding.id,
        severity: hit.finding.muc_do_rui_ro,
        finding: hit.finding,
      }))
      .slice(0, 3);
  }
  const topLaws = hits.filter((hit) => hit.type === "law").slice(0, 3);
  const topContracts = hits.filter((hit) => hit.type === "contract").slice(0, 2);
  const scoreHit = hits.find((hit) => hit.type === "score");

  let html = `<p>Dưới đây là kết quả tìm kiếm liên quan nhất cho câu hỏi của bạn:</p>`;

  if (scoreHit) {
    const framework = state.analysis.deepAnalysis?.scoringFramework;
    html += `
      <div class="chat-card GREEN">
        <div class="chat-card-title">Điểm số & Đánh giá</div>
        <div class="chat-card-body">
          Điểm hiện tại là <strong>${state.analysis.summary?.riskScore}/100</strong>. Công thức: ${framework?.baseScore || 96} - ${framework?.penaltyPoints || 0}đ phạt + ${framework?.greenCredit || 0}đ thưởng. Điểm bị trừ theo nhóm rủi ro nặng nhất để tránh trùng lặp.
        </div>
      </div>
    `;
  }

  if (topFindings.length) {
    topFindings.forEach((hit) => {
      const finding = hit.finding;
      const level = severity[finding.muc_do_rui_ro]?.label || finding.muc_do_rui_ro;
      const rewrite = findingRewriteText(finding);
      html += `
        <div class="chat-card ${finding.muc_do_rui_ro}">
          <div class="chat-card-title">
            <span class="dot dot-${finding.muc_do_rui_ro.toLowerCase()}"></span> ${level}: ${escapeHtml(finding.muc_ra_soat)}
          </div>
          <div class="chat-card-body">
            ${escapeHtml(finding.giai_thich_binh_dan)}
          </div>
          ${rewrite ? `
            <div class="chat-card-action">
              <div class="chat-card-action-title">Đề xuất chỉnh sửa:</div>
              ${escapeHtml(rewrite)}
              <button class="chat-copy-mini-btn" type="button" data-copy="${escapeHtml(rewrite)}">Copy</button>
            </div>
          ` : ""}
        </div>
      `;
    });
  }

  if (topContracts.length) {
    html += `<p style="margin-top: 10px; font-weight: bold; font-size: 11px; color: #7d9690; text-transform: uppercase;">Đoạn hợp đồng liên quan:</p>`;
    topContracts.forEach((hit) => {
      html += `<div class="chat-quote">"${escapeHtml(shorten(hit.text, 260))}"</div>`;
    });
  }

  if (topLaws.length) {
    html += `
      <p style="margin-top: 8px; font-size: 12px;">
        <strong>Cơ sở pháp lý:</strong> ${topLaws.map(hit => {
          if (hit.url) return `<a href="${escapeHtml(hit.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(hit.title)}</a>`;
          return `<span>${escapeHtml(hit.title)}</span>`;
        }).join(", ")}
      </p>
    `;
  }

  return {
    text: `Search kết quả liên quan: ` + topFindings.map(f => f.title).join(", "),
    html,
    sources: uniqueSources([...topFindings, ...hits]).slice(0, 6),
  };
}

function renderChatSource(source) {
  if (source.type === "law" && source.url) {
    return `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>`;
  }
  if (source.findingId) {
    return `<button type="button" data-chat-finding-id="${escapeHtml(source.findingId)}">${escapeHtml(source.title)}</button>`;
  }
  return `<span>${escapeHtml(source.title)}</span>`;
}

function openChat(prefill = "") {
  state.chatOpen = true;
  if (prefill) selectors.chatInput.value = prefill;
  renderChat();
  window.setTimeout(() => selectors.chatInput.focus(), 50);
}

function closeChat() {
  state.chatOpen = false;
  renderChat();
}

function renderChat() {
  if (!selectors.chatMessages) return;
  const disabled = !state.analysis;
  
  if (disabled) {
    selectors.chatLauncher.classList.remove("is-visible");
    selectors.chatLauncher.disabled = true;
  } else {
    selectors.chatLauncher.classList.add("is-visible");
    selectors.chatLauncher.disabled = false;
  }

  if (state.chatOpen) {
    selectors.reportChat.hidden = false;
    // trigger reflow
    selectors.reportChat.offsetHeight;
    selectors.reportChat.classList.add("is-open");
  } else {
    selectors.reportChat.classList.remove("is-open");
    // set hidden after transition finishes (300ms)
    setTimeout(() => {
      if (!state.chatOpen) selectors.reportChat.hidden = true;
    }, 300);
  }

  selectors.chatSendBtn.disabled = disabled;
  selectors.chatInput.disabled = disabled;

  if (!state.chatMessages.length) {
    selectors.chatMessages.innerHTML = `
      <div class="chat-message bot">
        <div class="chat-message-content">
          <span>${disabled ? "Chatbot sẽ sẵn sàng sau khi có báo cáo phân tích." : "Bạn có thể hỏi về bất kỳ điểm nào trong hợp đồng."}</span>
        </div>
      </div>
    `;
    return;
  }

  selectors.chatMessages.innerHTML = state.chatMessages
    .map((message) => {
      if (message.isTyping) {
        return `
          <div class="chat-message bot">
            <div class="chat-bubble-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        `;
      }
      
      const contentHtml = message.html || parseMarkdownToHtml(message.text);
      return `
        <div class="chat-message ${message.role}">
          <div class="chat-message-content">${contentHtml}</div>
          ${message.sources?.length ? `
            <div class="chat-sources">
              <strong>Nguồn search</strong>
              <div>
                ${message.sources.map(renderChatSource).join("")}
              </div>
            </div>
          ` : ""}
        </div>
      `;
    })
    .join("");
    
  selectors.chatMessages.scrollTop = selectors.chatMessages.scrollHeight;
}

function parseMarkdownToHtml(text) {
  if (!text) return "";

  // ── Step 1: Extract blockquotes BEFORE HTML-escaping (> is still a literal >)
  const bqMap = {};
  let bqI = 0;
  text = text.replace(/^((?:> ?[^\n]*\n?)+)/gm, (match) => {
    const inner = match.replace(/^> ?/gm, "").trim();
    const key = `\x00BQ${bqI++}\x00`;
    bqMap[key] = inner;
    return key + "\n";
  });

  // ── Step 2: HTML-escape everything
  let html = escapeHtml(text);

  // ── Step 3: Restore blockquotes (inner text was NOT yet escaped, escape it now)
  for (const [key, rawInner] of Object.entries(bqMap)) {
    const escapedKey = escapeHtml(key);
    const escapedInner = escapeHtml(rawInner);
    html = html.replace(escapedKey, `<blockquote>${escapedInner}</blockquote>`);
  }

  // ── Step 4: Inline formatting
  // Headings
  html = html.replace(/^### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^## (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>");

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Italic (only single asterisk, not inside bold)
  html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // ── Step 5: Line-by-line for lists & paragraphs
  const lines = html.split("\n");
  let inUl = false;
  let inOl = false;
  const out = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Unordered list
    if (/^[-*] /.test(trimmed)) {
      if (inOl) { out.push("</ol>"); inOl = false; }
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${trimmed.substring(2)}</li>`);
      continue;
    }

    // Ordered list: starts with digit followed by . or )
    const olMatch = trimmed.match(/^(\d+)[.)]\s(.+)/);
    if (olMatch) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (!inOl) { out.push("<ol>"); inOl = true; }
      out.push(`<li>${olMatch[2]}</li>`);
      continue;
    }

    // Close any open lists
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      out.push("<hr>");
      continue;
    }

    // Structural tags: pass through as-is
    if (/^<(h[1-6]|blockquote|ul|ol|li|hr)/.test(trimmed)) {
      out.push(line);
      continue;
    }

    // Empty line → paragraph break
    if (trimmed === "") {
      out.push("<br>");
    } else {
      out.push(`<span>${line}</span><br>`);
    }
  }

  if (inUl) out.push("</ul>");
  if (inOl) out.push("</ol>");

  return out.join("\n").replace(/(<br>\s*){2,}/g, "<br>");
}

async function askChatbot(question) {
  const text = compact(question);
  if (!text) return;
  state.chatOpen = true;

  // Append user message to display
  state.chatMessages.push({ role: "user", text, sources: [] });

  // Typing indicator
  const typingMessage = { role: "bot", isTyping: true, text: "", sources: [] };
  state.chatMessages.push(typingMessage);
  selectors.chatInput.value = "";
  renderChat();

  // Build multi-turn history for API
  const historyForApi = state.chatHistory.slice(-20);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: text,
        history: historyForApi,
        analysis: state.analysis,
        contractType: state.contractType,
        enableWebSearch: true,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    const answerText = result.answer || "";
    const formattedHtml = parseMarkdownToHtml(answerText);

    // Web search badge
    const webBadge = result.usedWebSearch
      ? `<div style="margin-top:8px;display:flex;align-items:center;gap:5px;font-size:11px;color:#818cf8;opacity:.85;">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
           Có tìm kiếm web để bổ sung thông tin
         </div>`
      : "";

    const index = state.chatMessages.indexOf(typingMessage);
    if (index !== -1) {
      state.chatMessages[index] = {
        role: "bot",
        text: answerText,
        html: formattedHtml + webBadge,
        sources: [],
      };
    }

    // Save turns to multi-turn history
    state.chatHistory.push({ role: "user", text });
    state.chatHistory.push({ role: "assistant", text: answerText });

    renderChat();
  } catch (error) {
    console.warn("AI online error, falling back to offline:", error.message);

    // Offline fallback
    const realAnswer = buildChatAnswer(text);
    const index = state.chatMessages.indexOf(typingMessage);
    if (index !== -1) {
      const baseHtml = realAnswer.html || parseMarkdownToHtml(realAnswer.text || "");
      state.chatMessages[index] = {
        role: "bot",
        ...realAnswer,
        html: baseHtml +
          `<div style="margin-top:8px;font-size:11px;color:#dc2626;">⚠️ Không thể kết nối AI online (${escapeHtml(error.message)}). Đang dùng kết quả phân tích nội bộ.</div>`,
      };
    }
    renderChat();
  }
}


function render() {
  renderSummary();
  renderDeepInsights();
  renderDocument();
  renderFindings();
  if (state.analysis && state.chatAnalysisKey !== chatAnalysisKey()) resetChatForAnalysis();
  renderChat();
  selectors.exportBtn.disabled = !state.analysis;
}

function setPendingFile(file) {
  setPipelineStatus("idle");
  state.pendingFile = file || null;
  selectors.scanBtn.disabled = !file;
  selectors.heroScanBtn.disabled = !file;
  if (!file) {
    setFileLabels(DEFAULT_FILE_LABEL, DEFAULT_FILE_SUBLABEL);
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    state.pendingFile = null;
    selectors.scanBtn.disabled = true;
    selectors.heroScanBtn.disabled = true;
    selectors.fileInput.value = "";
    selectors.heroFileInput.value = "";
    setFileLabels("File vượt 80MB", "Hãy nén PDF hoặc chia file để phân tích");
    showToast("File vượt 80MB. Hãy nén PDF hoặc chia thành từng phần nhỏ hơn.");
    return;
  }
  setFileLabels(file.name, formatBytes(file.size));
}

function scrollToFinding(id) {
  const highlight = document.querySelector(`#hl-${CSS.escape(id)}`);
  if (!highlight) {
    showToast("Thẻ này không có đoạn highlight trực tiếp");
    return;
  }
  highlight.scrollIntoView({ behavior: "smooth", block: "center" });
  highlight.animate(
    [
      { outline: "0 solid transparent" },
      { outline: "4px solid rgba(15, 118, 110, 0.28)" },
      { outline: "0 solid transparent" },
    ],
    { duration: 900 }
  );
}

function bindEvents() {
  selectors.homeBtn.addEventListener("click", showIntro);
  selectors.heroFileInput.addEventListener("change", (event) => {
    setPendingFile(event.target.files[0]);
  });

  selectors.fileInput.addEventListener("change", (event) => {
    setPendingFile(event.target.files[0]);
  });

  selectors.heroScanBtn.addEventListener("click", analyzePendingFile);
  selectors.scanBtn.addEventListener("click", analyzePendingFile);
  selectors.sampleBtn.addEventListener("click", analyzeSample);
  selectors.heroSampleBtn.addEventListener("click", analyzeSample);
  selectors.exportBtn.addEventListener("click", () => window.print());
  selectors.chatLauncher.addEventListener("click", () => {
    if (state.chatOpen) {
      closeChat();
    } else {
      openChat();
    }
  });
  selectors.chatCloseBtn.addEventListener("click", closeChat);

  document.querySelectorAll(".switch-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".switch-btn").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      state.contractType = button.dataset.contractType;
    });
  });

  document.querySelectorAll(".risk-pill").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".risk-pill").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      state.activeFilter = button.dataset.filter;
      renderFindings();
    });
  });

  bindDropzone(selectors.dropzone);
  bindDropzone(selectors.heroDropzone);

  selectors.pasteBtn.addEventListener("click", () => {
    selectors.pasteDialog.showModal();
    selectors.pasteText.focus();
  });
  selectors.heroPasteBtn.addEventListener("click", () => {
    selectors.pasteDialog.showModal();
    selectors.pasteText.focus();
  });

  selectors.pasteForm.addEventListener("submit", (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const text = selectors.pasteText.value.trim();
    if (!text) {
      showToast("Chưa có nội dung để phân tích");
      return;
    }
    selectors.pasteDialog.close();
    analyzePastedText(text);
  });

  selectors.findingsList.addEventListener("click", async (event) => {
    const jump = event.target.closest(".jump-btn");
    const copy = event.target.closest(".copy-btn");

    if (jump) {
      scrollToFinding(jump.dataset.findingId);
    }

    if (copy) {
      const text = copy.dataset.copy;
      await navigator.clipboard.writeText(text);
      showToast("Đã copy câu sửa");
    }
  });

  selectors.chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    askChatbot(selectors.chatInput.value);
  });

  selectors.reportChat.addEventListener("click", async (event) => {
    const copyBtn = event.target.closest(".chat-copy-mini-btn");
    const prompt = event.target.closest("[data-chat-prompt]");
    const source = event.target.closest("[data-chat-finding-id]");

    if (copyBtn) {
      event.stopPropagation();
      const text = copyBtn.dataset.copy;
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied!";
      setTimeout(() => copyBtn.textContent = "Copy", 1500);
      showToast("Đã copy câu sửa");
      return;
    }

    if (prompt) {
      event.stopPropagation();
      askChatbot(prompt.dataset.chatPrompt);
      return;
    }

    if (source) {
      event.stopPropagation();
      const findingId = source.dataset.chatFindingId;
      const card = document.querySelector(`.finding-card[data-finding-id="${CSS.escape(findingId)}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.animate(
          [
            { boxShadow: "0 0 0 rgba(15, 118, 110, 0)" },
            { boxShadow: "0 0 0 4px rgba(15, 118, 110, 0.2)" },
            { boxShadow: "0 0 0 rgba(15, 118, 110, 0)" },
          ],
          { duration: 900 }
        );
      } else {
        scrollToFinding(findingId);
      }
    }
  });

  selectors.reportView.addEventListener("click", (event) => {
    if (event.target.closest("#reportChat")) return;
    const prompt = event.target.closest("[data-chat-prompt]");
    if (!prompt) return;
    askChatbot(prompt.dataset.chatPrompt);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.chatOpen) closeChat();
  });

  selectors.deepInsights.addEventListener("click", (event) => {
    const action = event.target.closest(".priority-action");
    const seeMoreBtn = event.target.closest(".metric-see-more-btn");
    const jumpBtn = event.target.closest(".metric-popover-jump");

    if (seeMoreBtn) {
      const targetId = seeMoreBtn.dataset.popoverTarget;
      const popover = selectors.deepInsights.querySelector(`#${CSS.escape(targetId)}`);
      if (!popover) return;
      const isOpen = !popover.hidden;
      // Close all metric popovers first
      selectors.deepInsights.querySelectorAll(".metric-popover").forEach((p) => {
        p.hidden = true;
        p.classList.remove("is-open");
      });
      selectors.deepInsights.querySelectorAll(".metric-see-more-btn").forEach((b) => {
        b.setAttribute("aria-expanded", "false");
        b.classList.remove("is-active");
      });
      // Toggle the clicked one
      if (!isOpen) {
        popover.hidden = false;
        requestAnimationFrame(() => popover.classList.add("is-open"));
        seeMoreBtn.setAttribute("aria-expanded", "true");
        seeMoreBtn.classList.add("is-active");
      }
      return;
    }

    if (jumpBtn) {
      const quoteText = jumpBtn.dataset.metricJump;
      const findingId = jumpBtn.dataset.metricFinding;

      // Switch to viewer tab first
      const viewerTab = document.querySelector(".tab-btn[data-tab=\"viewer\"]");

      if (quoteText) {
        // Find the paragraph in the document viewer that contains this quote
        const viewer = selectors.documentViewer;
        const paragraphs = viewer ? viewer.querySelectorAll(".doc-paragraph") : [];
        let found = null;
        const normalizedQuote = quoteText.trim().slice(0, 60); // match first 60 chars
        for (const para of paragraphs) {
          if (para.textContent.includes(normalizedQuote)) {
            found = para;
            break;
          }
        }
        if (found) {
          if (viewerTab) viewerTab.click();
          setTimeout(() => {
            found.scrollIntoView({ behavior: "smooth", block: "center" });
            found.classList.add("metric-highlight-flash");
            setTimeout(() => found.classList.remove("metric-highlight-flash"), 1800);
          }, 150);
          showToast("Đã chuyển đến đoạn hợp đồng liên quan");
          return;
        }
      }

      // Fallback: scroll to the finding card
      if (findingId) {
        if (viewerTab) viewerTab.click();
        setTimeout(() => scrollToFinding(findingId), 150);
        showToast("Đã chuyển đến điều khoản liên quan");
        return;
      }

      showToast("Không tìm thấy đoạn hợp đồng tương ứng");
      return;
    }


    if (action && state.analysis?.deepAnalysis?.priorityActions) {
      const item = state.analysis.deepAnalysis.priorityActions[Number(action.dataset.priorityIndex)];
      const finding = sortedFindings().find((candidate) => candidate.muc_ra_soat === item.title);
      if (finding?.id) scrollToFinding(finding.id);
      return;
    }

    // Close popovers when clicking elsewhere in deepInsights
    if (!event.target.closest(".metric-popover")) {
      selectors.deepInsights.querySelectorAll(".metric-popover").forEach((p) => {
        p.hidden = true;
        p.classList.remove("is-open");
      });
      selectors.deepInsights.querySelectorAll(".metric-see-more-btn").forEach((b) => {
        b.setAttribute("aria-expanded", "false");
        b.classList.remove("is-active");
      });
    }
  });

  selectors.documentViewer.addEventListener("click", (event) => {
    const mark = event.target.closest(".risk-mark");
    if (!mark) return;
    const card = document.querySelector(`.finding-card[data-finding-id="${CSS.escape(mark.dataset.findingId)}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function bindDropzone(dropzone) {
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("is-dragover");
  });

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragover");
    setPendingFile(event.dataTransfer.files[0]);
  });
}

// Ambient particles animation loop for world-class landing page
function initParticles() {
  pCanvas = document.getElementById("ambientParticles");
  if (!pCanvas) return;
  pCtx = pCanvas.getContext("2d");
  
  const resizeCanvas = () => {
    if (pCanvas) {
      pCanvas.width = pCanvas.parentElement.offsetWidth;
      pCanvas.height = pCanvas.parentElement.offsetHeight;
    }
  };
  
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  
  pParticles = [];
  for (let i = 0; i < 40; i++) {
    pParticles.push({
      x: Math.random() * pCanvas.width,
      y: Math.random() * pCanvas.height,
      radius: Math.random() * 2 + 1,
      speedY: -(Math.random() * 0.4 + 0.15),
      speedX: (Math.random() * 0.4 - 0.2),
      alpha: Math.random() * 0.5 + 0.15,
      color: Math.random() > 0.4 ? "200, 155, 39" : "139, 28, 28" // Gold or Red
    });
  }
  
  const runParticleLoop = () => {
    if (!pCanvas || state.activeView !== "intro") return;
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    
    pParticles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y < 0) {
        p.y = pCanvas.height;
        p.x = Math.random() * pCanvas.width;
      }
      if (p.x < 0 || p.x > pCanvas.width) {
        p.x = Math.random() * pCanvas.width;
      }
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      pCtx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
      pCtx.fill();
    });
    
    pAnimFrameId = requestAnimationFrame(runParticleLoop);
  };
  
  runParticleLoop();
}

function stopParticles() {
  if (pAnimFrameId) {
    cancelAnimationFrame(pAnimFrameId);
  }
}

bindEvents();
showIntro();
