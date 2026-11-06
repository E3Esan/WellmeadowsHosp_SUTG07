const DASHBOARD_SLIDES = [
  {
    image: 'commerical_ai_pics/761291241_1093017636483498_4900345277200282031_n_1.png',
    title: 'Hospital Team',
    subtitle: 'Care staff in action'
  },
  {
    image: 'commerical_ai_pics/766072564_1073995725288291_5783160787099337244_n.png',
    title: 'Doctor Consultation',
    subtitle: 'Treatment and care'
  },
  {
    image: 'commerical_ai_pics/68810e9e-cab6-4609-ac9b-2db3746e8fae.png',
    title: 'Medical Care',
    subtitle: 'Hospital environment'
  },
  {
    image: 'commerical_ai_pics/9e347304-1f72-4f50-bbce-5e8c29e8ee8c.png',
    title: 'Clinical Setting',
    subtitle: 'Professional healthcare scene'
  },
  {
    image: 'commerical_ai_pics/2d5fff2f-2a36-4537-863b-eaeeaf404995.png',
    title: 'Ward Activity',
    subtitle: 'Patient support environment'
  },
  {
    image: 'commerical_ai_pics/3d484efa-65e8-42b1-a1cf-53d6f2d0969b.png',
    title: 'Care Coordination',
    subtitle: 'Modern healthcare service'
  },
  {
    image: 'commerical_ai_pics/86b09cec-3dc5-458b-8933-e0d80dd915dd.png',
    title: 'Clinical Team',
    subtitle: 'Health professionals at work'
  },
  {
    image: 'commerical_ai_pics/d7582806-dc03-44da-85fc-cf047ea02e3d.png',
    title: 'Recovery Room',
    subtitle: 'Patient-centered treatment'
  }
];

function renderDashboardSlideshow() {
  const host = document.getElementById('dashboardSlideshow');
  if (!host) return;

  if (window.dashboardSlideInterval) {
    clearInterval(window.dashboardSlideInterval);
  }

  host.innerHTML = `
    <div class="dashboardSlides">
      ${DASHBOARD_SLIDES.map((slide, index) => `
        <figure class="dashboardSlide ${index === 0 ? 'active' : ''}" data-index="${index}">
          <img src="${slide.image}" alt="${slide.title}">
          <figcaption class="dashboardSlideCaption">
            ${slide.title}
            <span>${slide.subtitle}</span>
          </figcaption>
        </figure>
      `).join('')}
    </div>
    <div class="dashboardSlideshowDots">
      ${DASHBOARD_SLIDES.map((slide, index) => `
        <button class="dashboardDot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Show slide ${index + 1}"></button>
      `).join('')}
    </div>
  `;

  const slides = host.querySelectorAll('.dashboardSlide');
  const dots = host.querySelectorAll('.dashboardDot');

  function showSlide(index) {
    slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  dots.forEach(dot => {
    dot.addEventListener('click', (event) => {
      event.stopPropagation();
      const index = Number(dot.dataset.index);
      showSlide(index);
      window.dashboardSlideIndex = index;
    });
  });

  slides.forEach((slide, index) => {
    slide.addEventListener('click', () => openDashboardImageModal(index));
  });

  let slideIndex = 0;
  window.dashboardSlideIndex = 0;
  window.dashboardSlideInterval = setInterval(() => {
    slideIndex = (slideIndex + 1) % DASHBOARD_SLIDES.length;
    window.dashboardSlideIndex = slideIndex;
    showSlide(slideIndex);
  }, 3500);
}

function openDashboardImageModal(index) {
  const modal = document.getElementById('dashboardImageModal');
  const img = DASHBOARD_SLIDES[index];
  if (!modal || !img) return;

  const modalImage = modal.querySelector('img');
  const title = modal.querySelector('.dashboardImageModalTitle');
  if (modalImage) modalImage.src = img.image;
  if (title) title.textContent = img.title;
  modal.classList.add('show');
}

function closeDashboardImageModal() {
  const modal = document.getElementById('dashboardImageModal');
  if (modal) modal.classList.remove('show');
}

const dashboardImageModal = document.getElementById('dashboardImageModal');
if (!dashboardImageModal) {
  const modal = document.createElement('div');
  modal.id = 'dashboardImageModal';
  modal.className = 'dashboardImageModal';
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="dashboardImageModalBox">
      <button class="dashboardImageModalClose" aria-label="Close image viewer" onclick="closeDashboardImageModal()">×</button>
      <img src="" alt="Expanded hospital image">
      <div class="dashboardImageModalTitle" style="margin-top:10px;font-weight:700;color:#1c364d;text-align:center;">Hospital image</div>
    </div>
  `;
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeDashboardImageModal();
  });
  document.body.appendChild(modal);
}

// ===== Footer team modal =====
function openFooterModal() {
  const modal = document.getElementById('footerModal');
  if (!modal) return;
  modal.classList.add('show');
}

function closeFooterModal() {
  const modal = document.getElementById('footerModal');
  if (!modal) return;
  modal.classList.remove('show');
}

const footerModal = document.createElement('div');
footerModal.id = 'footerModal';
footerModal.className = 'footerModal';
footerModal.setAttribute('aria-modal', 'true');
footerModal.innerHTML = `
  <div class="footerModalBox" style="position:relative;">
    <button class="footerModalClose" aria-label="Close team details" onclick="closeFooterModal()">×</button>
    <h3 class="footerModalTitle"><span class="brandLink">Birth But With Me</span></h3>
    <div class="footerModalTableWrap">
      <table>
        <tr>
          <th>NO.</th>
          <th>ID</th>
          <th>Name</th>
          <th>Nick Name</th>
          <th>Group Name</th>
        </tr>
        <tr><td>1</td><td>B6817794</td><td>นายเจษฎา ซาร์</td><td>ฟลุ๊ค</td><td>Birth But With Me</td></tr>
        <tr><td>2</td><td>B6818111</td><td>นายณัฐพงษ์ อุ่นเรือง</td><td>นมสด</td><td>Birth But With Me</td></tr>
        <tr><td>3</td><td>B6817510</td><td>นายปุญช์กนก เผ่นจันทึก</td><td>ปุญช์</td><td>Birth But With Me</td></tr>
        <tr><td>4</td><td>B6835484</td><td>นายปฏิพัทธิ์ ประสมพระ</td><td>ก้อง</td><td>Birth But With Me</td></tr>
        <tr><td>5</td><td>B6830939</td><td>นายวรากร  วิปัสสา</td><td>คงคา</td><td>Birth But With Me</td></tr>
      </table>
    </div>
    <p class="footerModalCredit">With contribution from Claude Sonnet and GitHub Copilot</p>
  </div>
`;
footerModal.addEventListener('click', (event) => {
  if (event.target === footerModal) closeFooterModal();
});
document.body.appendChild(footerModal);

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('.authFooter, .pageFooter, .brandLink');
  if (trigger && trigger.textContent.includes('Birth But With Me')) {
    openFooterModal();
  }
});

