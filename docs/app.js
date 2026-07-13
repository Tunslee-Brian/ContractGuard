/**
 * app.js
 * Client-side script for ContractGuard AI Premium Static Web Report.
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

  // 2. Reading Progress Bar
  window.addEventListener("scroll", () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      const scrolled = (window.scrollY / docHeight) * 100;
      progressBar.style.width = `${scrolled}%`;
    }
  });

  // 3. ScrollSpy using IntersectionObserver
  const spyElements = [];
  sections.forEach(sec => {
    spyElements.push(sec);
    // Also spy on H2s for detailed TOC navigation
    const h2s = sec.querySelectorAll("h2");
    h2s.forEach(h2 => spyElements.push(h2));
  });

  const spyOptions = {
    root: null,
    rootMargin: "-20% 0px -60% 0px", // triggers when element is roughly in middle of viewport
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        
        // Remove active class from all TOC links
        tocContainer.querySelectorAll("li").forEach(li => {
          li.classList.remove("active");
        });

        // Find TOC item that matches this ID
        const activeLi = tocContainer.querySelector(`li[data-section-id="${id}"]`);
        if (activeLi) {
          activeLi.classList.add("active");
          
          // If it's a sub-item, make sure its parent main item is also styled or expanded if needed
          const parentMain = activeLi.closest(".toc-item-h1");
          if (parentMain && parentMain !== activeLi) {
            parentMain.classList.add("active");
          }
        }
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
      let captionText = img.alt || "Giao diện ContractGuard AI";
      
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
});
