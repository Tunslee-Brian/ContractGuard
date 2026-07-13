/**
 * app.js
 * Client-side script for ContractGuard Premium Static Web Report.
 * Manages TOC generation, ScrollSpy, Reading Progress, Scroll Reveal, and Lightbox modal.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const reportContent = document.getElementById("reportContent");
  const tocContainer = document.getElementById("tocContainer");
  const progressBar = document.getElementById("progressBar");
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const topbar = document.querySelector(".topbar");
  
  const lightboxModal = document.getElementById("lightboxModal");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");

  // 1. Generate TOC dynamically
  const sections = document.querySelectorAll(".report-section");
  const tocList = document.createElement("ul");
  tocList.className = "toc-list";

  let currentMainLi = null;
  let currentSubUl = null;

  sections.forEach((sec, idx) => {
    const h1 = sec.querySelector("h1");
    const h2s = sec.querySelectorAll("h2");

    if (h1) {
      // It's a main section (Part)
      const h1Text = h1.textContent.trim();
      
      // Ensure section has a good ID
      sec.id = `section-${idx}`;

      const li = document.createElement("li");
      li.className = "toc-item-h1";
      li.dataset.sectionId = sec.id;

      const a = document.createElement("a");
      a.href = `#${sec.id}`;
      a.textContent = h1Text;
      li.appendChild(a);
      tocList.appendChild(li);

      currentMainLi = li;

      // Handle sub-headings
      if (h2s.length > 0) {
        currentSubUl = document.createElement("ul");
        currentSubUl.className = "toc-sublist";
        currentMainLi.appendChild(currentSubUl);

        h2s.forEach((h2, subIdx) => {
          const h2Text = h2.textContent.trim();
          const subId = `section-${idx}-sub-${subIdx}`;
          h2.id = subId;

          const subLi = document.createElement("li");
          subLi.className = "toc-item-h2";
          subLi.dataset.sectionId = subId;

          const subA = document.createElement("a");
          subA.href = `#${subId}`;
          subA.textContent = h2Text;
          subA.title = h2Text; // tooltip for long text
          subLi.appendChild(subA);
          currentSubUl.appendChild(subLi);
        });
      } else {
        currentSubUl = null;
      }
    } else if (idx === 0) {
      // Cover page or initial content
      sec.id = "section-0";
      const li = document.createElement("li");
      li.className = "toc-item-h1";
      li.dataset.sectionId = sec.id;

      const a = document.createElement("a");
      a.href = `#${sec.id}`;
      a.textContent = "TRANG BÌA";
      li.appendChild(a);
      tocList.appendChild(li);
    }
  });

  tocContainer.appendChild(tocList);

  // Smooth scroll event listeners for TOC links
  const tocLinks = tocContainer.querySelectorAll("a");
  tocLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Close sidebar on mobile
        sidebar.classList.remove("open");
        topbar.classList.remove("menu-open");

        // Scroll to element
        targetElement.scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });

  // Helper to highlight active TOC item and scroll it into view inside the sidebar
  function highlightTOCItem(id) {
    tocContainer.querySelectorAll("li").forEach(li => {
      li.classList.remove("active");
    });

    const activeLi = tocContainer.querySelector(`li[data-section-id="${id}"]`);
    if (activeLi) {
      activeLi.classList.add("active");
      
      // Auto-scroll the sidebar to keep activeLi centered in view
      const sidebarEl = document.querySelector(".sidebar");
      if (sidebarEl) {
        const activeLiRect = activeLi.getBoundingClientRect();
        const sidebarRect = sidebarEl.getBoundingClientRect();
        
        if (activeLiRect.top < sidebarRect.top || activeLiRect.bottom > sidebarRect.bottom) {
          const targetScrollTop = sidebarEl.scrollTop + (activeLiRect.top - sidebarRect.top) - (sidebarRect.height / 2) + (activeLiRect.height / 2);
          sidebarEl.scrollTo({
            top: targetScrollTop,
            behavior: "smooth"
          });
        }
      }
      
      const parentMain = activeLi.closest(".toc-item-h1");
      if (parentMain && parentMain !== activeLi) {
        parentMain.classList.add("active");
      }
    }
  }

  // Populate ScrollSpy targets
  const spyElements = [];
  sections.forEach(sec => {
    spyElements.push(sec);
    const h2s = sec.querySelectorAll("h2");
    h2s.forEach(h2 => spyElements.push(h2));
  });

  // 2. Reading Progress Bar & ScrollSpy bottom detector
  window.addEventListener("scroll", () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      const scrolled = (window.scrollY / docHeight) * 100;
      progressBar.style.width = `${scrolled}%`;
    }

    // ScrollSpy bottom fallback: when at the very bottom, force highlight the last item
    const isAtBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 50;
    if (isAtBottom && spyElements.length > 0) {
      const lastEl = spyElements[spyElements.length - 1];
      if (lastEl) {
        highlightTOCItem(lastEl.id);
      }
    }
  });

  // 3. ScrollSpy using IntersectionObserver
  const spyOptions = {
    root: null,
    rootMargin: "-20% 0px -60% 0px", // triggers when element is roughly in middle of viewport
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const isAtBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 50;
      if (entry.isIntersecting && !isAtBottom) {
        highlightTOCItem(entry.target.id);
      }
    });
  }, spyOptions);

  spyElements.forEach(el => observer.observe(el));

  // 4. Scroll Reveal Animation
  // Dynamically add '.reveal' class to block elements
  const revealElements = reportContent.querySelectorAll("p, table, ul, ol, h2, h3, img, blockquote");
  revealElements.forEach(el => {
    // Check if it's already in the cover section; if so, animate immediately or skip
    if (el.closest(".cover-section")) {
      el.classList.add("reveal", "visible");
    } else {
      el.classList.add("reveal");
    }
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target); // only reveal once
      }
    });
  }, {
    root: null,
    rootMargin: "0px 0px -100px 0px", // trigger slightly before entering viewport
    threshold: 0.05
  });

  const elementsToReveal = reportContent.querySelectorAll(".reveal:not(.visible)");
  elementsToReveal.forEach(el => revealObserver.observe(el));

  // 5. Image Lightbox Zoom
  const images = reportContent.querySelectorAll("img:not(.gallery-thumb-btn img)");
  images.forEach(img => {
    img.addEventListener("click", () => {
      // Find the following caption if exists (usually an 'em' tag directly following the image or paragraph)
      let captionText = img.alt || "Giao diện ContractGuard";
      
      // Look for custom text underneath
      let nextEl = img.nextElementSibling;
      if (nextEl && nextEl.tagName === "EM") {
        captionText = nextEl.textContent;
      } else {
        // Sometimes compiled markdown wraps em inside a paragraph
        const parent = img.parentElement;
        if (parent && parent.nextElementSibling && parent.nextElementSibling.querySelector("em")) {
          captionText = parent.nextElementSibling.querySelector("em").textContent;
        }
      }

      lightboxImage.src = img.src;
      lightboxCaption.textContent = captionText;
      lightboxModal.classList.add("open");
    });
  });

  // Lightbox Close Events
  const closeLightbox = () => {
    lightboxModal.classList.remove("open");
  };

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxModal.addEventListener("click", (e) => {
    if (e.target === lightboxModal) {
      closeLightbox();
    }
  });

  // ESC key to close lightbox
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightboxModal.classList.contains("open")) {
      closeLightbox();
    }
  });

  // 6. Mobile Navigation Drawer
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    topbar.classList.toggle("menu-open");
  });

  // Close menu when clicking outside sidebar on mobile
  document.addEventListener("click", (e) => {
    if (sidebar.classList.contains("open")) {
      const isClickInside = sidebar.contains(e.target) || menuToggle.contains(e.target);
      if (!isClickInside) {
        sidebar.classList.remove("open");
        topbar.classList.remove("menu-open");
      }
    }
  });

  // --- In-Page Search Feature ---
  const searchContainer = document.getElementById("searchContainer");
  const searchToggleBtn = document.getElementById("searchToggleBtn");
  const searchInput = document.getElementById("searchInput");
  const searchResultsCount = document.getElementById("searchResultsCount");
  const searchPrevBtn = document.getElementById("searchPrevBtn");
  const searchNextBtn = document.getElementById("searchNextBtn");
  const searchCloseBtn = document.getElementById("searchCloseBtn");

  let searchMatches = [];
  let currentSearchIndex = -1;

  searchToggleBtn.addEventListener("click", () => {
    searchContainer.classList.add("active");
    searchInput.focus();
  });

  const closeSearch = () => {
    searchContainer.classList.remove("active");
    clearSearchHighlight();
    searchInput.value = "";
    searchResultsCount.textContent = "0/0";
    searchMatches = [];
    currentSearchIndex = -1;
    updateNavButtons();
  };

  searchCloseBtn.addEventListener("click", closeSearch);

  // Close search on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchContainer.classList.contains("active")) {
      closeSearch();
    }
  });

  // Close search when clicking outside search container
  document.addEventListener("click", (e) => {
    if (searchContainer.classList.contains("active")) {
      const isClickInside = searchContainer.contains(e.target);
      if (!isClickInside) {
        closeSearch();
      }
    }
  });

  searchInput.addEventListener("input", () => {
    performSearch(searchInput.value.trim());
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchMatches.length > 0) {
        if (e.shiftKey) {
          navigateSearch(-1);
        } else {
          navigateSearch(1);
        }
      }
    }
  });

  searchPrevBtn.addEventListener("click", () => navigateSearch(-1));
  searchNextBtn.addEventListener("click", () => navigateSearch(1));

  function updateNavButtons() {
    searchPrevBtn.disabled = searchMatches.length <= 1;
    searchNextBtn.disabled = searchMatches.length <= 1;
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightTextNodes(element, query) {
    const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
    
    function walk(node) {
      if (node.nodeType === 3) { // Text node
        const text = node.nodeValue;
        if (regex.test(text)) {
          const parent = node.parentNode;
          if (parent) {
            const fragment = document.createDocumentFragment();
            const parts = text.split(regex);
            parts.forEach(part => {
              if (regex.test(part)) {
                const mark = document.createElement("mark");
                mark.className = "search-highlight";
                mark.textContent = part;
                fragment.appendChild(mark);
              } else if (part) {
                fragment.appendChild(document.createTextNode(part));
              }
            });
            parent.replaceChild(fragment, node);
          }
        }
      } else if (node.nodeType === 1 && node.childNodes && !["SCRIPT", "STYLE", "IFRAME", "NOSCRIPT", "MARK"].includes(node.tagName.toUpperCase())) {
        const children = Array.from(node.childNodes);
        children.forEach(child => walk(child));
      }
    }
    
    walk(element);
  }

  function clearSearchHighlight() {
    const highlights = reportContent.querySelectorAll("mark.search-highlight");
    highlights.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
      }
    });
    reportContent.normalize();
  }

  function performSearch(query) {
    clearSearchHighlight();
    searchMatches = [];
    currentSearchIndex = -1;
    
    if (!query || query.length < 2) {
      searchResultsCount.textContent = "0/0";
      updateNavButtons();
      return;
    }
    
    highlightTextNodes(reportContent, query);
    searchMatches = Array.from(reportContent.querySelectorAll("mark.search-highlight"));
    
    if (searchMatches.length > 0) {
      currentSearchIndex = 0;
      searchMatches[currentSearchIndex].classList.add("search-current");
      searchResultsCount.textContent = `1/${searchMatches.length}`;
      searchMatches[currentSearchIndex].scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      searchResultsCount.textContent = "0/0";
    }
    updateNavButtons();
  }

  function navigateSearch(direction) {
    if (searchMatches.length === 0) return;
    
    searchMatches[currentSearchIndex].classList.remove("search-current");
    
    currentSearchIndex = (currentSearchIndex + direction + searchMatches.length) % searchMatches.length;
    
    searchMatches[currentSearchIndex].classList.add("search-current");
    searchResultsCount.textContent = `${currentSearchIndex + 1}/${searchMatches.length}`;
    searchMatches[currentSearchIndex].scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ==========================================================================
  // LOGIC ĐIỀU KHIỂN CÁC WIDGET TƯƠNG TÁC BÁO CÁO (CONTRACTGUARD PREMIUM REPORT)
  // ==========================================================================

  // 1. Interactive Persona Switcher
  const personaTabBtns = document.querySelectorAll(".persona-tab-btn");
  const personaCards = document.querySelectorAll(".persona-card");

  personaTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Remove active classes
      personaTabBtns.forEach(b => b.classList.remove("active"));
      personaCards.forEach(c => c.classList.remove("active"));

      // Add active classes
      btn.classList.add("active");
      const targetId = btn.dataset.personaId;
      const targetCard = document.getElementById(targetId);
      if (targetCard) {
        targetCard.classList.add("active");
      }
    });
  });

  // 2. Interactive Charts (Trigger animation on scroll)
  const barFillElements = document.querySelectorAll(".bar-fill-dynamic");
  const chartContainer = document.querySelector(".survey-charts-container");

  if (chartContainer) {
    const chartObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Trigger width drawing
          barFillElements.forEach(fill => {
            const percent = fill.dataset.percent || "0";
            fill.style.width = percent + "%";
          });
          chartObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    chartObserver.observe(chartContainer);
  }

  // Interactive Chart Tooltips / Legend Click highlighting
  const pieSectors = document.querySelectorAll(".pie-sector-ring");
  const pieLegendItems = document.querySelectorAll(".pie-legend-item");

  function highlightPieSection(idx) {
    pieSectors.forEach((s, sIdx) => {
      if (sIdx === idx) {
        s.setAttribute("stroke-width", "28");
        s.style.opacity = "1";
      } else {
        s.setAttribute("stroke-width", "24");
        s.style.opacity = "0.7";
      }
    });
    
    pieLegendItems.forEach((l, lIdx) => {
      if (lIdx === idx) {
        l.style.background = "var(--brand-green-light)";
        l.style.fontWeight = "bold";
      } else {
        l.style.background = "transparent";
        l.style.fontWeight = "normal";
      }
    });
  }

  pieSectors.forEach((sector, idx) => {
    sector.addEventListener("mouseenter", () => highlightPieSection(idx));
    sector.addEventListener("mouseleave", () => {
      pieSectors.forEach(s => {
        s.setAttribute("stroke-width", "24");
        s.style.opacity = "1";
      });
      pieLegendItems.forEach(l => {
        l.style.background = "transparent";
        l.style.fontWeight = "normal";
      });
    });
  });

  pieLegendItems.forEach((item, idx) => {
    item.addEventListener("mouseenter", () => highlightPieSection(idx));
    item.addEventListener("mouseleave", () => {
      pieSectors.forEach(s => {
        s.setAttribute("stroke-width", "24");
        s.style.opacity = "1";
      });
      pieLegendItems.forEach(l => {
        l.style.background = "transparent";
        l.style.fontWeight = "normal";
      });
    });
  });

  // 3. Live Contractguard Simulator Logic
  const simOptBtns = document.querySelectorAll(".sim-opt-btn");
  const contractDocPanel = document.getElementById("simDocPanel");
  const actionCardsPanel = document.getElementById("simCardsPanel");

  // Mock Database of Contract Simulation
  const simulationDatabase = {
    rent: {
      title: "HỢP ĐỒNG THUÊ NHÀ (TRÍCH ĐOẠN)",
      paragraphs: [
        { text: "BÊN A: Ông Nguyễn Văn A (Bên cho thuê)<br>BÊN B: Bà Trần Thị B (Bên thuê)" },
        { text: "Hai bên thống nhất ký kết hợp đồng thuê căn hộ số 402 tại địa chỉ X với các thỏa thuận sau:" },
        { text: "<strong>Điều 1: Đặt cọc bảo đảm</strong><br>Để bảo đảm thực hiện hợp đồng, Bên B đặt cọc cho Bên A số tiền <span class='sim-highlight-trigger risk-yellow' data-risk-id='rent-c1'>15.000.000 VNĐ (tương đương 03 tháng tiền thuê nhà)</span> ngay sau khi ký hợp đồng này." },
        { text: "<strong>Điều 2: Hoàn trả tiền cọc</strong><br>Tiền đặt cọc sẽ được Bên A hoàn trả lại cho Bên B khi kết thúc hợp đồng và bàn giao lại nhà, <span class='sim-highlight-trigger risk-yellow' data-risk-id='rent-c2'>sau khi trừ các khoản chi phí bồi thường thiệt hại (nếu có)</span>." },
        { text: "<strong>Điều 3: Đơn phương chấm dứt hợp đồng</strong><br>Trường hợp Bên B đơn phương chấm dứt hợp đồng trước thời hạn, <span class='sim-highlight-trigger risk-red' data-risk-id='rent-c3'>Bên B sẽ mất toàn bộ số tiền đặt cọc và phải bồi thường thêm cho Bên A 02 tháng tiền thuê nhà</span>." },
        { text: "<strong>Điều 4: Phí dịch vụ và điện nước</strong><br>Bên B có nghĩa vụ thanh toán tiền điện, tiền nước hàng tháng theo <span class='sim-highlight-trigger risk-yellow' data-risk-id='rent-c4'>biểu phí dịch vụ do Ban quản lý tòa nhà quy định tại từng thời điểm</span>." }
      ],
      cards: [
        {
          id: "rent-c1",
          level: "risk-yellow",
          levelText: "Vàng - Điều khoản cần làm rõ",
          title: "Tiền đặt cọc quá cao",
          original: "“15.000.000 VNĐ (tương đương 03 tháng tiền thuê nhà)”",
          explain: "Mức cọc thông thường trên thị trường là 1-2 tháng. Yêu cầu đặt cọc 03 tháng làm ứ đọng vốn của người thuê và tăng nguy cơ tranh chấp, khó đòi lại tiền cọc khi chấm dứt hợp đồng.",
          suggest: "“Bên B đặt cọc cho Bên A số tiền 5.000.000 VNĐ (tương đương 01 tháng tiền thuê nhà) ngay sau khi ký hợp đồng...”",
          action: "Đàm phán giảm mức cọc xuống còn 1 hoặc tối đa 2 tháng tiền thuê nhà.",
          law: "Điều 328 Bộ luật Dân sự 2015"
        },
        {
          id: "rent-c2",
          level: "risk-yellow",
          levelText: "Vàng - Mơ hồ / Rủi ro tranh chấp",
          title: "Thiếu thời hạn và căn cứ khấu trừ cọc",
          original: "“sau khi trừ các khoản chi phí bồi thường thiệt hại (nếu có)”",
          explain: "Không quy định rõ thời hạn bên cho thuê phải hoàn cọc (ví dụ: trong vòng 5 ngày) và cách xác định giá trị thiệt hại. Bên cho thuê có thể kéo dài thời gian hoàn trả hoặc tự áp đặt chi phí bồi thường vô lý.",
          suggest: "“Tiền đặt cọc sẽ được Bên A hoàn trả cho Bên B trong vòng 05 ngày làm việc kể từ ngày bàn giao lại nhà, sau khi trừ đi các chi phí hao mòn hỏng hóc được hai bên thống nhất bằng văn bản...”",
          action: "Yêu cầu bổ sung thời hạn hoàn trả cọc (3-5 ngày) và quy định chi phí khấu trừ phải dựa trên hóa đơn thực tế và có biên bản xác nhận của hai bên.",
          law: "Điều 328 Bộ luật Dân sự 2015"
        },
        {
          id: "rent-c3",
          level: "risk-red",
          levelText: "Đỏ - Vi phạm nặng / Quá bất lợi",
          title: "Bất lợi kép khi chấm dứt trước hạn",
          original: "“Bên B sẽ mất toàn bộ số tiền đặt cọc và phải bồi thường thêm cho Bên A 02 tháng tiền thuê nhà”",
          explain: "Vừa tịch thu cọc vừa phạt thêm 2 tháng tiền nhà là hình phạt chồng chéo quá nặng đối với bên thuê. Theo thông lệ, chỉ phạt mất cọc HOẶC phạt vi phạm tương đương 1 tháng tiền thuê nhà.",
          suggest: "“Trường hợp Bên B muốn chấm dứt hợp đồng trước hạn thì phải thông báo trước cho Bên A tối thiểu 30 ngày. Bên B sẽ chịu phạt số tiền tương đương với số tiền đặt cọc và không phải bồi thường thêm bất kỳ khoản phí nào khác.”",
          action: "Thương lượng bỏ điều khoản bồi thường thêm 2 tháng tiền nhà, chỉ chịu mất cọc nếu chấm dứt hợp đồng trước hạn mà không báo trước đúng luật.",
          law: "Điều 418, 428 Bộ luật Dân sự 2015"
        },
        {
          id: "rent-c4",
          level: "risk-yellow",
          levelText: "Vàng - Rủi ro phát sinh phí ẩn",
          title: "Tự ý áp đặt giá điện nước",
          original: "“biểu phí dịch vụ do Ban quản lý tòa nhà quy định tại từng thời điểm”",
          explain: "Cụm từ 'quy định tại từng thời điểm' cho phép bên cho thuê hoặc ban quản lý tùy ý nâng giá điện nước mà người thuê không có quyền can thiệp.",
          suggest: "“Bên B có nghĩa vụ thanh toán tiền điện, tiền nước hàng tháng theo chỉ số tiêu thụ thực tế trên đồng hồ đo riêng, căn cứ theo biểu giá điện nước do nhà nước quy định hoặc đơn giá cố định cụ thể được ghi rõ...”",
          action: "Yêu cầu ghi rõ đơn giá điện nước cụ thể trong hợp đồng hoặc ghi nhận thanh toán đúng theo giá nhà nước niêm yết công khai.",
          law: "Nghị định quy định về giá bán lẻ điện và dịch vụ công ích"
        }
      ]
    },
    job: {
      title: "HỢP ĐỒNG LAO ĐỘNG (TRÍCH ĐOẠN)",
      paragraphs: [
        { text: "BÊN A: Công ty Cổ phần Công nghệ TechX (Bên sử dụng lao động)<br>BÊN B: Ông Trần Văn C (Người lao động)" },
        { text: "Hai bên đồng ý ký kết hợp đồng lao động này với các điều khoản cụ thể như sau:" },
        { text: "<strong>Điều 1: Vị trí và Thử việc</strong><br>Người lao động cam kết thực hiện thời gian <span class='sim-highlight-trigger risk-yellow' data-risk-id='job-c1'>thử việc tại vị trí Lập trình viên là 90 ngày kể từ ngày nhận việc</span>, hưởng 85% lương chính thức." },
        { text: "<strong>Điều 2: Thời giờ làm việc và Làm thêm giờ</strong><br>Trong trường hợp yêu cầu công việc phát sinh, Người lao động đồng ý làm thêm giờ theo yêu cầu của Công ty và <span class='sim-highlight-trigger risk-red' data-risk-id='job-c2'>chấp nhận đây là trách nhiệm công việc mà không yêu cầu tính thêm phụ cấp làm ngoài giờ</span>." },
        { text: "<strong>Điều 3: Ràng buộc sau khi chấm dứt hợp đồng</strong><br>Nếu chấm dứt hợp đồng lao động, Người lao động cam kết <span class='sim-highlight-trigger risk-red' data-risk-id='job-c3'>không được làm việc cho bất kỳ đối thủ cạnh tranh nào trong ngành công nghệ tại Việt Nam trong vòng 02 năm và chịu phạt vi phạm 100.000.000 VNĐ nếu vi phạm</span>." }
      ],
      cards: [
        {
          id: "job-c1",
          level: "risk-yellow",
          levelText: "Vàng - Vi phạm luật thời gian thử việc",
          title: "Thời gian thử việc vượt quá luật định",
          original: "“thử việc tại vị trí Lập trình viên là 90 ngày kể từ ngày nhận việc”",
          explain: "Theo Bộ luật Lao động Việt Nam, vị trí công việc yêu cầu trình độ chuyên môn kỹ thuật từ cao đẳng trở lên (như lập trình viên) chỉ được phép thử việc tối đa 60 ngày. Quy định 90 ngày là vi phạm luật lao động.",
          suggest: "“Thời gian thử việc là 60 ngày kể từ ngày nhận việc...”",
          action: "Yêu cầu bên sử dụng lao động điều chỉnh thời gian thử việc về đúng tối đa 60 ngày theo luật định.",
          law: "Điều 25 Bộ luật Lao động 2019"
        },
        {
          id: "job-c2",
          level: "risk-red",
          levelText: "Đỏ - Vi phạm nghiêm trọng pháp luật lao động",
          title: "Ép buộc làm thêm giờ không trả lương",
          original: "“không yêu cầu tính thêm phụ cấp làm ngoài giờ”",
          explain: "Vi phạm nghiêm trọng quy định pháp luật lao động. Người lao động làm thêm giờ vào ngày thường phải được trả tối thiểu bằng 150%, ngày nghỉ hàng tuần bằng 200%, ngày lễ bằng 300% đơn giá tiền lương.",
          suggest: "“Thời giờ làm thêm của Người lao động được tính tiền lương làm thêm giờ theo đúng quy định của pháp luật lao động hiện hành.”",
          action: "Yêu cầu loại bỏ điều khoản ép làm ngoài giờ không lương này và cam kết tính phụ cấp tăng ca theo đúng quy định pháp luật lao động.",
          law: "Điều 98 Bộ luật Lao động 2019"
        },
        {
          id: "job-c3",
          level: "risk-red",
          levelText: "Đỏ - Hạn chế tự do việc làm & Phạt quá mức",
          title: "Cấm làm cho đối thủ & mức phạt vô lý",
          original: "“không được làm việc cho bất kỳ đối thủ cạnh tranh nào... và chịu phạt vi phạm 100.000.000 VNĐ”",
          explain: "Điều khoản cấm làm cho đối thủ cạnh tranh sau nghỉ việc vi phạm Hiến pháp về quyền tự do lựa chọn nghề nghiệp của người dân. Đồng thời, mức phạt vi phạm 100 triệu áp đặt lên người lao động nghỉ việc là bất hợp pháp, do luật lao động chỉ cho phép bồi thường chi phí đào tạo hoặc vi phạm thời hạn báo trước.",
          suggest: "Bỏ hẳn điều khoản hạn chế cạnh tranh. Chỉ giữ lại điều khoản bảo mật bí mật kinh doanh công nghệ mà không cấm người lao động đi làm tại công ty khác.",
          action: "Yêu cầu loại bỏ toàn bộ điều khoản cấm làm việc cho đối thủ cạnh tranh và khoản phạt vi phạm này.",
          law: "Điều 35 Hiến pháp 2013, Điều 40 Bộ luật Lao động 2019"
        }
      ]
    }
  };

  function loadSimulationContract(type) {
    const data = simulationDatabase[type];
    if (!data) return;

    // Load Document panel
    contractDocPanel.innerHTML = `<h3>${data.title}</h3>`;
    data.paragraphs.forEach(p => {
      const pEl = document.createElement("p");
      pEl.className = "sim-paragraph";
      pEl.innerHTML = p.text;
      contractDocPanel.appendChild(pEl);
    });

    // Load Action Cards panel
    actionCardsPanel.innerHTML = "";
    data.cards.forEach(card => {
      const cardEl = document.createElement("div");
      cardEl.className = `action-card-interactive ${card.level}`;
      cardEl.id = `card-${card.id}`;
      cardEl.dataset.targetId = card.id;

      cardEl.innerHTML = `
        <div class="ac-badge-row">
          <span class="ac-risk-pill">${card.levelText}</span>
          <span class="ac-ref-law">${card.law}</span>
        </div>
        <div class="ac-text-content" style="font-weight: 700; font-size: 14px; color: var(--brand-green);">${card.title}</div>
        <div>
          <span class="ac-section-title">Điều khoản gốc</span>
          <div class="ac-text-content original">${card.original}</div>
        </div>
        <div>
          <span class="ac-section-title">Giải thích bình dân</span>
          <div class="ac-text-content">${card.explain}</div>
        </div>
        <div>
          <span class="ac-section-title">Nên yêu cầu sửa thành</span>
          <div class="ac-text-content suggested">${card.suggest}</div>
        </div>
        <div>
          <span class="ac-section-title">Hành động cần làm</span>
          <div class="ac-text-content" style="font-weight:600; color:var(--brand-gold-dark);">${card.action}</div>
        </div>
        <div class="ac-action-footer">
          <button class="ac-copy-btn" data-copy-text="${card.suggest}">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Sao chép câu sửa
          </button>
        </div>
      `;
      actionCardsPanel.appendChild(cardEl);
    });

    // Rebind Events
    bindSimulationEvents();
  }

  function bindSimulationEvents() {
    const highlights = contractDocPanel.querySelectorAll(".sim-highlight-trigger");
    const cards = actionCardsPanel.querySelectorAll(".action-card-interactive");

    // Click on highlight -> scroll and highlight card
    highlights.forEach(hl => {
      hl.addEventListener("click", () => {
        const riskId = hl.dataset.riskId;
        const targetCard = document.getElementById(`card-${riskId}`);

        // De-select old ones
        highlights.forEach(h => h.classList.remove("selected"));
        cards.forEach(c => c.classList.remove("active-card"));

        // Highlight this trigger
        hl.classList.add("selected");

        if (targetCard) {
          targetCard.classList.add("active-card");
          targetCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    });

    // Click on card -> highlight trigger in text
    cards.forEach(card => {
      card.addEventListener("click", (e) => {
        // Skip card click if copy button is clicked
        if (e.target.closest(".ac-copy-btn")) return;

        const targetId = card.dataset.targetId;
        const triggerEl = contractDocPanel.querySelector(`.sim-highlight-trigger[data-risk-id="${targetId}"]`);

        // De-select old ones
        highlights.forEach(h => h.classList.remove("selected"));
        cards.forEach(c => c.classList.remove("active-card"));

        // Highlight card
        card.classList.add("active-card");

        if (triggerEl) {
          triggerEl.classList.add("selected");
          triggerEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });

    // Copy Button interaction
    const copyBtns = actionCardsPanel.querySelectorAll(".ac-copy-btn");
    copyBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const text = btn.dataset.copyText;
        navigator.clipboard.writeText(text).then(() => {
          const originalHTML = btn.innerHTML;
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="green" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span style="color: green;">Đã sao chép!</span>
          `;
          setTimeout(() => {
            btn.innerHTML = originalHTML;
          }, 1500);
        });
      });
    });
  }

  // Bind Contract Options Selection
  simOptBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      simOptBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadSimulationContract(btn.dataset.contractType);
    });
  });

  // Load rent contract initially
  if (contractDocPanel && actionCardsPanel) {
    loadSimulationContract("rent");
  }

  // 4. Financial & Business Calculator Logic
  const sliderVolume = document.getElementById("sliderVolume");
  const sliderPrice = document.getElementById("sliderPrice");
  const sliderConvert = document.getElementById("sliderConvert");

  const calcVolumeVal = document.getElementById("calcVolumeVal");
  const calcPriceVal = document.getElementById("calcPriceVal");
  const calcConvertVal = document.getElementById("calcConvertVal");

  const calcTotalRevenue = document.getElementById("calcTotalRevenue");
  const calcTotalCost = document.getElementById("calcTotalCost");
  const calcNetProfit = document.getElementById("calcNetProfit");
  const calcBreakEven = document.getElementById("calcBreakEven");

  function formatCurrencyVND(value) {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value).replace("₫", "đ");
  }

  function updateFinancialCalculator() {
    if (!sliderVolume || !sliderPrice || !sliderConvert) return;

    const volume = parseInt(sliderVolume.value, 10);
    const price = parseInt(sliderPrice.value, 10);
    const convertRate = parseFloat(sliderConvert.value) / 100;

    // Display values
    calcVolumeVal.textContent = volume.toLocaleString("vi-VN") + " lượt quét/tháng";
    calcPriceVal.textContent = price.toLocaleString("vi-VN") + " đ/lượt";
    calcConvertVal.textContent = (convertRate * 100).toFixed(1) + "% chuyển đổi VIP";

    // Business Logic formulas
    const scanAPI_CostPerScan = 4000; // Cost of OCR + PII + LLM tokens per scan
    const monthlyOperationalCost = 15000000; // Server, support, marketing (15 triệu/tháng)
    const vipSubscriptionMonthlyPrice = 149000; // VIP subscription fee

    // Revenue
    const premiumUsers = volume * convertRate;
    const basicUsersPayPerUse = volume * (1 - convertRate);
    
    const payPerUseRevenue = basicUsersPayPerUse * price;
    const subscriptionRevenue = premiumUsers * vipSubscriptionMonthlyPrice;
    const totalRevenue = payPerUseRevenue + subscriptionRevenue;

    // Cost
    const totalAPICost = volume * scanAPI_CostPerScan;
    const totalCost = totalAPICost + monthlyOperationalCost;

    // Net Profit
    const netProfit = totalRevenue - totalCost;

    // Break-even scan volume per month (Volume where Net Profit = 0)
    // operational_cost / (average_revenue_per_scan - api_cost_per_scan)
    const averageRevenuePerScan = ( (1 - convertRate) * price ) + ( convertRate * vipSubscriptionMonthlyPrice );
    const marginPerScan = averageRevenuePerScan - scanAPI_CostPerScan;
    let breakEvenVolume = 0;
    if (marginPerScan > 0) {
      breakEvenVolume = Math.ceil(monthlyOperationalCost / marginPerScan);
    }

    // Render outcomes
    calcTotalRevenue.textContent = formatCurrencyVND(totalRevenue);
    calcTotalCost.textContent = formatCurrencyVND(totalCost);
    
    if (netProfit >= 0) {
      calcNetProfit.textContent = "+" + formatCurrencyVND(netProfit);
      calcNetProfit.style.color = "var(--green)";
    } else {
      calcNetProfit.textContent = formatCurrencyVND(netProfit);
      calcNetProfit.style.color = "var(--red)";
    }

    if (marginPerScan > 0) {
      calcBreakEven.textContent = breakEvenVolume.toLocaleString("vi-VN") + " lượt quét/tháng";
    } else {
      calcBreakEven.textContent = "Không thể hòa vốn (Đơn giá thấp hơn phí API)";
    }
  }

  // Bind Slider Events
  if (sliderVolume) {
    sliderVolume.addEventListener("input", updateFinancialCalculator);
    sliderPrice.addEventListener("input", updateFinancialCalculator);
    sliderConvert.addEventListener("input", updateFinancialCalculator);

    // Initial run
    updateFinancialCalculator();
  }

  // 5. Interactive Roadmap Timeline Switcher
  const timelineSteps = document.querySelectorAll(".timeline-step-node");
  const timelineContentPane = document.getElementById("timelineContentPane");

  const timelineDatabase = {
    "1": {
      title: "Giai Đoạn 1: Phát Triển & Khảo Sát MVP (Tháng 7/2026)",
      bullets: [
        "Hoàn thiện MVP hỗ trợ OCR, PII Redaction và rà soát Hợp đồng thuê nhà.",
        "Tiến hành Mom Test thực tế với 20+ người cao tuổi và sinh viên thuê nhà.",
        "Thiết lập cơ sở dữ liệu luật dân sự Việt Nam và hệ thống 40+ bẫy hợp đồng lõi.",
        "Mục tiêu kỹ thuật: Độ chính xác OCR đạt trên 92%, che PII đạt 99%."
      ]
    },
    "2": {
      title: "Giai Đoạn 2: Thử Nghiệm Quy Mô Nhỏ (Tháng 8 - 10/2026)",
      bullets: [
        "Phát hành bản thử nghiệm nội bộ và mở rộng cho 200+ người dùng đăng ký sớm.",
        "Đo lường chỉ số giữ chân (Retention) và khảo sát độ hài lòng (CSAT > 80%).",
        "Tối ưu chi phí API xuống dưới 4.000đ/lượt quét nhờ cơ chế caching và tinh chỉnh prompt.",
        "Tích hợp thêm Hợp đồng lao động và Hợp đồng vay tiêu dùng cá nhân vào checklist."
      ]
    },
    "3": {
      title: "Giai Đoạn 3: Thương Mại Hóa B2C & Mở Rộng Hệ Sinh Thái (Tháng 11/2026 - 2/2027)",
      bullets: [
        "Mở cổng thanh toán pay-per-use và ra mắt gói VIP Premium tháng (149.000đ/tháng).",
        "Hợp tác với các hội sinh viên và các cộng đồng thuê nhà để phân phối mã ưu đãi.",
        "Phát triển chatbot hỏi đáp pháp lý chuyên sâu sau khi nhận báo cáo rủi ro.",
        "Đạt mốc 10.000 lượt quét hợp đồng lũy kế và 300+ thành viên đăng ký Premium."
      ]
    },
    "4": {
      title: "Giai Đoạn 4: Mở Rộng B2B & Chuyển Đổi Quy Mô (Từ Q2/2027)",
      bullets: [
        "Phát triển dashboard B2B dành cho văn phòng công chứng, đơn vị môi giới bất động sản.",
        "Cung cấp cổng API quét hợp đồng hàng loạt tích hợp vào hệ thống CRM doanh nghiệp.",
        "Mở rộng rà soát sang các loại hợp đồng kinh tế phức tạp và thỏa thuận bảo mật (NDA).",
        "Đặt mục tiêu đạt điểm hòa vốn toàn dự án và bắt đầu có lãi ròng sau 12 tháng vận hành."
      ]
    }
  };

  timelineSteps.forEach(step => {
    step.addEventListener("click", () => {
      // Remove active from all nodes
      timelineSteps.forEach(s => s.classList.remove("active"));
      // Add active to current
      step.classList.add("active");

      const idx = step.dataset.stepIndex;
      const data = timelineDatabase[idx];

      if (data && timelineContentPane) {
        timelineContentPane.innerHTML = `
          <h4>${data.title}</h4>
          <ul>
            ${data.bullets.map(b => `<li>${b}</li>`).join("")}
          </ul>
        `;
      }
    });
  });

  // Initial timeline content
  if (timelineSteps.length > 0 && timelineContentPane) {
    timelineSteps[0].click(); // Activate first phase
  }

  // 6. Section VIII - References Tab Switcher
  const refTabBtns = document.querySelectorAll(".ref-tab-btn");
  const refPanes = document.querySelectorAll(".ref-pane");

  refTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      refTabBtns.forEach(b => b.classList.remove("active"));
      refPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetTab = btn.dataset.refTab;
      const targetPane = document.getElementById(`ref-${targetTab}`);
      if (targetPane) {
        targetPane.classList.add("active");
      }
    });
  });

  // 7. Section VIII - Mom Test Accordion Toggle
  const accordionItems = document.querySelectorAll(".mom-accordion-item");

  accordionItems.forEach(item => {
    const header = item.querySelector(".mom-accordion-header");
    const content = item.querySelector(".mom-accordion-content");

    header.addEventListener("click", () => {
      const isActive = item.classList.contains("active");

      // Close all items
      accordionItems.forEach(i => {
        i.classList.remove("active");
        i.querySelector(".mom-accordion-content").style.maxHeight = null;
      });

      if (!isActive) {
        item.classList.add("active");
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });

  // 8. Section VIII - Survey Gallery Slideshow
  const galleryThumbs = document.querySelectorAll(".gallery-thumb-btn");
  const galleryMainImg = document.getElementById("galleryMainImg");
  const galleryCaption = document.getElementById("galleryCaption");
  const galleryPrev = document.getElementById("galleryPrev");
  const galleryNext = document.getElementById("galleryNext");

  let currentImgIndex = 0;

  function updateGallerySlide(index) {
    const thumb = galleryThumbs[index];
    if (!thumb) return;

    // Remove active from all thumbs
    galleryThumbs.forEach(t => t.classList.remove("active"));
    thumb.classList.add("active");

    // Update main image and caption
    const imgSrc = thumb.dataset.imgSrc;
    const imgAlt = thumb.dataset.imgAlt;

    galleryMainImg.setAttribute("src", imgSrc);
    galleryMainImg.setAttribute("alt", imgAlt);
    galleryCaption.textContent = imgAlt;

    currentImgIndex = index;
    
    // Smoothly scroll the active thumbnail into view
    thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  // Thumbnails click
  galleryThumbs.forEach((thumb, idx) => {
    thumb.addEventListener("click", () => {
      updateGallerySlide(idx);
    });
  });

  // Navigation Arrows
  if (galleryPrev && galleryNext) {
    galleryPrev.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering the lightbox zoom on main image
      let prevIdx = currentImgIndex - 1;
      if (prevIdx < 0) prevIdx = galleryThumbs.length - 1;
      updateGallerySlide(prevIdx);
    });

    galleryNext.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering the lightbox zoom on main image
      let nextIdx = currentImgIndex + 1;
      if (nextIdx >= galleryThumbs.length) nextIdx = 0;
      updateGallerySlide(nextIdx);
    });
  }

  // 9. Section IV - Prototype Showcase Sidebar Switcher
  const protoSteps = document.querySelectorAll(".proto-step-btn");
  const protoMainImg = document.getElementById("protoMainImg");
  const protoCaption = document.getElementById("protoCaption");

  protoSteps.forEach(btn => {
    btn.addEventListener("click", () => {
      protoSteps.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const imgSrc = btn.dataset.img;
      const caption = btn.dataset.caption;

      if (protoMainImg && protoCaption) {
        protoMainImg.setAttribute("src", imgSrc);
        protoMainImg.setAttribute("alt", caption);
        protoCaption.textContent = caption;
      }
    });
  });
});
