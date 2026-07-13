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
  const images = reportContent.querySelectorAll("img");
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
});
